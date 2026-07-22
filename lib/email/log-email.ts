import type { SupabaseClient } from "@supabase/supabase-js";

type LogEmailParams = {
  emailType: "renewal" | "marketing" | "manual" | "cold";
  recipientEmail: string;
  companyName: string;
  subject: string;
  certificateCount: number;
  status: "sent" | "failed" | "skipped";
  errorMessage?: string;
  smtpMessageId?: string;
  sentBy?: string;
  campaignId?: string;
  scheduledEmailId?: string;
  /** Delivery channel. Defaults to email. */
  channel?: "email" | "whatsapp";
  /** WhatsApp destination number (E.164) — stored in metadata for the audit trail. */
  recipientPhone?: string;
};

export async function logEmailSend(
  supabase: SupabaseClient,
  params: LogEmailParams
) {
  await supabase.from("email_logs").insert({
    email_type: params.emailType,
    campaign_id: params.campaignId ?? null,
    scheduled_email_id: params.scheduledEmailId ?? null,
    recipient_email: params.recipientEmail,
    company_name: params.companyName,
    subject: params.subject,
    certificate_count: params.certificateCount,
    status: params.status,
    error_message: params.errorMessage ?? null,
    smtp_message_id: params.smtpMessageId ?? null,
    sent_by: params.sentBy ?? null,
    channel: params.channel ?? "email",
    metadata: params.recipientPhone
      ? { recipient_phone: params.recipientPhone }
      : {},
  });
}
