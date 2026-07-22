"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildScheduledEmails,
  countRecipientsMissingPhone,
  DEFAULT_SEND_HOUR_UTC,
  getAnchorDateString,
  getTouchpointPreviews,
  summarizeScheduledEmails,
  type DeliveryChannel,
} from "@/lib/scheduling/renewal-schedule";
import {
  filterActiveCertificates,
  filterCertificatesByExpiryMonth,
  getAvailableMonthsYears,
} from "@/lib/renewals/prepare-email-data";
import type {
  EmailLogRow,
  RenewalCampaignStats,
  ScheduledEmailRow,
} from "@/lib/renewals/campaign-types";
import type { CertificateRow } from "@/lib/renewals/types";
import { createClient } from "@/lib/supabase/server";

export type CampaignActionState = {
  error?: string;
  success?: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return { supabase, userId: user.id };
}

async function fetchActiveCertificates(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CertificateRow[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select(
      "id, certificate_no, company_name, item, expiry_date, recipient_email, renewal_amount, ops_status, contact_person, phone"
    )
    .order("expiry_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to load certificates: ${error.message}`);
  }

  return filterActiveCertificates((data ?? []) as CertificateRow[]);
}

async function getSendHourUtc(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "renewal_touchpoints")
    .maybeSingle();

  const sendHour = (data?.value as { send_hour?: number } | null)?.send_hour;
  return typeof sendHour === "number" ? sendHour : DEFAULT_SEND_HOUR_UTC;
}

function validateMonthYear(month: number, year: number) {
  if (month < 1 || month > 12) throw new Error("Invalid month.");
  if (year < 2020 || year > 2100) throw new Error("Invalid year.");
}

export type CampaignChannelOption = "email" | "whatsapp" | "both";

/** Map the campaign form's channel choice to the schedule builder's channel list. */
function parseChannels(value: string): DeliveryChannel[] {
  if (value === "whatsapp") return ["whatsapp"];
  if (value === "both") return ["email", "whatsapp"];
  return ["email"];
}

function filterCampaignCertificates(
  certificates: CertificateRow[],
  month: number,
  year: number
) {
  return filterCertificatesByExpiryMonth(
    filterActiveCertificates(certificates),
    month,
    year
  );
}

export async function getRenewalCampaignPreview(
  month: number,
  year: number,
  channel: CampaignChannelOption = "email"
) {
  validateMonthYear(month, year);
  const { supabase } = await requireUser();
  const sendHourUtc = await getSendHourUtc(supabase);
  const certificates = await fetchActiveCertificates(supabase);
  const filtered = filterCampaignCertificates(certificates, month, year);
  const options = getAvailableMonthsYears(certificates);
  const channels = parseChannels(channel);

  const touchpoints = getTouchpointPreviews(year, month, sendHourUtc);
  const draftScheduled = buildScheduledEmails(
    filtered,
    "preview",
    year,
    month,
    { sendHourUtc, channels }
  );
  const summary = summarizeScheduledEmails(filtered, draftScheduled);
  const recipientsMissingPhone = channels.includes("whatsapp")
    ? countRecipientsMissingPhone(filtered)
    : 0;

  return {
    month,
    year,
    channel,
    anchorDate: getAnchorDateString(year, month),
    touchpoints,
    sendHourUtc,
    certificates: filtered,
    summary,
    recipientsMissingPhone,
    options,
  };
}

export async function createRenewalCampaign(
  _prev: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const month = Number.parseInt(String(formData.get("month")), 10);
  const year = Number.parseInt(String(formData.get("year")), 10);
  const channels = parseChannels(String(formData.get("channel") ?? "email"));

  if (!name) {
    return { error: "Campaign name is required." };
  }

  try {
    validateMonthYear(month, year);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid date." };
  }

  const { supabase, userId } = await requireUser();
  const sendHourUtc = await getSendHourUtc(supabase);
  const certificates = await fetchActiveCertificates(supabase);
  const filtered = filterCampaignCertificates(certificates, month, year);

  if (filtered.length === 0) {
    return {
      error: `No active certificates expiring in ${month}/${year}.`,
    };
  }

  const campaignId = crypto.randomUUID();
  const scheduledEmails = buildScheduledEmails(
    filtered,
    campaignId,
    year,
    month,
    { sendHourUtc, channels }
  );

  if (scheduledEmails.length === 0) {
    return {
      error:
        "All touchpoint dates for this month are in the past. No messages to schedule.",
    };
  }

  const summary = summarizeScheduledEmails(filtered, scheduledEmails);
  const anchorDate = getAnchorDateString(year, month);
  const now = new Date().toISOString();

  const { error: campaignError } = await supabase.from("renewal_campaigns").insert({
    id: campaignId,
    name,
    description: description || null,
    target_month: month,
    target_year: year,
    status: "active",
    anchor_date: anchorDate,
    total_certificates: summary.totalCertificates,
    total_recipients: summary.totalRecipients,
    total_emails_scheduled: summary.totalEmailsScheduled,
    emails_sent: 0,
    created_by: userId,
    started_at: now,
  });

  if (campaignError) {
    if (campaignError.code === "23505") {
      return {
        error:
          "An active or draft campaign already exists for this expiry month.",
      };
    }
    return { error: campaignError.message };
  }

  const { error: scheduleError } = await supabase
    .from("scheduled_emails")
    .insert(scheduledEmails);

  if (scheduleError) {
    await supabase.from("renewal_campaigns").delete().eq("id", campaignId);
    return { error: scheduleError.message };
  }

  revalidatePath("/renewals/campaigns");
  redirect(`/renewals/campaigns/${campaignId}`);
}

export async function listRenewalCampaigns(options?: {
  status?: string | null;
  sort?: "asc" | "desc";
}): Promise<RenewalCampaignStats[]> {
  const { supabase } = await requireUser();
  const sortAsc = options?.sort === "asc";

  let query = supabase.from("v_renewal_campaign_stats").select("*");

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query.order("created_at", {
    ascending: sortAsc,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RenewalCampaignStats[];
}

export async function getRenewalCampaignLogs(
  campaignId: string
): Promise<EmailLogRow[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sent_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EmailLogRow[];
}

export async function getRenewalCampaignDetail(campaignId: string) {
  const { supabase } = await requireUser();

  const { data: campaign, error: campaignError } = await supabase
    .from("renewal_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error("Campaign not found.");
  }

  const { data: scheduledEmails, error: emailsError } = await supabase
    .from("scheduled_emails")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("scheduled_at", { ascending: true });

  if (emailsError) {
    throw new Error(emailsError.message);
  }

  const touchpoints = getTouchpointPreviews(
    campaign.target_year,
    campaign.target_month
  );

  const logs = await getRenewalCampaignLogs(campaignId);

  return {
    campaign,
    scheduledEmails: (scheduledEmails ?? []) as ScheduledEmailRow[],
    touchpoints,
    logs,
  };
}

async function updateCampaignStatus(
  campaignId: string,
  status: "active" | "paused" | "cancelled"
) {
  const { supabase } = await requireUser();

  const updates: Record<string, unknown> = { status };
  if (status === "cancelled") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("renewal_campaigns")
    .update(updates)
    .eq("id", campaignId);

  if (error) {
    throw new Error(error.message);
  }

  if (status === "cancelled") {
    await supabase
      .from("scheduled_emails")
      .update({ status: "cancelled" })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");
  }

  revalidatePath("/renewals/campaigns");
  revalidatePath(`/renewals/campaigns/${campaignId}`);
}

export async function pauseRenewalCampaign(campaignId: string) {
  await updateCampaignStatus(campaignId, "paused");
}

export async function resumeRenewalCampaign(campaignId: string) {
  await updateCampaignStatus(campaignId, "active");
}

export async function cancelRenewalCampaign(campaignId: string) {
  await updateCampaignStatus(campaignId, "cancelled");
}
