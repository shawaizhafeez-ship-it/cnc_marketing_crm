"use server";

import { revalidatePath } from "next/cache";
import { getMaskedSmtpConfigs } from "@/lib/email/smtp-display";
import {
  getRenewalCronRunLog,
  runRenewalSendCron,
  type RenewalCronStats,
} from "@/lib/email/send-renewal";
import { getMarketingCronRunLog } from "@/lib/email/send-marketing";
import type {
  GoogleSheetSettings,
  RenewalTouchpointSettings,
  SettingsPageData,
} from "@/lib/settings/types";
import { syncCertificatesFromSheet, getLatestSyncLog } from "@/lib/sheets/sync";
import { getSheetConfig } from "@/lib/sheets/google-client";
import type { SyncStats } from "@/lib/sheets/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveUserProfile } from "@/lib/auth/profile";

export type SyncActionState = {
  error?: string;
  stats?: SyncStats;
};

export type RenewalSendActionState = {
  error?: string;
  stats?: RenewalCronStats;
};

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("You must be signed in to sync sheets.");
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

  return { user, profile, supabase };
}

async function requireAdminUser() {
  const { user, profile } = await requireAuthenticatedUser();

  if (profile.role !== "admin") {
    throw new Error("Admin access required.");
  }

  return user;
}

async function fetchAppSettings(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["renewal_touchpoints", "google_sheet"]);

  const map = new Map(
    (data ?? []).map((row) => [row.key, row.value as Record<string, unknown>])
  );

  const touchpointRaw = map.get("renewal_touchpoints");
  const touchpoints: RenewalTouchpointSettings | null = touchpointRaw
    ? {
        offsets: Array.isArray(touchpointRaw.offsets)
          ? (touchpointRaw.offsets as number[])
          : [],
        send_hour:
          typeof touchpointRaw.send_hour === "number"
            ? touchpointRaw.send_hour
            : 9,
        description:
          typeof touchpointRaw.description === "string"
            ? touchpointRaw.description
            : "",
      }
    : null;

  const sheetRaw = map.get("google_sheet");
  let googleSheet: GoogleSheetSettings | null = null;

  if (sheetRaw) {
    googleSheet = {
      spreadsheet:
        typeof sheetRaw.spreadsheet === "string"
          ? sheetRaw.spreadsheet
          : "Renewals",
      worksheet:
        typeof sheetRaw.worksheet === "string"
          ? sheetRaw.worksheet
          : "List Cleaned",
      spreadsheetId: process.env.GOOGLE_SHEET_ID?.trim() ?? null,
    };
  }

  return { touchpoints, googleSheet };
}

export async function triggerSheetSync(): Promise<SyncActionState> {
  try {
    await requireAuthenticatedUser();
    const admin = createAdminClient();
    const stats = await syncCertificatesFromSheet(admin);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/renewals");

    if (stats.status === "failed") {
      return {
        error: stats.errors.join("; ") || "Sync failed",
        stats,
      };
    }

    return { stats };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

export async function getSheetSyncStatus() {
  await requireAuthenticatedUser();

  const admin = createAdminClient();
  const latestLog = await getLatestSyncLog(admin);

  let sheetConfig = null;
  try {
    sheetConfig = getSheetConfig();
  } catch {
    // Config not fully set — settings page shows placeholders
  }

  return { latestLog, sheetConfig };
}

export async function triggerRenewalSend(): Promise<RenewalSendActionState> {
  try {
    await requireAdminUser();
    const stats = await runRenewalSendCron();
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/renewals/campaigns");
    revalidatePath("/logs");

    if (stats.status === "failed") {
      return {
        error: stats.errors.join("; ") || "Renewal send run failed",
        stats,
      };
    }

    return { stats };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Renewal send failed",
    };
  }
}

export async function getSettingsPageData(): Promise<SettingsPageData> {
  const { profile, supabase } = await requireAuthenticatedUser();
  const admin = createAdminClient();

  const [latestLog, renewalSendLog, marketingSendLog, appSettings] =
    await Promise.all([
      getLatestSyncLog(admin),
      getRenewalCronRunLog(admin),
      getMarketingCronRunLog(admin),
      fetchAppSettings(supabase),
    ]);

  let sheetConfig = null;
  try {
    sheetConfig = getSheetConfig();
  } catch {
    // Config not fully set — settings page shows placeholders
  }

  const googleSheet =
    appSettings.googleSheet ??
    (sheetConfig
      ? {
          spreadsheet: sheetConfig.spreadsheetName,
          worksheet: sheetConfig.worksheetName,
          spreadsheetId: sheetConfig.spreadsheetId,
        }
      : null);

  return {
    smtp: getMaskedSmtpConfigs(),
    googleSheet,
    touchpoints: appSettings.touchpoints,
    sheetConfig,
    latestLog,
    renewalSendLog,
    marketingSendLog,
    isAdmin: profile.role === "admin",
  };
}
