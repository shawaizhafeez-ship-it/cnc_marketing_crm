export const TEMPLATE_VARIABLES = [
  "company_name",
  "contact_person",
  "certificate_no",
  "item",
  "expiry_date",
  "renewal_amount",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export type TemplateCategory =
  | "product_updates"
  | "compliance_news"
  | "general_marketing"
  | "announcements"
  | "renewals"
  | "custom";

export type TemplateVariables = Record<string, string>;

export type MarketingTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  html_content: string;
  variables: string[];
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  product_updates: "Product Updates",
  compliance_news: "Compliance News",
  general_marketing: "General Marketing",
  announcements: "Announcements",
  renewals: "Renewals",
  custom: "Custom",
};

export const TEMPLATE_CATEGORIES = Object.keys(
  TEMPLATE_CATEGORY_LABELS
) as TemplateCategory[];

export const DEFAULT_PREVIEW_VARIABLES: TemplateVariables = {
  company_name: "ACME Corp",
  contact_person: "John Smith",
  certificate_no: "CE-2024-001",
  item: "Safety Gloves",
  expiry_date: "16/03/2026",
  renewal_amount: "50",
};
