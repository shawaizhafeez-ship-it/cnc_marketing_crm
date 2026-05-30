import type { SupabaseClient } from "@supabase/supabase-js";
import { renderTemplate } from "@/lib/email/template-renderer";
import {
  canSendMarketingEmail,
  incrementMarketingDailyCounter,
} from "@/lib/email/daily-limit";
import { logEmailSend } from "@/lib/email/log-email";
import { buildRecipientTemplateVariables } from "@/lib/marketing/build-recipient-variables";
import {
  getRetryBackoffMs,
  shouldSkipDueToOpsDone,
  type SendEmailFn,
} from "@/lib/email/send-renewal";
import { MARKETING_CC, sendEmail } from "@/lib/email/smtp";
import type { CertificateRow } from "@/lib/renewals/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const MARKETING_SEND_BATCH_SIZE = 10;
export const MARKETING_SEND_DELAY_MS = 2000;
export const APP_SETTINGS_MARKETING_CRON_KEY = "marketing_send_cron";

export type MarketingScheduledEmailRecord = {
  id: string;
  campaign_id: string;
  touchpoint_id: string;
  template_id: string;
  recipient_email: string;
  company_name: string;
  certificate_ids: string[];
  rendered_subject: string;
  rendered_html: string;
  scheduled_at: string;
  status: string;
  retry_count: number;
  max_retries: number;
  updated_at: string;
};

export type ProcessMarketingEmailResult = {
  outcome: "sent" | "skipped" | "failed" | "limit_reached";
  errorMessage?: string;
  messageId?: string;
};

export type MarketingCronStats = {
  status: "success" | "partial" | "failed";
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  limitReached: boolean;
  errors: string[];
  startedAt: string;
  finishedAt: string;
};

export type MarketingCronRunLog = MarketingCronStats & {
  last_run_at: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isEligibleForMarketingRetry(
  email: Pick<
    MarketingScheduledEmailRecord,
    "status" | "retry_count" | "max_retries" | "updated_at"
  >,
  now: Date = new Date()
): boolean {
  if (email.status !== "failed") {
    return false;
  }
  if (email.retry_count >= email.max_retries) {
    return false;
  }

  const nextAttemptAt =
    new Date(email.updated_at).getTime() + getRetryBackoffMs(email.retry_count);

  return now.getTime() >= nextAttemptAt;
}

export async function fetchDueMarketingScheduledEmails(
  supabase: SupabaseClient,
  limit: number,
  now: Date = new Date()
): Promise<MarketingScheduledEmailRecord[]> {
  const nowIso = now.toISOString();

  const { data: pendingRows, error: pendingError } = await supabase
    .from("marketing_scheduled_emails")
    .select(
      `
      id,
      campaign_id,
      touchpoint_id,
      template_id,
      recipient_email,
      company_name,
      certificate_ids,
      rendered_subject,
      rendered_html,
      scheduled_at,
      status,
      retry_count,
      max_retries,
      updated_at,
      marketing_campaigns!inner (
        status
      )
    `
    )
    .eq("marketing_campaigns.status", "active")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (pendingError) {
    throw new Error(
      `Failed to fetch pending marketing emails: ${pendingError.message}`
    );
  }

  const pending = (pendingRows ?? []) as MarketingScheduledEmailRecord[];
  const remaining = limit - pending.length;

  if (remaining <= 0) {
    return pending;
  }

  const { data: failedRows, error: failedError } = await supabase
    .from("marketing_scheduled_emails")
    .select(
      `
      id,
      campaign_id,
      touchpoint_id,
      template_id,
      recipient_email,
      company_name,
      certificate_ids,
      rendered_subject,
      rendered_html,
      scheduled_at,
      status,
      retry_count,
      max_retries,
      updated_at,
      marketing_campaigns!inner (
        status
      )
    `
    )
    .eq("marketing_campaigns.status", "active")
    .eq("status", "failed")
    .order("updated_at", { ascending: true })
    .limit(100);

  if (failedError) {
    throw new Error(
      `Failed to fetch failed marketing emails: ${failedError.message}`
    );
  }

  const retries = ((failedRows ?? []) as MarketingScheduledEmailRecord[])
    .filter((row) => isEligibleForMarketingRetry(row, now))
    .slice(0, remaining);

  return [...pending, ...retries].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );
}

async function incrementMarketingCampaignEmailsSent(
  supabase: SupabaseClient,
  campaignId: string
) {
  const { data: campaign, error: readError } = await supabase
    .from("marketing_campaigns")
    .select("emails_sent")
    .eq("id", campaignId)
    .single();

  if (readError) {
    throw new Error(`Failed to read marketing campaign: ${readError.message}`);
  }

  const { error: updateError } = await supabase
    .from("marketing_campaigns")
    .update({ emails_sent: (campaign.emails_sent ?? 0) + 1 })
    .eq("id", campaignId);

  if (updateError) {
    throw new Error(
      `Failed to update marketing campaign count: ${updateError.message}`
    );
  }
}

async function markMarketingSendFailed(
  supabase: SupabaseClient,
  email: MarketingScheduledEmailRecord,
  errorMessage: string,
  nowIso: string
) {
  await supabase
    .from("marketing_scheduled_emails")
    .update({
      status: "failed",
      error_message: errorMessage,
      retry_count: email.retry_count + 1,
      updated_at: nowIso,
    })
    .eq("id", email.id);
}

export async function processMarketingScheduledEmail(
  supabase: SupabaseClient,
  email: MarketingScheduledEmailRecord,
  options: {
    sendFn?: SendEmailFn;
    now?: Date;
    skipDailyLimitCheck?: boolean;
  } = {}
): Promise<ProcessMarketingEmailResult> {
  const sendFn = options.sendFn ?? sendEmail;
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  if (!options.skipDailyLimitCheck) {
    const allowed = await canSendMarketingEmail(supabase, now);
    if (!allowed) {
      return {
        outcome: "limit_reached",
        errorMessage:
          "Daily marketing email limit reached (100 emails/day). Email will be retried tomorrow.",
      };
    }
  }

  const [{ data: liveCerts, error: certError }, { data: template, error: templateError }] =
    await Promise.all([
      supabase
        .from("certificates")
        .select(
          "id, certificate_no, company_name, item, expiry_date, recipient_email, renewal_amount, ops_status, contact_person"
        )
        .in("id", email.certificate_ids),
      supabase
        .from("marketing_templates")
        .select("id, subject, html_content, is_active")
        .eq("id", email.template_id)
        .maybeSingle(),
    ]);

  if (certError) {
    const errorMessage = `Certificate lookup failed: ${certError.message}`;
    await markMarketingSendFailed(supabase, email, errorMessage, nowIso);
    await logEmailSend(supabase, {
      emailType: "marketing",
      recipientEmail: email.recipient_email,
      companyName: email.company_name,
      subject: email.rendered_subject,
      certificateCount: email.certificate_ids.length,
      status: "failed",
      errorMessage,
      campaignId: email.campaign_id,
      scheduledEmailId: email.id,
    });
    return { outcome: "failed", errorMessage };
  }

  const skipCheck = shouldSkipDueToOpsDone(
    (liveCerts ?? []).map((cert) => ({
      id: cert.id,
      ops_status: cert.ops_status,
    })),
    email.certificate_ids
  );

  if (skipCheck.skip) {
    const reason = skipCheck.reason ?? "Skipped";
    await supabase
      .from("marketing_scheduled_emails")
      .update({
        status: "skipped",
        error_message: reason,
        updated_at: nowIso,
      })
      .eq("id", email.id);

    await logEmailSend(supabase, {
      emailType: "marketing",
      recipientEmail: email.recipient_email,
      companyName: email.company_name,
      subject: email.rendered_subject,
      certificateCount: email.certificate_ids.length,
      status: "skipped",
      errorMessage: reason,
      campaignId: email.campaign_id,
      scheduledEmailId: email.id,
    });

    return { outcome: "skipped" };
  }

  if (templateError || !template || !template.is_active) {
    const errorMessage = templateError?.message ?? "Template not found or inactive";
    await markMarketingSendFailed(supabase, email, errorMessage, nowIso);
    await logEmailSend(supabase, {
      emailType: "marketing",
      recipientEmail: email.recipient_email,
      companyName: email.company_name,
      subject: email.rendered_subject,
      certificateCount: email.certificate_ids.length,
      status: "failed",
      errorMessage,
      campaignId: email.campaign_id,
      scheduledEmailId: email.id,
    });
    return { outcome: "failed", errorMessage };
  }

  const variables = buildRecipientTemplateVariables(
    (liveCerts ?? []) as CertificateRow[]
  );
  const rendered = renderTemplate(
    template.html_content,
    template.subject,
    variables
  );

  const sendResult = await sendFn({
    to: email.recipient_email,
    subject: rendered.subject,
    html: rendered.html,
    cc: MARKETING_CC,
    account: "marketing",
  });

  if (sendResult.success) {
    await supabase
      .from("marketing_scheduled_emails")
      .update({
        status: "sent",
        sent_at: nowIso,
        rendered_subject: rendered.subject,
        rendered_html: rendered.html,
        error_message: null,
        updated_at: nowIso,
      })
      .eq("id", email.id);

    await incrementMarketingCampaignEmailsSent(supabase, email.campaign_id);
    await incrementMarketingDailyCounter(supabase, now);

    await logEmailSend(supabase, {
      emailType: "marketing",
      recipientEmail: email.recipient_email,
      companyName: email.company_name,
      subject: rendered.subject,
      certificateCount: email.certificate_ids.length,
      status: "sent",
      smtpMessageId: sendResult.messageId,
      campaignId: email.campaign_id,
      scheduledEmailId: email.id,
    });

    return { outcome: "sent", messageId: sendResult.messageId };
  }

  await markMarketingSendFailed(supabase, email, sendResult.error, nowIso);

  await logEmailSend(supabase, {
    emailType: "marketing",
    recipientEmail: email.recipient_email,
    companyName: email.company_name,
    subject: rendered.subject,
    certificateCount: email.certificate_ids.length,
    status: "failed",
    errorMessage: sendResult.error,
    campaignId: email.campaign_id,
    scheduledEmailId: email.id,
  });

  return { outcome: "failed", errorMessage: sendResult.error };
}

export async function saveMarketingCronRunLog(
  supabase: SupabaseClient,
  stats: MarketingCronStats
) {
  const payload: MarketingCronRunLog = {
    ...stats,
    last_run_at: stats.finishedAt,
  };

  await supabase.from("app_settings").upsert({
    key: APP_SETTINGS_MARKETING_CRON_KEY,
    value: payload,
    updated_at: new Date().toISOString(),
  });
}

export async function getMarketingCronRunLog(
  supabase: SupabaseClient
): Promise<MarketingCronRunLog | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", APP_SETTINGS_MARKETING_CRON_KEY)
    .maybeSingle();

  return (data?.value as MarketingCronRunLog | null) ?? null;
}

export async function runMarketingSendCron(options?: {
  batchSize?: number;
  delayMs?: number;
  now?: Date;
  supabase?: SupabaseClient;
}): Promise<MarketingCronStats> {
  const supabase = options?.supabase ?? createAdminClient();
  const batchSize = options?.batchSize ?? MARKETING_SEND_BATCH_SIZE;
  const delayMs = options?.delayMs ?? MARKETING_SEND_DELAY_MS;
  const now = options?.now ?? new Date();
  const startedAt = now.toISOString();

  const emails = await fetchDueMarketingScheduledEmails(
    supabase,
    batchSize,
    now
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let limitReached = false;
  const errors: string[] = [];
  let processed = 0;

  for (let index = 0; index < emails.length; index++) {
    const email = emails[index];

    if (!(await canSendMarketingEmail(supabase, now))) {
      limitReached = true;
      break;
    }

    processed += 1;

    try {
      const result = await processMarketingScheduledEmail(supabase, email, {
        now,
      });

      if (result.outcome === "sent") {
        sent += 1;
      } else if (result.outcome === "skipped") {
        skipped += 1;
      } else if (result.outcome === "limit_reached") {
        limitReached = true;
        break;
      } else {
        failed += 1;
        if (result.errorMessage) {
          errors.push(`${email.recipient_email}: ${result.errorMessage}`);
        }
      }
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : "Unexpected processing error";
      errors.push(`${email.recipient_email}: ${message}`);
    }

    if (limitReached) {
      break;
    }

    if (index < emails.length - 1) {
      await sleep(delayMs);
    }
  }

  const finishedAt = new Date().toISOString();

  const stats: MarketingCronStats = {
    status:
      failed > 0 && sent + skipped === 0
        ? "failed"
        : failed > 0 || limitReached
          ? "partial"
          : "success",
    processed,
    sent,
    skipped,
    failed,
    limitReached,
    errors,
    startedAt,
    finishedAt,
  };

  await saveMarketingCronRunLog(supabase, stats);

  return stats;
}
