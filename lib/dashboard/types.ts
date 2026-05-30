import type { EmailLogEntry } from "@/lib/email/email-log-types";
import type { MarketingDailyStatus } from "@/lib/email/daily-limit";
import type { MarketingCronStats } from "@/lib/email/send-marketing";
import type { MarketingCampaignStats } from "@/lib/marketing/campaign-types";
import type { RenewalCampaignStats } from "@/lib/renewals/campaign-types";

export type DashboardStats = {
  activeCertificates: number;
  expiringThisMonth: number;
  pendingRenewalEmails: number;
  pendingMarketingEmails: number;
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

export type DashboardData = {
  stats: DashboardStats;
  renewalCampaigns: RenewalCampaignStats[];
  marketingCampaigns: MarketingCampaignStats[];
  recentLogs: EmailLogEntry[];
  marketingDaily: MarketingDailyStatus;
  marketingSendLog: MarketingCronStats | null;
  syncLog: SheetSyncSummary;
  isAdmin: boolean;
};
