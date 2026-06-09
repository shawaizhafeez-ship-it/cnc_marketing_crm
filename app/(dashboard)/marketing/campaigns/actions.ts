"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  filterCertificatesForMarketing,
  getUniqueCompanies,
  getUniqueItems,
  hasActiveMarketingFilter,
  summarizeFilteredCertificates,
} from "@/lib/marketing/filter-certificates";
import type {
  CampaignType,
  CreateMarketingCampaignInput,
  MarketingCampaignRow,
  MarketingCampaignStats,
  MarketingScheduledEmailRow,
  MarketingTouchpointRow,
  TouchpointConfigInput,
} from "@/lib/marketing/campaign-types";
import type { MarketingFilters } from "@/lib/marketing/filter-certificates";
import {
  buildMarketingScheduledEmails,
  calculateDelayDays,
  resolveCampaignStart,
  summarizeMarketingSchedule,
} from "@/lib/scheduling/marketing-schedule";
import type { CertificateRow } from "@/lib/renewals/types";
import { createClient } from "@/lib/supabase/server";

export type MarketingCampaignActionState = {
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

async function fetchAllCertificates(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CertificateRow[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select(
      "id, certificate_no, company_name, item, expiry_date, recipient_email, renewal_amount, ops_status, contact_person"
    )
    .order("company_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CertificateRow[];
}

function validateTouchpoints(touchpoints: TouchpointConfigInput[]) {
  if (touchpoints.length < 1 || touchpoints.length > 10) {
    throw new Error("Campaign must have between 1 and 10 touchpoints.");
  }

  const numbers = touchpoints.map((tp) => tp.touchpoint_number);
  const unique = new Set(numbers);
  if (unique.size !== numbers.length) {
    throw new Error("Touchpoint numbers must be unique.");
  }

  for (const touchpoint of touchpoints) {
    if (!touchpoint.template_id) {
      throw new Error(`Touchpoint ${touchpoint.touchpoint_number} needs a template.`);
    }
    if (
      touchpoint.schedule_type === "custom_days" &&
      touchpoint.schedule_value < 1
    ) {
      throw new Error(
        `Touchpoint ${touchpoint.touchpoint_number} custom interval must be at least 1 day.`
      );
    }
  }
}

export async function getMarketingFilterOptions() {
  const { supabase } = await requireUser();
  const certificates = await fetchAllCertificates(supabase);

  return {
    items: getUniqueItems(certificates),
    companies: getUniqueCompanies(certificates),
  };
}

export async function previewMarketingFilters(filters: MarketingFilters) {
  const { supabase } = await requireUser();

  if (!hasActiveMarketingFilter(filters)) {
    return {
      error: "Select at least one ITEM or company filter.",
      certificates: [] as CertificateRow[],
      summary: summarizeFilteredCertificates([]),
    };
  }

  const certificates = await fetchAllCertificates(supabase);
  const filtered = filterCertificatesForMarketing(certificates, filters);

  return {
    certificates: filtered,
    summary: summarizeFilteredCertificates(filtered),
  };
}

export async function getMarketingTemplatesForCampaign() {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("marketing_templates")
    .select("id, name, category, subject, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createMarketingCampaign(
  input: CreateMarketingCampaignInput
) {
  if (!input.name.trim()) {
    return { error: "Campaign name is required." };
  }

  if (!hasActiveMarketingFilter(input.filters)) {
    return { error: "Select at least one ITEM or company filter." };
  }

  try {
    validateTouchpoints(input.touchpoints);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid touchpoints.",
    };
  }

  const { supabase, userId } = await requireUser();
  const certificates = await fetchAllCertificates(supabase);
  const filtered = filterCertificatesForMarketing(certificates, input.filters);

  if (filtered.length === 0) {
    return { error: "No certificates match the selected filters." };
  }

  const templateIds = Array.from(
    new Set(input.touchpoints.map((tp) => tp.template_id))
  );
  const { data: templates, error: templateError } = await supabase
    .from("marketing_templates")
    .select("id, subject, html_content")
    .in("id", templateIds)
    .eq("is_active", true);

  if (templateError) {
    return { error: templateError.message };
  }

  if ((templates ?? []).length !== templateIds.length) {
    return { error: "One or more selected templates are missing or inactive." };
  }

  const templateMap = new Map(
    (templates ?? []).map((template) => [template.id, template])
  );
  const startResult = resolveCampaignStart({
    startMode: input.start_mode,
    scheduledStartAt: input.scheduled_start_at,
  });

  if (!startResult.ok) {
    return { error: startResult.error };
  }

  const summary = summarizeMarketingSchedule(
    filtered,
    input.touchpoints.length
  );
  const campaignId = crypto.randomUUID();
  const campaignStart = startResult.start;
  const startedAt = campaignStart.toISOString();

  const { error: campaignError } = await supabase
    .from("marketing_campaigns")
    .insert({
      id: campaignId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      campaign_type: input.campaign_type,
      status: "active",
      filters_applied: input.filters,
      total_certificates: summary.totalCertificates,
      total_recipients: summary.totalRecipients,
      total_emails: summary.totalEmailsScheduled,
      emails_sent: 0,
      created_by: userId,
      started_at: startedAt,
    });

  if (campaignError) {
    return { error: campaignError.message };
  }

  const touchpointRows = input.touchpoints.map((touchpoint) => ({
    id: crypto.randomUUID(),
    campaign_id: campaignId,
    touchpoint_number: touchpoint.touchpoint_number,
    template_id: touchpoint.template_id,
    schedule_type: touchpoint.schedule_type,
    schedule_value: touchpoint.schedule_value,
    delay_days: calculateDelayDays(
      touchpoint.schedule_type,
      touchpoint.schedule_value,
      touchpoint.touchpoint_number
    ),
    is_active: true,
  }));

  const { error: touchpointError } = await supabase
    .from("marketing_touchpoints")
    .insert(touchpointRows);

  if (touchpointError) {
    await supabase.from("marketing_campaigns").delete().eq("id", campaignId);
    return { error: touchpointError.message };
  }

  const scheduledEmails = buildMarketingScheduledEmails(
    filtered,
    campaignId,
    touchpointRows,
    templateMap,
    campaignStart
  );

  const { error: scheduleError } = await supabase
    .from("marketing_scheduled_emails")
    .insert(scheduledEmails);

  if (scheduleError) {
    await supabase.from("marketing_campaigns").delete().eq("id", campaignId);
    return { error: scheduleError.message };
  }

  revalidatePath("/marketing/campaigns");
  redirect(`/marketing/campaigns/${campaignId}`);
}

export async function listMarketingCampaigns(options?: {
  status?: string | null;
  sort?: "asc" | "desc";
}): Promise<MarketingCampaignStats[]> {
  const { supabase } = await requireUser();
  const sortAsc = options?.sort === "asc";

  let query = supabase.from("v_marketing_campaign_stats").select("*");

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query.order("created_at", {
    ascending: sortAsc,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MarketingCampaignStats[];
}

export async function getMarketingCampaignDetail(campaignId: string) {
  const { supabase } = await requireUser();

  const { data: campaign, error: campaignError } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error("Campaign not found.");
  }

  const [{ data: touchpoints }, { data: scheduledEmails }] = await Promise.all([
    supabase
      .from("marketing_touchpoints")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("touchpoint_number", { ascending: true }),
    supabase
      .from("marketing_scheduled_emails")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("scheduled_at", { ascending: true }),
  ]);

  return {
    campaign: campaign as MarketingCampaignRow,
    touchpoints: (touchpoints ?? []) as MarketingTouchpointRow[],
    scheduledEmails: (scheduledEmails ?? []) as MarketingScheduledEmailRow[],
  };
}

async function updateMarketingCampaignStatus(
  campaignId: string,
  status: "active" | "paused" | "cancelled"
) {
  const { supabase } = await requireUser();

  const updates: Record<string, unknown> = { status };
  if (status === "cancelled") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("marketing_campaigns")
    .update(updates)
    .eq("id", campaignId);

  if (error) {
    throw new Error(error.message);
  }

  if (status === "cancelled") {
    await supabase
      .from("marketing_scheduled_emails")
      .update({ status: "cancelled" })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");
  }

  revalidatePath("/marketing/campaigns");
  revalidatePath(`/marketing/campaigns/${campaignId}`);
}

export async function pauseMarketingCampaign(campaignId: string) {
  await updateMarketingCampaignStatus(campaignId, "paused");
}

export async function resumeMarketingCampaign(campaignId: string) {
  await updateMarketingCampaignStatus(campaignId, "active");
}

export async function cancelMarketingCampaign(campaignId: string) {
  await updateMarketingCampaignStatus(campaignId, "cancelled");
}

export async function deleteMarketingCampaign(
  campaignId: string
): Promise<MarketingCampaignActionState> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("marketing_campaigns")
    .delete()
    .eq("id", campaignId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/marketing/campaigns");
  return { success: "Campaign deleted." };
}

export type { CampaignType, CreateMarketingCampaignInput, MarketingFilters };
