import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CampaignListTable } from "@/components/renewals/campaign-list-table";
import { listRenewalCampaigns } from "@/app/(dashboard)/renewals/campaigns/actions";
import { Button } from "@/components/ui/button";

type RenewalCampaignsPageProps = {
  searchParams: Promise<{ status?: string; sort?: string }>;
};

export default async function RenewalCampaignsPage({
  searchParams,
}: RenewalCampaignsPageProps) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const sortOrder = params.sort === "asc" ? "asc" : "desc";

  let campaigns: Awaited<ReturnType<typeof listRenewalCampaigns>> = [];
  let error: string | null = null;

  try {
    campaigns = await listRenewalCampaigns({
      status: statusFilter,
      sort: sortOrder,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load campaigns";
  }

  return (
    <>
      <PageHeader
        title="Renewal Campaigns"
        description="Month-anchor scheduled campaigns — 3 touchpoints per expiry month, grouped by recipient."
      />

      <div className="mb-6">
        <Button asChild>
          <Link href="/renewals/campaigns/new">
            <Plus className="h-4 w-4" />
            Create campaign
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {campaigns.length === 0 && !error ? (
        <EmptyState
          icon={CalendarClock}
          title="No campaigns found"
          description={
            statusFilter !== "all"
              ? "No campaigns match the selected status filter."
              : "Create a campaign to schedule renewal emails for all certificates expiring in a given month."
          }
          action={
            statusFilter === "all" ? (
              <Button asChild>
                <Link href="/renewals/campaigns/new">
                  <Plus className="h-4 w-4" />
                  Create campaign
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <CampaignListTable
            campaigns={campaigns}
            statusFilter={statusFilter}
            sortOrder={sortOrder}
          />
        </Suspense>
      )}
    </>
  );
}
