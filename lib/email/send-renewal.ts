import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateRenewalEmailHtml,
  type RenewalEmailType,
} from "@/lib/email/renewal-template";
import { logEmailSend } from "@/lib/email/log-email";
import { RENEWAL_CC, sendEmail } from "@/lib/email/smtp";
import type { CertificateSnapshot } from "@/lib/scheduling/renewal-schedule";
import type { TemplateCertificate } from "@/lib/renewals/types";
import { syncCertificatesFromSheet } from "@/lib/sheets/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const RENEWAL_SEND_BATCH_SIZE = 20;
export const RENEWAL_SEND_DELAY_MS = 2000;
export const RETRY_BACKOFF_BASE_MS = 60_000;
export const APP_SETTINGS_CRON_KEY = "renewal_send_cron";

export type ScheduledEmailRecord = {
  id: string;
  campaign_id: string;
  touchpoint_number: number;
  recipient_email: string;
  company_name: string;
  certificate_ids: string[];
  certificate_snapshot: CertificateSnapshot[];
  subject: string;
  scheduled_at: string;
  status: string;
  retry_count: number;
  max_retries: number;
  updated_at: string;
};

export type ProcessRenewalEmailResult = {
  outcome: "sent" | "skipped" | "failed";
  errorMessage?: string;
  messageId?: string;
};

export type RenewalCronStats = {
  status: "success" | "partial" | "failed";
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
  startedAt: string;
  finishedAt: string;
};

export type RenewalCronRunLog = RenewalCronStats & {
  last_run_at: string;
};

export type SendEmailFn = typeof sendEmail;

export function isOpsDone(opsStatus: string): boolean {
  return opsStatus.trim().toLowerCase() === "done";
}

export function shouldSkipDueToOpsDone(
  liveCerts: Array<{ id: string; ops_status: string }>,
  certificateIds: string[]
): { skip: boolean; reason?: string } {
  if (certificateIds.length === 0) {
    return { skip: true, reason: "No certificates linked to scheduled email" };
  }

  const certById = new Map(liveCerts.map((cert) => [cert.id, cert]));

  for (const id of certificateIds) {
    const cert = certById.get(id);
    if (!cert) {
      return { skip: true, reason: `Certificate ${id} no longer exists` };
    }
    if (isOpsDone(cert.ops_status)) {
      return {
        skip: true,
        reason: "One or more certificates marked done in ops",
      };
    }
  }

  return { skip: false };
}

export function getRetryBackoffMs(
  retryCount: number,
  baseMs: number = RETRY_BACKOFF_BASE_MS
): number {
  return baseMs * 2 ** retryCount;
}

export function isEligibleForRetry(
  email: Pick<
    ScheduledEmailRecord,
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
    new Date(email.updated_at).getTime() +
    getRetryBackoffMs(email.retry_count);

  return now.getTime() >= nextAttemptAt;
}

export function touchpointToEmailType(
  touchpointNumber: number
): RenewalEmailType {
  if (touchpointNumber === 1) {
    return "15_days_before";
  }
  if (touchpointNumber === 2) {
    return "30_days_before";
  }
  return "2_weeks_after";
}

export function snapshotsToTemplateCertificates(
  snapshots: CertificateSnapshot[]
): TemplateCertificate[] {
  return snapshots.map((snapshot) => ({
    certificateNo: snapshot.certificate_no,
    item: snapshot.item ?? "",
    expiry: snapshot.expiry_display,
    companyName: snapshot.company_name,
    renewalAmount:
      snapshot.renewal_amount != null
        ? String(snapshot.renewal_amount)
        : "0",
  }));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchDueScheduledEmails(
  supabase: SupabaseClient,
  limit: number,
  now: Date = new Date()
): Promise<ScheduledEmailRecord[]> {
  const nowIso = now.toISOString();

  const { data: pendingRows, error: pendingError } = await supabase
    .from("scheduled_emails")
    .select(
      `
      id,
      campaign_id,
      touchpoint_number,
      recipient_email,
      company_name,
      certificate_ids,
      certificate_snapshot,
      subject,
      scheduled_at,
      status,
      retry_count,
      max_retries,
      updated_at,
      renewal_campaigns!inner (
        status
      )
    `
    )
    .eq("renewal_campaigns.status", "active")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (pendingError) {
    throw new Error(`Failed to fetch pending emails: ${pendingError.message}`);
  }

  const pending = (pendingRows ?? []) as ScheduledEmailRecord[];
  const remaining = limit - pending.length;

  if (remaining <= 0) {
    return pending;
  }

  const { data: failedRows, error: failedError } = await supabase
    .from("scheduled_emails")
    .select(
      `
      id,
      campaign_id,
      touchpoint_number,
      recipient_email,
      company_name,
      certificate_ids,
      certificate_snapshot,
      subject,
      scheduled_at,
      status,
      retry_count,
      max_retries,
      updated_at,
      renewal_campaigns!inner (
        status
      )
    `
    )
    .eq("renewal_campaigns.status", "active")
    .eq("status", "failed")
    .order("updated_at", { ascending: true })
    .limit(100);

  if (failedError) {
    throw new Error(`Failed to fetch failed emails: ${failedError.message}`);
  }

  const retries = ((failedRows ?? []) as ScheduledEmailRecord[])
    .filter((row) => isEligibleForRetry(row, now))
    .slice(0, remaining);

  return [...pending, ...retries].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );
}

async function incrementCampaignEmailsSent(
  supabase: SupabaseClient,
  campaignId: string
) {
  const { data: campaign, error: readError } = await supabase
    .from("renewal_campaigns")
    .select("emails_sent")
    .eq("id", campaignId)
    .single();

  if (readError) {
    throw new Error(`Failed to read campaign: ${readError.message}`);
  }

  const { error: updateError } = await supabase
    .from("renewal_campaigns")
    .update({ emails_sent: (campaign.emails_sent ?? 0) + 1 })
    .eq("id", campaignId);

  if (updateError) {
    throw new Error(`Failed to update campaign count: ${updateError.message}`);
  }
}

export async function processScheduledRenewalEmail(
  supabase: SupabaseClient,
  email: ScheduledEmailRecord,
  options: {
    sendFn?: SendEmailFn;
    now?: Date;
  } = {}
): Promise<ProcessRenewalEmailResult> {
  const sendFn = options.sendFn ?? sendEmail;
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  const { data: liveCerts, error: certError } = await supabase
    .from("certificates")
    .select("id, ops_status")
    .in("id", email.certificate_ids);

  if (certError) {
    const errorMessage = `Certificate lookup failed: ${certError.message}`;
    await markSendFailed(supabase, email, errorMessage, nowIso);
    await logEmailSend(supabase, {
      emailType: "renewal",
      recipientEmail: email.recipient_email,
      companyName: email.company_name,
      subject: email.subject,
      certificateCount: email.certificate_ids.length,
      status: "failed",
      errorMessage,
      campaignId: email.campaign_id,
      scheduledEmailId: email.id,
    });
    return { outcome: "failed", errorMessage };
  }

  const skipCheck = shouldSkipDueToOpsDone(
    liveCerts ?? [],
    email.certificate_ids
  );

  if (skipCheck.skip) {
    const reason = skipCheck.reason ?? "Skipped";
    await supabase
      .from("scheduled_emails")
      .update({
        status: "skipped",
        error_message: reason,
        updated_at: nowIso,
      })
      .eq("id", email.id);

    await logEmailSend(supabase, {
      emailType: "renewal",
      recipientEmail: email.recipient_email,
      companyName: email.company_name,
      subject: email.subject,
      certificateCount: email.certificate_ids.length,
      status: "skipped",
      errorMessage: reason,
      campaignId: email.campaign_id,
      scheduledEmailId: email.id,
    });

    return { outcome: "skipped" };
  }

  const snapshots = Array.isArray(email.certificate_snapshot)
    ? email.certificate_snapshot
    : [];
  const templateCerts = snapshotsToTemplateCertificates(snapshots);
  const emailType = touchpointToEmailType(email.touchpoint_number);
  const html = generateRenewalEmailHtml(templateCerts, emailType);

  const sendResult = await sendFn({
    to: email.recipient_email,
    subject: email.subject,
    html,
    cc: RENEWAL_CC,
    account: "renewal",
  });

  if (sendResult.success) {
    await supabase
      .from("scheduled_emails")
      .update({
        status: "sent",
        sent_at: nowIso,
        error_message: null,
        updated_at: nowIso,
      })
      .eq("id", email.id);

    await incrementCampaignEmailsSent(supabase, email.campaign_id);

    await logEmailSend(supabase, {
      emailType: "renewal",
      recipientEmail: email.recipient_email,
      companyName: email.company_name,
      subject: email.subject,
      certificateCount: email.certificate_ids.length,
      status: "sent",
      smtpMessageId: sendResult.messageId,
      campaignId: email.campaign_id,
      scheduledEmailId: email.id,
    });

    return { outcome: "sent", messageId: sendResult.messageId };
  }

  await markSendFailed(supabase, email, sendResult.error, nowIso);

  await logEmailSend(supabase, {
    emailType: "renewal",
    recipientEmail: email.recipient_email,
    companyName: email.company_name,
    subject: email.subject,
    certificateCount: email.certificate_ids.length,
    status: "failed",
    errorMessage: sendResult.error,
    campaignId: email.campaign_id,
    scheduledEmailId: email.id,
  });

  return { outcome: "failed", errorMessage: sendResult.error };
}

async function markSendFailed(
  supabase: SupabaseClient,
  email: ScheduledEmailRecord,
  errorMessage: string,
  nowIso: string
) {
  const nextRetryCount = email.retry_count + 1;

  await supabase
    .from("scheduled_emails")
    .update({
      status: "failed",
      error_message: errorMessage,
      retry_count: nextRetryCount,
      updated_at: nowIso,
    })
    .eq("id", email.id);
}

export async function saveRenewalCronRunLog(
  supabase: SupabaseClient,
  stats: RenewalCronStats
) {
  const payload: RenewalCronRunLog = {
    ...stats,
    last_run_at: stats.finishedAt,
  };

  await supabase.from("app_settings").upsert({
    key: APP_SETTINGS_CRON_KEY,
    value: payload,
    updated_at: new Date().toISOString(),
  });
}

export async function getRenewalCronRunLog(
  supabase: SupabaseClient
): Promise<RenewalCronRunLog | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", APP_SETTINGS_CRON_KEY)
    .maybeSingle();

  return (data?.value as RenewalCronRunLog | null) ?? null;
}

async function syncSheetBeforeRenewalSend(
  supabase: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const syncStats = await syncCertificatesFromSheet(supabase);
    if (syncStats.status === "failed") {
      return {
        ok: false,
        error:
          syncStats.errors.join("; ") ||
          "Google Sheets sync failed before renewal send",
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Google Sheets sync failed before renewal send",
    };
  }
}

export async function runRenewalSendCron(options?: {
  batchSize?: number;
  delayMs?: number;
  now?: Date;
  supabase?: SupabaseClient;
  /** When true, skips the pre-send sheet pull (tests only). */
  skipSheetSync?: boolean;
}): Promise<RenewalCronStats> {
  const supabase = options?.supabase ?? createAdminClient();
  const batchSize = options?.batchSize ?? RENEWAL_SEND_BATCH_SIZE;
  const delayMs = options?.delayMs ?? RENEWAL_SEND_DELAY_MS;
  const now = options?.now ?? new Date();
  const startedAt = now.toISOString();

  if (!options?.skipSheetSync) {
    const syncResult = await syncSheetBeforeRenewalSend(supabase);
    if (!syncResult.ok) {
      const finishedAt = new Date().toISOString();
      const stats: RenewalCronStats = {
        status: "failed",
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        errors: [`Sheet sync failed: ${syncResult.error}`],
        startedAt,
        finishedAt,
      };
      await saveRenewalCronRunLog(supabase, stats);
      return stats;
    }
  }

  const emails = await fetchDueScheduledEmails(supabase, batchSize, now);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let index = 0; index < emails.length; index++) {
    const email = emails[index];

    try {
      const result = await processScheduledRenewalEmail(supabase, email, {
        now,
      });

      if (result.outcome === "sent") {
        sent += 1;
      } else if (result.outcome === "skipped") {
        skipped += 1;
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

    if (index < emails.length - 1) {
      await sleep(delayMs);
    }
  }

  const finishedAt = new Date().toISOString();
  const processed = emails.length;

  const stats: RenewalCronStats = {
    status:
      failed > 0 && sent + skipped === 0
        ? "failed"
        : failed > 0
          ? "partial"
          : "success",
    processed,
    sent,
    skipped,
    failed,
    errors,
    startedAt,
    finishedAt,
  };

  await saveRenewalCronRunLog(supabase, stats);

  return stats;
}
