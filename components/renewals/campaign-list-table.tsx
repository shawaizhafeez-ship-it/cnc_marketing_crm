"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { CampaignStatusBadge } from "@/components/renewals/campaign-status-badge";
import { DataTable } from "@/components/ui/data-table";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RenewalCampaignStats } from "@/lib/renewals/campaign-types";
import { Button } from "@/components/ui/button";

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

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "draft", label: "Draft" },
];

type CampaignListTableProps = {
  campaigns: RenewalCampaignStats[];
  statusFilter: string;
  sortOrder: "asc" | "desc";
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CampaignListTable({
  campaigns,
  statusFilter,
  sortOrder,
}: CampaignListTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`/renewals/campaigns?${params.toString()}`);
  }

  const columns: ColumnDef<RenewalCampaignStats>[] = [
    {
      accessorKey: "name",
      header: "Campaign",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            href={`/renewals/campaigns/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {MONTH_NAMES[row.original.target_month - 1]}{" "}
            {row.original.target_year} · Anchor {row.original.anchor_date}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <CampaignStatusBadge status={row.original.status} />,
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => {
        const pct = row.original.progress_pct ?? 0;
        return (
          <div className="min-w-[140px] space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {row.original.emails_sent ?? 0} /{" "}
                {row.original.total_emails_scheduled ?? 0} sent
              </span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        );
      },
    },
    {
      accessorKey: "total_certificates",
      header: "Certs",
    },
    {
      accessorKey: "total_recipients",
      header: "Recipients",
    },
    {
      accessorKey: "pending_count",
      header: "Pending",
      cell: ({ row }) => row.original.pending_count ?? 0,
    },
    {
      accessorKey: "sent_count",
      header: "Sent",
      cell: ({ row }) => row.original.sent_count ?? 0,
    },
    {
      accessorKey: "failed_count",
      header: "Failed",
      cell: ({ row }) => (
        <span
          className={
            (row.original.failed_count ?? 0) > 0 ? "text-destructive" : ""
          }
        >
          {row.original.failed_count ?? 0}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: () => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() =>
            updateParams({
              sort: sortOrder === "desc" ? "asc" : "desc",
            })
          }
        >
          Created
          {sortOrder === "desc" ? (
            <ArrowDown className="ml-1 h-3.5 w-3.5" />
          ) : sortOrder === "asc" ? (
            <ArrowUp className="ml-1 h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
          )}
        </Button>
      ),
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/renewals/campaigns/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(value) => updateParams({ status: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortOrder}
          onValueChange={(value) => updateParams({ sort: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground">
          {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={campaigns}
        emptyMessage="No campaigns match the selected filters."
      />
    </div>
  );
}
