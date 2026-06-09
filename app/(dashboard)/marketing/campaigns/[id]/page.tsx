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

  const firstPendingSend = scheduledEmails
    .filter((email) => email.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )[0];
  const isScheduledForFuture =
    firstPendingSend &&
    new Date(firstPendingSend.scheduled_at).getTime() > Date.now();

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
        {campaign.started_at && (
          <span className="text-sm text-muted-foreground">
            First send:{" "}
            {new Date(campaign.started_at).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        )}
        <MarketingCampaignActions
          campaignId={campaign.id}
          status={campaign.status}
        />
      </div>

      {isScheduledForFuture && firstPendingSend && (
        <div className="mb-6 rounded-lg border border-blue-500/40 bg-blue-50 p-4 text-sm text-blue-950 dark:bg-blue-950/20 dark:text-blue-100">
          <p className="font-medium">Scheduled for a future send</p>
          <p className="mt-1 text-blue-900/80 dark:text-blue-100/80">
            The next pending email is scheduled for{" "}
            <strong>
              {new Date(firstPendingSend.scheduled_at).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </strong>
            . Emails will not send before that time.
          </p>
        </div>
      )}

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
        campaignStartedAt={campaign.started_at}
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
