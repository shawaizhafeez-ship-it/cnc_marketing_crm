import Link from "next/link";
import { CalendarClock, Megaphone, Plus } from "lucide-react";
import { CampaignStatusBadge } from "@/components/renewals/campaign-status-badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CAMPAIGN_TYPE_LABELS } from "@/lib/marketing/campaign-types";
import type { MarketingCampaignStats } from "@/lib/marketing/campaign-types";
import type { RenewalCampaignStats } from "@/lib/renewals/campaign-types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type CampaignProgressListProps = {
  title: string;
  description: string;
  viewAllHref: string;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    progressPct: number;
    sent: number;
    total: number;
    pending: number;
    subtitle?: string;
    typeLabel?: string;
  }>;
};

function CampaignProgressList({
  title,
  description,
  viewAllHref,
  campaigns,
}: CampaignProgressListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Link
            href={viewAllHref}
            className="text-sm text-muted-foreground hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaigns.length === 0 ? (
          <EmptyState
            icon={title.includes("Renewal") ? CalendarClock : Megaphone}
            title={
              title.includes("Renewal")
                ? "No active renewal campaigns"
                : "No active marketing campaigns"
            }
            description={
              title.includes("Renewal")
                ? "Create a month-anchor campaign to schedule renewal touchpoints."
                : "Create a filtered marketing campaign to reach certificate holders."
            }
            action={
              <Button asChild size="sm">
                <Link
                  href={
                    title.includes("Renewal")
                      ? "/renewals/campaigns/new"
                      : "/marketing/campaigns/new"
                  }
                >
                  <Plus className="h-4 w-4" />
                  Create campaign
                </Link>
              </Button>
            }
          />
        ) : (
          campaigns.map((campaign) => (
            <div key={campaign.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={
                      title.includes("Renewal")
                        ? `/renewals/campaigns/${campaign.id}`
                        : `/marketing/campaigns/${campaign.id}`
                    }
                    className="font-medium hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  {campaign.subtitle && (
                    <p className="text-xs text-muted-foreground">
                      {campaign.subtitle}
                    </p>
                  )}
                  {campaign.typeLabel && (
                    <p className="text-xs text-muted-foreground">
                      {campaign.typeLabel}
                    </p>
                  )}
                </div>
                <CampaignStatusBadge status={campaign.status} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {campaign.sent} / {campaign.total} sent
                  </span>
                  <span>{campaign.progressPct}%</span>
                </div>
                <Progress value={campaign.progressPct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {campaign.pending} pending
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

type DashboardCampaignListsProps = {
  renewalCampaigns: RenewalCampaignStats[];
  marketingCampaigns: MarketingCampaignStats[];
};

export function DashboardCampaignLists({
  renewalCampaigns,
  marketingCampaigns,
}: DashboardCampaignListsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CampaignProgressList
        title="Active renewal campaigns"
        description="Month-anchor renewal sequences currently running."
        viewAllHref="/renewals/campaigns?status=active"
        campaigns={renewalCampaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          progressPct: Number(campaign.progress_pct ?? 0),
          sent: campaign.emails_sent,
          total: campaign.total_emails_scheduled,
          pending: campaign.pending_count ?? 0,
          subtitle: `${MONTH_NAMES[campaign.target_month - 1]} ${campaign.target_year} · Anchor ${campaign.anchor_date}`,
        }))}
      />

      <CampaignProgressList
        title="Active marketing campaigns"
        description="Filtered marketing sequences currently running."
        viewAllHref="/marketing/campaigns?status=active"
        campaigns={marketingCampaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          progressPct: Number(campaign.progress_pct ?? 0),
          sent: campaign.emails_sent,
          total: campaign.total_emails,
          pending: campaign.pending_count ?? 0,
          typeLabel: CAMPAIGN_TYPE_LABELS[campaign.campaign_type],
        }))}
      />
    </div>
  );
}
