/** Raw row from Google Sheets keyed by column header */
export type SheetRow = Record<string, string>;

/** Expected column headers in the Renewals / List Cleaned worksheet */
export const SHEET_COLUMNS = {
  COMPANY_NAME: "COMPANY NAME",
  CERTIFICATE_NO: "CERTIFICATE NO.",
  ITEM: "ITEM",
  EXPIRY: "EXPIRY",
  EMAIL: "E-MAIL",
  RENEWAL_AMOUNT: "Renewal Amount",
  OPS_STATUS: "Ops Status",
  CONTACT_PERSON: "Contact Person",
} as const;

export type CertificateUpsert = {
  certificate_no: string;
  company_name: string;
  item: string | null;
  expiry_date: string;
  recipient_email: string;
  renewal_amount: number | null;
  ops_status: string;
  contact_person: string | null;
  sheet_row_hash: string;
  last_synced_at: string;
};

export type SyncWarning = {
  row: number;
  certificate_no?: string;
  reason: string;
};

export type SyncStats = {
  rowsProcessed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsUnchanged: number;
  warnings: SyncWarning[];
  errors: string[];
  status: "success" | "failed" | "partial";
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

export type SheetConfig = {
  spreadsheetId: string;
  spreadsheetName: string;
  worksheetName: string;
};

export type ParseExpiryResult =
  | { success: true; isoDate: string }
  | { success: false; error: string };
