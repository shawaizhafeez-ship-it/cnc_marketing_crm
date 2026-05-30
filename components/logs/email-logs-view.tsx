"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { exportEmailLogs } from "@/app/(dashboard)/logs/actions";
import { EmailStatusBadge } from "@/components/renewals/campaign-status-badge";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/csv/download-csv";
import type {
  EmailLogEntry,
  EmailLogFilters,
  EmailLogStats,
  EmailLogsResult,
} from "@/lib/email/email-log-types";

const TYPE_TABS = [
  { value: "all", label: "All" },
  { value: "renewal", label: "Renewal" },
  { value: "marketing", label: "Marketing" },
  { value: "cold", label: "Cold" },
  { value: "manual", label: "Manual" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

type EmailLogsViewProps = {
  stats: EmailLogStats;
  result: EmailLogsResult;
  filters: EmailLogFilters;
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function emailTypeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function campaignHref(log: EmailLogEntry) {
  if (!log.campaign_id) return null;
  if (log.email_type === "renewal") {
    return `/renewals/campaigns/${log.campaign_id}`;
  }
  if (log.email_type === "marketing") {
    return `/marketing/campaigns/${log.campaign_id}`;
  }
  if (log.email_type === "cold") {
    return `/marketing/cold-email/${log.campaign_id}`;
  }
  return null;
}

export function EmailLogsView({ stats, result, filters }: EmailLogsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exportPending, startExport] = useTransition();

  const typeFilter = filters.type ?? "all";
  const statusFilter = filters.status ?? "all";
  const recipientFilter = filters.recipient ?? "";
  const fromFilter = filters.from ?? "";
  const toFilter = filters.to ?? "";

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`/logs?${params.toString()}`);
  }

  function handleTabChange(value: string) {
    updateParams({ type: value === "all" ? null : value, page: null });
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    updateParams({
      recipient: (formData.get("recipient") as string) || null,
      from: (formData.get("from") as string) || null,
      to: (formData.get("to") as string) || null,
      page: null,
    });
  }

  function handleExport() {
    startExport(async () => {
      try {
        const logs = await exportEmailLogs(filters);
        downloadCsv(
          `email-logs-${typeFilter}.csv`,
          [
            "sent_at",
            "email_type",
            "campaign_name",
            "recipient_email",
            "company_name",
            "subject",
            "certificate_count",
            "status",
            "error_message",
            "smtp_message_id",
          ],
          logs.map((log) => [
            log.sent_at,
            log.email_type,
            log.campaign_name,
            log.recipient_email,
            log.company_name,
            log.subject,
            log.certificate_count,
            log.status,
            log.error_message,
            log.smtp_message_id,
          ])
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to export logs"
        );
      }
    });
  }

  const columns: ColumnDef<EmailLogEntry>[] = [
    {
      accessorKey: "sent_at",
      header: "Sent at",
      cell: ({ row }) => formatDateTime(row.original.sent_at),
    },
    {
      accessorKey: "email_type",
      header: "Type",
      cell: ({ row }) => emailTypeLabel(row.original.email_type),
    },
    {
      accessorKey: "campaign_name",
      header: "Campaign",
      cell: ({ row }) => {
        const href = campaignHref(row.original);
        if (!row.original.campaign_name) return "—";
        if (!href) return row.original.campaign_name;
        return (
          <Link href={href} className="hover:underline">
            {row.original.campaign_name}
          </Link>
        );
      },
    },
    {
      accessorKey: "recipient_email",
      header: "Recipient",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.recipient_email}</span>
      ),
    },
    {
      accessorKey: "company_name",
      header: "Company",
      cell: ({ row }) => row.original.company_name ?? "—",
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <span className="max-w-[220px] truncate">{row.original.subject}</span>
      ),
    },
    {
      accessorKey: "certificate_count",
      header: "Certs",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <EmailStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "error_message",
      header: "Error",
      cell: ({ row }) => (
        <span className="max-w-[180px] truncate text-destructive">
          {row.original.error_message ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total logged</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Successful</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.sent}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {stats.failed}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success rate</CardDescription>
            <CardTitle className="text-3xl">{stats.successRate}%</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Based on sent + failed attempts
          </CardContent>
        </Card>
      </div>

      <Tabs value={typeFilter} onValueChange={handleTabChange}>
        <TabsList>
          {TYPE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-5"
      >
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              updateParams({ status: value === "all" ? null : value, page: null })
            }
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="from">From date</Label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={fromFilter}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="to">To date</Label>
          <Input id="to" name="to" type="date" defaultValue={toFilter} />
        </div>

        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="recipient">Recipient search</Label>
          <div className="flex gap-2">
            <Input
              id="recipient"
              name="recipient"
              defaultValue={recipientFilter}
              placeholder="Search by email address"
            />
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {result.total} log entr{result.total === 1 ? "y" : "ies"}
          {result.totalPages > 1
            ? ` · Page ${result.page} of ${result.totalPages}`
            : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exportPending || result.total === 0}
        >
          <Download className="h-4 w-4" />
          {exportPending ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={result.logs}
        emptyMessage="No email logs match your filters."
      />

      {result.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={result.page <= 1}
            onClick={() =>
              updateParams({ page: String(Math.max(1, result.page - 1)) })
            }
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={result.page >= result.totalPages}
            onClick={() =>
              updateParams({ page: String(result.page + 1) })
            }
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
