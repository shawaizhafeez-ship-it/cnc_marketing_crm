export type RenewalCampaignStats = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  target_year: number;
  target_month: number;
  anchor_date: string;
  total_certificates: number;
  total_recipients: number;
  total_emails_scheduled: number;
  emails_sent: number;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress_pct: number | null;
  pending_count: number | null;
  sent_count: number | null;
  failed_count: number | null;
  skipped_count: number | null;
  cancelled_count: number | null;
};

export type ScheduledEmailRow = {
  id: string;
  campaign_id: string;
  touchpoint_number: number;
  recipient_email: string;
  company_name: string;
  certificate_ids: string[] | null;
  certificate_snapshot: unknown;
  subject: string;
  scheduled_at: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
};

export type EmailLogRow = {
  id: string;
  email_type: string;
  campaign_id: string | null;
  scheduled_email_id: string | null;
  recipient_email: string;
  company_name: string | null;
  subject: string;
  certificate_count: number;
  status: string;
  error_message: string | null;
  smtp_message_id: string | null;
  sent_by: string | null;
  sent_at: string;
  metadata: Record<string, unknown> | null;
};

export type TouchpointPreview = {
  touchpointNumber: number;
  scheduledAt: string;
  isPast: boolean;
};

export type RenewalCampaignDetail = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  target_month: number;
  target_year: number;
  anchor_date: string;
  total_certificates: number;
  total_recipients: number;
  total_emails_scheduled: number;
  emails_sent: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
};
