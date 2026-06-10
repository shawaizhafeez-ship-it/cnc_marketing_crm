import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canSendMarketingEmail,
  incrementMarketingDailyCounter,
} from "@/lib/email/daily-limit";
import { renderColdEmailHtml } from "@/lib/email/cold-email-template";
import { logEmailSend } from "@/lib/email/log-email";
import { MARKETING_CC, sendEmail } from "@/lib/email/smtp";
import { createAdminClient } from "@/lib/supabase/admin";

/** Max pending cold emails processed per send run. */
export const COLD_EMAIL_FETCH_LIMIT = 10_000;
export const COLD_EMAIL_DELAY_MS = 0;
export const APP_SETTINGS_COLD_EMAIL_CRON_KEY = "cold_email_send_cron";

export type ColdEmailRecipientRecord = {
  id: string;
  batch_id: string;
  recipient_email: string;
  company_name: string;
  status: string;
  retry_count?: number;
  max_retries?: number;
  updated_at?: string;
};

export type ColdEmailBatchRecord = {
  id: string;
  name: string;
  subject: string;
  html_template: string;
  status: string;
  total_recipients: number;
  emails_sent: number;
  emails_failed: number;
};

export type ColdEmailCronStats = {
  status: "success" | "partial" | "failed";
  processed: number;
  sent: number;
  failed: number;
  limitReached: boolean;
  errors: string[];
  startedAt: string;
  finishedAt: string;
};

export type ColdEmailCronRunLog = ColdEmailCronStats & {
  last_run_at: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPendingColdEmails(
  supabase: SupabaseClient,
  limit: number
): Promise<Array<ColdEmailRecipientRecord & { batch: ColdEmailBatchRecord }>> {
  const { data: batches } = await supabase
    .from("cold_email_batches")
    .select("*")
    .eq("status", "active");

  if (!batches?.length) {
    return [];
  }

  const batchIds = batches.map((b) => b.id);
  const batchMap = new Map(
    (batches as ColdEmailBatchRecord[]).map((b) => [b.id, b])
  );

  const { data: recipients, error } = await supabase
    .from("cold_email_recipients")
    .select("*")
    .in("batch_id", batchIds)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (recipients ?? [])
    .map((row) => {
      const batch = batchMap.get(row.batch_id);
      if (!batch) return null;
      return { ...(row as ColdEmailRecipientRecord), batch };
    })
    .filter(Boolean) as Array<ColdEmailRecipientRecord & { batch: ColdEmailBatchRecord }>;
}

async function markRecipientSent(
  supabase: SupabaseClient,
  recipientId: string,
  batchId: string
) {
  await supabase
    .from("cold_email_recipients")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", recipientId);

  const { data: batch } = await supabase
    .from("cold_email_batches")
    .select("emails_sent, total_recipients")
    .eq("id", batchId)
    .single();

  if (batch) {
    const newSent = (batch.emails_sent ?? 0) + 1;
    const updates: Record<string, unknown> = { emails_sent: newSent };
    if (newSent >= batch.total_recipients) {
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
    }
    await supabase.from("cold_email_batches").update(updates).eq("id", batchId);
  }
}

async function markRecipientFailed(
  supabase: SupabaseClient,
  recipientId: string,
  batchId: string,
  errorMessage: string
) {
  await supabase
    .from("cold_email_recipients")
    .update({
      status: "failed",
      error_message: errorMessage,
    })
    .eq("id", recipientId);

  const { data: batch } = await supabase
    .from("cold_email_batches")
    .select("emails_failed")
    .eq("id", batchId)
    .single();

  if (batch) {
    await supabase
      .from("cold_email_batches")
      .update({ emails_failed: (batch.emails_failed ?? 0) + 1 })
      .eq("id", batchId);
  }
}

export async function processColdEmailRecipient(
  supabase: SupabaseClient,
  item: ColdEmailRecipientRecord & { batch: ColdEmailBatchRecord }
): Promise<"sent" | "failed" | "limit_reached"> {
  const canSend = await canSendMarketingEmail(supabase);
  if (!canSend) {
    return "limit_reached";
  }

  const html = renderColdEmailHtml(
    item.batch.html_template,
    item.company_name
  );

  const sendResult = await sendEmail({
    to: item.recipient_email,
    subject: item.batch.subject,
    html,
    cc: MARKETING_CC,
    account: "marketing",
  });

  if (sendResult.success) {
    await incrementMarketingDailyCounter(supabase);
    await markRecipientSent(supabase, item.id, item.batch_id);
    await logEmailSend(supabase, {
      emailType: "cold",
      recipientEmail: item.recipient_email,
      companyName: item.company_name,
      subject: item.batch.subject,
      certificateCount: 0,
      status: "sent",
      smtpMessageId: sendResult.messageId,
      campaignId: item.batch_id,
      scheduledEmailId: item.id,
    });
    return "sent";
  }

  await markRecipientFailed(
    supabase,
    item.id,
    item.batch_id,
    sendResult.error
  );
  await logEmailSend(supabase, {
    emailType: "cold",
    recipientEmail: item.recipient_email,
    companyName: item.company_name,
    subject: item.batch.subject,
    certificateCount: 0,
    status: "failed",
    errorMessage: sendResult.error,
    campaignId: item.batch_id,
    scheduledEmailId: item.id,
  });
  return "failed";
}

export async function saveColdEmailCronRunLog(
  supabase: SupabaseClient,
  stats: ColdEmailCronStats
) {
  const payload: ColdEmailCronRunLog = {
    ...stats,
    last_run_at: stats.finishedAt,
  };

  await supabase.from("app_settings").upsert({
    key: APP_SETTINGS_COLD_EMAIL_CRON_KEY,
    value: payload,
    updated_at: new Date().toISOString(),
  });
}

export async function getColdEmailCronRunLog(
  supabase: SupabaseClient
): Promise<ColdEmailCronRunLog | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", APP_SETTINGS_COLD_EMAIL_CRON_KEY)
    .maybeSingle();

  return (data?.value as ColdEmailCronRunLog | null) ?? null;
}

export async function runColdEmailSendCron(options?: {
  supabase?: SupabaseClient;
  fetchLimit?: number;
}): Promise<ColdEmailCronStats> {
  const supabase = options?.supabase ?? createAdminClient();
  const fetchLimit = options?.fetchLimit ?? COLD_EMAIL_FETCH_LIMIT;
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let limitReached = false;

  try {
    const pending = await fetchPendingColdEmails(supabase, fetchLimit);

    for (const item of pending) {
      if (!(await canSendMarketingEmail(supabase))) {
        limitReached = true;
        break;
      }

      processed += 1;
      try {
        const outcome = await processColdEmailRecipient(supabase, item);
        if (outcome === "sent") {
          sent += 1;
        } else if (outcome === "failed") {
          failed += 1;
        } else {
          limitReached = true;
          break;
        }
      } catch (error) {
        failed += 1;
        errors.push(
          error instanceof Error ? error.message : "Unknown send error"
        );
      }

      if (processed < pending.length) {
        await sleep(COLD_EMAIL_DELAY_MS);
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Cron failed");
  }

  const stats: ColdEmailCronStats = {
    status:
      errors.length > 0 && sent === 0
        ? "failed"
        : failed > 0 || limitReached
          ? "partial"
          : "success",
    processed,
    sent,
    failed,
    limitReached,
    errors,
    startedAt,
    finishedAt: new Date().toISOString(),
  };

  await saveColdEmailCronRunLog(supabase, stats);
  return stats;
}
