export type CampaignType =
  | "marketing"
  | "newsletter"
  | "product_update"
  | "compliance_alert"
  | "general";

export type TouchpointScheduleType =
  | "immediate"
  | "weekly"
  | "monthly"
  | "custom_days";

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  marketing: "Marketing",
  newsletter: "Newsletter",
  product_update: "Product Update",
  compliance_alert: "Compliance Alert",
  general: "General",
};

export const CAMPAIGN_TYPES = Object.keys(
  CAMPAIGN_TYPE_LABELS
) as CampaignType[];

export const SCHEDULE_TYPE_LABELS: Record<TouchpointScheduleType, string> = {
  immediate: "Immediate",
  weekly: "Weekly intervals",
  monthly: "Monthly intervals",
  custom_days: "Custom day intervals",
};

export type TouchpointConfigInput = {
  touchpoint_number: number;
  template_id: string;
  schedule_type: TouchpointScheduleType;
  schedule_value: number;
};

export type CreateMarketingCampaignInput = {
  name: string;
  description?: string;
  campaign_type: CampaignType;
  filters: import("@/lib/marketing/filter-certificates").MarketingFilters;
  touchpoints: TouchpointConfigInput[];
};

export type MarketingCampaignStats = {
  id: string;
  name: string;
  campaign_type: CampaignType;
  status: string;
  total_certificates: number;
  total_recipients: number;
  total_emails: number;
  emails_sent: number;
  filters_applied: Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress_pct: number | null;
  pending_count: number | null;
  failed_count: number | null;
};

export type MarketingTouchpointRow = {
  id: string;
  campaign_id: string;
  touchpoint_number: number;
  template_id: string;
  schedule_type: TouchpointScheduleType;
  schedule_value: number;
  delay_days: number;
  is_active: boolean;
  created_at: string;
};

export type MarketingScheduledEmailRow = {
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
  sent_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
};

export type MarketingCampaignRow = {
  id: string;
  name: string;
  description: string | null;
  campaign_type: CampaignType;
  status: string;
  filters_applied: Record<string, unknown>;
  total_certificates: number;
  total_recipients: number;
  total_emails: number;
  emails_sent: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};
