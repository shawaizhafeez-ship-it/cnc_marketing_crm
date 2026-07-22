export type CertificateRow = {
  id: string;
  certificate_no: string;
  company_name: string;
  item: string | null;
  expiry_date: string;
  recipient_email: string;
  renewal_amount: number | null;
  ops_status: string;
  contact_person: string | null;
  phone: string | null;
};

export type TemplateCertificate = {
  certificateNo: string;
  item: string;
  expiry: string;
  companyName: string;
  renewalAmount: string;
};

export type GroupedRenewalEmail = {
  recipientEmail: string;
  company: string;
  certificates: TemplateCertificate[];
  certificateCount: number;
};

export type RenewalEmailMap = Record<string, GroupedRenewalEmail>;

export type RenewalStats = {
  totalCertificates: number;
  uniqueCompanies: number;
  uniqueEmails: number;
  totalRenewalAmount: number;
};

export type RenewalPreviewResult = {
  recipientEmail: string;
  company: string;
  subject: string;
  html: string;
  certificateCount: number;
};

export type SendRenewalResult = {
  recipientEmail: string;
  company: string;
  certificateCount: number;
  success: boolean;
  message: string;
};

export type RenewalBatchResult = {
  results: SendRenewalResult[];
  successful: number;
  failed: number;
  total: number;
};
