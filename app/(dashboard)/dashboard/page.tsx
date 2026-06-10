import { PageHeader } from "@/components/shared/page-header";
import { MarketingDailyWidget } from "@/components/dashboard/marketing-daily-widget";
import { DashboardCampaignLists } from "@/components/dashboard/dashboard-campaign-lists";
import {
  DashboardQuickActions,
  DashboardStatsCards,
  DashboardSyncStatus,
} from "@/components/dashboard/dashboard-overview";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { SendMarketingButton } from "@/components/marketing/send-marketing-button";
import { getDashboardData } from "@/app/(dashboard)/dashboard/actions";

export default async function DashboardPage() {
  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let error: string | null = null;

  try {
    data = await getDashboardData();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load dashboard";
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of certificates, campaigns, and email activity."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <DashboardQuickActions />

          <DashboardStatsCards stats={data.stats} />

          <div className="grid gap-6 lg:grid-cols-2">
            <MarketingDailyWidget status={data.marketingDaily} />
            <DashboardSyncStatus syncLog={data.syncLog} />
          </div>

          <DashboardCampaignLists
            renewalCampaigns={data.renewalCampaigns}
            marketingCampaigns={data.marketingCampaigns}
          />

          <DashboardRecentActivity logs={data.recentLogs} />

          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Marketing email sends</p>
            {data.marketingSendLog ? (
              <p className="mt-1 text-muted-foreground">
                Last run: {data.marketingSendLog.sent} sent ·{" "}
                {data.marketingSendLog.skipped} skipped ·{" "}
                {data.marketingSendLog.failed} failed
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">
                No send runs recorded yet.
              </p>
            )}
            <div className="mt-3">
              <SendMarketingButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
