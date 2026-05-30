import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { MarketingCampaignActions } from "@/components/marketing/marketing-campaign-actions";
import { MarketingCampaignDetailTabs } from "@/components/marketing/marketing-campaign-detail-tabs";
import { CampaignStatusBadge } from "@/components/renewals/campaign-status-badge";
import { getMarketingCampaignDetail } from "@/app/(dashboard)/marketing/campaigns/actions";
import { Button } from "@/components/ui/button";
import {
  CAMPAIGN_TYPE_LABELS,
} from "@/lib/marketing/campaign-types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type MarketingCampaignDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function MarketingCampaignDetailPage({
  params,
  searchParams,
}: MarketingCampaignDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  let detail: Awaited<ReturnType<typeof getMarketingCampaignDetail>> | null = null;

  try {
    detail = await getMarketingCampaignDetail(id);
  } catch {
    notFound();
  }

  const { campaign, touchpoints, scheduledEmails } = detail;

  const pendingCount = scheduledEmails.filter((e) => e.status === "pending").length;
  const sentCount = scheduledEmails.filter((e) => e.status === "sent").length;
  const failedCount = scheduledEmails.filter((e) => e.status === "failed").length;

  const progress =
    campaign.total_emails > 0
      ? Math.round((campaign.emails_sent / campaign.total_emails) * 100)
      : 0;

  const defaultTab =
    tab === "touchpoints" || tab === "scheduled" ? tab : "overview";

  return (
    <>
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/marketing/campaigns">Back to campaigns</Link>
        </Button>
      </div>

      <PageHeader
        title={campaign.name}
        description={
          campaign.description ??
          CAMPAIGN_TYPE_LABELS[campaign.campaign_type]
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <CampaignStatusBadge status={campaign.status} />
        <span className="text-sm text-muted-foreground">
          Type: {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
        </span>
        <MarketingCampaignActions
          campaignId={campaign.id}
          status={campaign.status}
        />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="Certificates" value={String(campaign.total_certificates)} />
        <Metric label="Recipients" value={String(campaign.total_recipients)} />
        <Metric label="Emails scheduled" value={String(campaign.total_emails)} />
        <Metric label="Sent" value={String(sentCount)} />
        <Metric label="Pending" value={String(pendingCount)} />
        <Metric
          label="Failed"
          value={String(failedCount)}
          className={failedCount > 0 ? "text-destructive" : undefined}
        />
      </div>

      <div className="mb-8 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Campaign progress</span>
          <span>
            {campaign.emails_sent} / {campaign.total_emails} sent ({progress}%)
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <MarketingCampaignDetailTabs
        defaultTab={defaultTab}
        filtersApplied={campaign.filters_applied}
        touchpoints={touchpoints}
        scheduledEmails={scheduledEmails}
      />
    </>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${className ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
