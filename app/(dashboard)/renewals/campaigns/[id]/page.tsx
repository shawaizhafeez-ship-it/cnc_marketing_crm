import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { CampaignActions } from "@/components/renewals/campaign-actions";
import { CampaignDetailTabs } from "@/components/renewals/campaign-detail-tabs";
import { CampaignStatusBadge } from "@/components/renewals/campaign-status-badge";
import { getRenewalCampaignDetail } from "@/app/(dashboard)/renewals/campaigns/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type CampaignDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function RenewalCampaignDetailPage({
  params,
  searchParams,
}: CampaignDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  let detail: Awaited<ReturnType<typeof getRenewalCampaignDetail>> | null = null;
  let error: string | null = null;

  try {
    detail = await getRenewalCampaignDetail(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Campaign not found";
  }

  if (error || !detail) {
    return (
      <>
        <PageHeader title="Campaign not found" description={error ?? ""} />
        <Button variant="outline" asChild>
          <Link href="/renewals/campaigns">Back to campaigns</Link>
        </Button>
      </>
    );
  }

  const { campaign, scheduledEmails, touchpoints, logs } = detail;

  const pendingCount = scheduledEmails.filter((e) => e.status === "pending").length;
  const sentCount = scheduledEmails.filter((e) => e.status === "sent").length;
  const failedCount = scheduledEmails.filter((e) => e.status === "failed").length;

  const progress =
    campaign.total_emails_scheduled > 0
      ? Math.round(
          (campaign.emails_sent / campaign.total_emails_scheduled) * 100
        )
      : 0;

  const defaultTab =
    tab === "scheduled" || tab === "logs" ? tab : "overview";

  return (
    <>
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/renewals/campaigns">Back to campaigns</Link>
        </Button>
      </div>

      <PageHeader
        title={campaign.name}
        description={
          campaign.description ??
          `Renewals for ${MONTH_NAMES[campaign.target_month - 1]} ${campaign.target_year}`
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <CampaignStatusBadge status={campaign.status} />
        <span className="text-sm text-muted-foreground">
          Target: {MONTH_NAMES[campaign.target_month - 1]} {campaign.target_year}
        </span>
        <span className="text-sm text-muted-foreground">
          Anchor: {campaign.anchor_date}
        </span>
        <CampaignActions campaignId={campaign.id} status={campaign.status} />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="Certificates" value={String(campaign.total_certificates)} />
        <Metric label="Recipients" value={String(campaign.total_recipients)} />
        <Metric
          label="Emails scheduled"
          value={String(campaign.total_emails_scheduled)}
        />
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
            {campaign.emails_sent} / {campaign.total_emails_scheduled} sent ({progress}%)
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <CampaignDetailTabs
        campaignName={campaign.name}
        defaultTab={defaultTab}
        touchpoints={touchpoints}
        anchorDate={campaign.anchor_date}
        createdAt={campaign.created_at}
        startedAt={campaign.started_at}
        completedAt={campaign.completed_at}
        scheduledEmails={scheduledEmails}
        logs={logs}
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
