export type EmailLogType = "all" | "renewal" | "marketing" | "manual";

export type EmailLogStatus = "sent" | "failed" | "skipped" | "pending" | "cancelled";

export type EmailLogFilters = {
  type?: EmailLogType;
  status?: string | null;
  recipient?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
};

export type EmailLogEntry = {
  id: string;
  email_type: string;
  campaign_id: string | null;
  campaign_name: string | null;
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

export type EmailLogStats = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  successRate: number;
};

export type EmailLogsResult = {
  logs: EmailLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
