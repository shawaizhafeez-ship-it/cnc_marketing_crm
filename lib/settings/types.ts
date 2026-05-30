import type { SmtpDisplayConfig } from "@/lib/email/smtp-display";
import type { RenewalCronRunLog } from "@/lib/email/send-renewal";
import type { MarketingCronRunLog } from "@/lib/email/send-marketing";
import type { SheetConfig } from "@/lib/sheets/types";

export type RenewalTouchpointSettings = {
  offsets: number[];
  send_hour: number;
  description: string;
};

export type GoogleSheetSettings = {
  spreadsheet: string;
  worksheet: string;
  spreadsheetId: string | null;
};

export type CronJobInfo = {
  id: string;
  label: string;
  schedule: string;
  scheduleLabel: string;
  description: string;
};

export const CRON_JOBS: CronJobInfo[] = [
  {
    id: "sync-sheets",
    label: "Google Sheets sync",
    schedule: "*/30 * * * *",
    scheduleLabel: "Every 30 minutes",
    description: "Pulls certificate rows from the Renewals spreadsheet into Supabase.",
  },
  {
    id: "send-renewals",
    label: "Renewal email send",
    schedule: "*/5 * * * *",
    scheduleLabel: "Every 5 minutes",
    description:
      "Sends pending renewal scheduled emails (max 20 per run, 2s between sends).",
  },
  {
    id: "send-marketing",
    label: "Marketing email send",
    schedule: "*/10 * * * *",
    scheduleLabel: "Every 10 minutes",
    description:
      "Sends pending marketing emails subject to the 100/day limit (max 10 per run).",
  },
];

export const REQUIRED_SHEET_COLUMNS = [
  "COMPANY NAME",
  "CERTIFICATE NO.",
  "ITEM",
  "EXPIRY (DD/MM/YYYY)",
  "E-MAIL",
  "Renewal Amount",
  "Ops Status",
] as const;

export type SettingsPageData = {
  smtp: {
    renewal: SmtpDisplayConfig;
    marketing: SmtpDisplayConfig;
  };
  googleSheet: GoogleSheetSettings | null;
  touchpoints: RenewalTouchpointSettings | null;
  sheetConfig: SheetConfig | null;
  latestLog: SheetSyncSummary;
  renewalSendLog: RenewalCronRunLog | null;
  marketingSendLog: MarketingCronRunLog | null;
  isAdmin: boolean;
};

export type SheetSyncSummary = {
  status: string;
  started_at: string;
  completed_at: string | null;
  rows_processed: number;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  error_message: string | null;
} | null;
