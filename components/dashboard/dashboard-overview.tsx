import Link from "next/link";
import {
  CalendarClock,
  FileCheck2,
  Mail,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { SyncSheetsButton } from "@/components/shared/sync-sheets-button";
import { Button } from "@/components/ui/button";
import type { DashboardStats } from "@/lib/dashboard/types";

type DashboardStatsCardsProps = {
  stats: DashboardStats;
};

export function DashboardStatsCards({ stats }: DashboardStatsCardsProps) {
  const cards = [
    {
      label: "Active certificates",
      value: stats.activeCertificates,
      description: "Eligible for renewal and marketing",
      icon: FileCheck2,
    },
    {
      label: "Expiring this month",
      value: stats.expiringThisMonth,
      description: "Active certificates with expiry in current month",
      icon: CalendarClock,
    },
    {
      label: "Pending renewal emails",
      value: stats.pendingRenewalEmails,
      description: "Queued in active renewal campaigns",
      icon: Mail,
    },
    {
      label: "Pending marketing emails",
      value: stats.pendingMarketingEmails,
      description: "Queued in active marketing campaigns",
      icon: Megaphone,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border bg-card p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-3xl font-bold">{card.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
            <card.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardQuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <SyncSheetsButton />
      <Button variant="outline" asChild>
        <Link href="/renewals/campaigns/new">
          <Mail className="h-4 w-4" />
          Create renewal campaign
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/marketing/campaigns/new">
          <Megaphone className="h-4 w-4" />
          Create marketing campaign
        </Link>
      </Button>
    </div>
  );
}

type DashboardSyncStatusProps = {
  syncLog: {
    status: string;
    started_at: string;
    completed_at: string | null;
    rows_processed: number;
    error_message: string | null;
  } | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardSyncStatus({ syncLog }: DashboardSyncStatusProps) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">Google Sheets sync</p>
          {syncLog ? (
            <>
              <p className="text-sm capitalize text-muted-foreground">
                Last sync: {formatDateTime(syncLog.started_at)} ·{" "}
                <span
                  className={
                    syncLog.status === "success"
                      ? "text-green-700"
                      : syncLog.status === "failed"
                        ? "text-destructive"
                        : ""
                  }
                >
                  {syncLog.status}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {syncLog.rows_processed} rows processed
                {syncLog.error_message ? ` · ${syncLog.error_message}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sync runs recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
