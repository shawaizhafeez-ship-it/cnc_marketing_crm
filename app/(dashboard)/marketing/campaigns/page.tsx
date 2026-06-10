import Link from "next/link";
import { Suspense } from "react";
import { Megaphone, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MarketingDailyWidget } from "@/components/dashboard/marketing-daily-widget";
import { MarketingCampaignListTable } from "@/components/marketing/marketing-campaign-list-table";
import { SendMarketingButton } from "@/components/marketing/send-marketing-button";
import { getDashboardData } from "@/app/(dashboard)/dashboard/actions";
import { listMarketingCampaigns } from "@/app/(dashboard)/marketing/campaigns/actions";
import { Button } from "@/components/ui/button";

type MarketingCampaignsPageProps = {
  searchParams: Promise<{ status?: string; sort?: string }>;
};

export default async function MarketingCampaignsPage({
  searchParams,
}: MarketingCampaignsPageProps) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const sortOrder = params.sort === "asc" ? "asc" : "desc";

  let campaigns: Awaited<ReturnType<typeof listMarketingCampaigns>> = [];
  let pageData: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let error: string | null = null;

  try {
    [campaigns, pageData] = await Promise.all([
      listMarketingCampaigns({
        status: statusFilter,
        sort: sortOrder,
      }),
      getDashboardData(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load campaigns";
  }

  return (
    <>
      <PageHeader
        title="Marketing Campaigns"
        description="Targeted campaigns with ITEM/company filters and flexible touchpoints."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/marketing/campaigns/new">
            <Plus className="h-4 w-4" />
            Create campaign
          </Link>
        </Button>
        <SendMarketingButton />
      </div>

      {pageData?.marketingDaily && (
        <div className="mb-6">
          <MarketingDailyWidget status={pageData.marketingDaily} />
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {campaigns.length === 0 && !error ? (
        <EmptyState
          icon={Megaphone}
          title="No marketing campaigns yet"
          description="Create a campaign to filter certificates by ITEM and company, then schedule one email per recipient per touchpoint."
          action={
            <Button asChild>
              <Link href="/marketing/campaigns/new">
                <Plus className="h-4 w-4" />
                Create campaign
              </Link>
            </Button>
          }
        />
      ) : (
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <MarketingCampaignListTable
            campaigns={campaigns}
            statusFilter={statusFilter}
            sortOrder={sortOrder}
          />
        </Suspense>
      )}
    </>
  );
}
