"use server";

import { revalidatePath } from "next/cache";
import { readMarketingDailyStatus } from "@/lib/email/daily-limit";
import {
  getMarketingCronRunLog,
  runMarketingSendCron,
  type MarketingCronStats,
} from "@/lib/email/send-marketing";
import type { EmailLogEntry } from "@/lib/email/email-log-types";
import type { DashboardData, DashboardStats } from "@/lib/dashboard/types";
import { listMarketingCampaigns } from "@/app/(dashboard)/marketing/campaigns/actions";
import { listRenewalCampaigns } from "@/app/(dashboard)/renewals/campaigns/actions";
import { getLatestSyncLog } from "@/lib/sheets/sync";
import { createClient } from "@/lib/supabase/server";
import { resolveUserProfile } from "@/lib/auth/profile";

export type MarketingSendActionState = {
  error?: string;
  stats?: MarketingCronStats;
};

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("You must be signed in.");
  }

  const profile = await resolveUserProfile(user, { autoCreate: true });

  if (!profile) {
    throw new Error(
      "No profile found for your account. Complete account setup on the dashboard first."
    );
  }

  if (!profile.is_active) {
    throw new Error("Your account is not active.");
  }

  return { supabase, profile };
}

async function requireAdminUser() {
  const { profile } = await requireAuthenticatedUser();

  if (profile.role !== "admin") {
    throw new Error("Admin access required.");
  }

  return profile;
}

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const monthStr = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${year}-${monthStr}-01`,
    end: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

async function fetchDashboardStats(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DashboardStats> {
  const { start, end } = getCurrentMonthRange();

  const [
    { count: activeCertificates },
    { count: expiringThisMonth },
    renewalCampaigns,
    marketingCampaigns,
  ] = await Promise.all([
    supabase
      .from("v_certificates_active")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("v_certificates_active")
      .select("*", { count: "exact", head: true })
      .gte("expiry_date", start)
      .lte("expiry_date", end),
    listRenewalCampaigns({ status: "active", sort: "desc" }),
    listMarketingCampaigns({ status: "active", sort: "desc" }),
  ]);

  const pendingRenewalEmails = renewalCampaigns.reduce(
    (sum, campaign) => sum + (campaign.pending_count ?? 0),
    0
  );
  const pendingMarketingEmails = marketingCampaigns.reduce(
    (sum, campaign) => sum + (campaign.pending_count ?? 0),
    0
  );

  return {
    activeCertificates: activeCertificates ?? 0,
    expiringThisMonth: expiringThisMonth ?? 0,
    pendingRenewalEmails,
    pendingMarketingEmails,
  };
}

async function fetchRecentEmailLogs(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<EmailLogEntry[]> {
  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((log) => ({
    ...log,
    campaign_name: null,
  })) as EmailLogEntry[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const { supabase, profile } = await requireAuthenticatedUser();

  const [
    stats,
    recentLogs,
    marketingDaily,
    marketingSendLog,
    syncLog,
    renewalCampaigns,
    marketingCampaigns,
  ] = await Promise.all([
    fetchDashboardStats(supabase),
    fetchRecentEmailLogs(supabase),
    readMarketingDailyStatus(supabase),
    getMarketingCronRunLog(supabase),
    getLatestSyncLog(supabase),
    listRenewalCampaigns({ status: "active", sort: "desc" }),
    listMarketingCampaigns({ status: "active", sort: "desc" }),
  ]);

  return {
    stats,
    renewalCampaigns,
    marketingCampaigns,
    recentLogs,
    marketingDaily,
    marketingSendLog,
    syncLog,
    isAdmin: profile.role === "admin",
  };
}

export async function triggerMarketingSend(): Promise<MarketingSendActionState> {
  try {
    await requireAdminUser();
    const stats = await runMarketingSendCron();
    revalidatePath("/dashboard");
    revalidatePath("/marketing/campaigns");
    revalidatePath("/settings");
    revalidatePath("/logs");

    if (stats.status === "failed") {
      return {
        error: stats.errors.join("; ") || "Marketing send run failed",
        stats,
      };
    }

    return { stats };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Marketing send failed",
    };
  }
}
