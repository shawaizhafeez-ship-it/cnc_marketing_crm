"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import {
  EmailStatusBadge,
} from "@/components/renewals/campaign-status-badge";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/csv/download-csv";
import type {
  EmailLogRow,
  ScheduledEmailRow,
  TouchpointPreview,
} from "@/lib/renewals/campaign-types";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDateTime(iso: string | null, withTime = true) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short", timeZone: "UTC" } : {}),
  });
}

type CampaignScheduledEmailsTableProps = {
  campaignName: string;
  emails: ScheduledEmailRow[];
};

export function CampaignScheduledEmailsTable({
  campaignName,
  emails,
}: CampaignScheduledEmailsTableProps) {
  const [touchpointFilter, setTouchpointFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      if (
        touchpointFilter !== "all" &&
        email.touchpoint_number !== Number.parseInt(touchpointFilter, 10)
      ) {
        return false;
      }
      if (statusFilter !== "all" && email.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [emails, touchpointFilter, statusFilter]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(emails.map((e) => e.status));
    return Array.from(statuses).sort();
  }, [emails]);

  const columns: ColumnDef<ScheduledEmailRow>[] = [
    {
      accessorKey: "touchpoint_number",
      header: "TP",
      cell: ({ row }) => `TP${row.original.touchpoint_number}`,
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
    },
    {
      id: "cert_count",
      header: "Certs",
      cell: ({ row }) => row.original.certificate_ids?.length ?? 0,
    },
    {
      accessorKey: "scheduled_at",
      header: "Scheduled (UTC)",
      cell: ({ row }) => formatDateTime(row.original.scheduled_at),
    },
    {
      accessorKey: "sent_at",
      header: "Sent (UTC)",
      cell: ({ row }) => formatDateTime(row.original.sent_at),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <EmailStatusBadge status={row.original.status} />,
    },
  ];

  function exportCsv() {
    downloadCsv(
      `${campaignName.replace(/\s+/g, "-").toLowerCase()}-scheduled-emails.csv`,
      [
        "touchpoint",
        "recipient_email",
        "company_name",
        "certificate_count",
        "scheduled_at",
        "sent_at",
        "status",
        "error_message",
      ],
      filteredEmails.map((email) => [
        email.touchpoint_number,
        email.recipient_email,
        email.company_name,
        email.certificate_ids?.length ?? 0,
        email.scheduled_at,
        email.sent_at,
        email.status,
        email.error_message,
      ])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={touchpointFilter} onValueChange={setTouchpointFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Touchpoint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All touchpoints</SelectItem>
            <SelectItem value="1">Touchpoint 1</SelectItem>
            <SelectItem value="2">Touchpoint 2</SelectItem>
            <SelectItem value="3">Touchpoint 3</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground">
          {filteredEmails.length} of {emails.length} rows
        </p>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={exportCsv}
          disabled={filteredEmails.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredEmails}
        emptyMessage="No scheduled emails match the selected filters."
      />
    </div>
  );
}

type CampaignLogsTableProps = {
  campaignName: string;
  logs: EmailLogRow[];
};

export function CampaignLogsTable({
  campaignName,
  logs,
}: CampaignLogsTableProps) {
  const columns: ColumnDef<EmailLogRow>[] = [
    {
      accessorKey: "sent_at",
      header: "Sent at",
      cell: ({ row }) => formatDateTime(row.original.sent_at),
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
        <span className="max-w-[200px] truncate text-destructive">
          {row.original.error_message ?? "—"}
        </span>
      ),
    },
  ];

  function exportCsv() {
    downloadCsv(
      `${campaignName.replace(/\s+/g, "-").toLowerCase()}-email-logs.csv`,
      [
        "sent_at",
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
        log.recipient_email,
        log.company_name,
        log.subject,
        log.certificate_count,
        log.status,
        log.error_message,
        log.smtp_message_id,
      ])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {logs.length} log entr{logs.length === 1 ? "y" : "ies"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={logs.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        emptyMessage="No email logs for this campaign yet."
      />
    </div>
  );
}

type CampaignOverviewProps = {
  touchpoints: TouchpointPreview[];
  anchorDate: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export function CampaignOverview({
  touchpoints,
  anchorDate,
  createdAt,
  startedAt,
  completedAt,
}: CampaignOverviewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Touchpoint schedule</CardTitle>
          <CardDescription>Anchor date: {anchorDate}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {touchpoints.map((tp) => (
            <div
              key={tp.touchpointNumber}
              className={cn(
                "rounded-md border p-3 text-sm",
                tp.isPast && "opacity-60"
              )}
            >
              <p className="font-medium">Touchpoint {tp.touchpointNumber}</p>
              <p className="text-muted-foreground">
                {formatDateTime(tp.scheduledAt)} UTC
              </p>
              {tp.isPast && (
                <p className="text-xs text-muted-foreground">
                  Past — skipped at creation if no rows scheduled
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <TimelineRow label="Created" value={formatDateTime(createdAt)} />
          <TimelineRow
            label="Started"
            value={formatDateTime(startedAt)}
          />
          <TimelineRow
            label="Completed"
            value={formatDateTime(completedAt)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

type CampaignDetailTabsProps = {
  campaignName: string;
  defaultTab: string;
  touchpoints: TouchpointPreview[];
  anchorDate: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  scheduledEmails: ScheduledEmailRow[];
  logs: EmailLogRow[];
};

export function CampaignDetailTabs({
  campaignName,
  defaultTab,
  touchpoints,
  anchorDate,
  createdAt,
  startedAt,
  completedAt,
  scheduledEmails,
  logs,
}: CampaignDetailTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="scheduled">
          Scheduled Emails
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
            {scheduledEmails.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="logs">
          Logs
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
            {logs.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <CampaignOverview
          touchpoints={touchpoints}
          anchorDate={anchorDate}
          createdAt={createdAt}
          startedAt={startedAt}
          completedAt={completedAt}
        />
      </TabsContent>

      <TabsContent value="scheduled" className="mt-6">
        <CampaignScheduledEmailsTable
          campaignName={campaignName}
          emails={scheduledEmails}
        />
      </TabsContent>

      <TabsContent value="logs" className="mt-6">
        <CampaignLogsTable campaignName={campaignName} logs={logs} />
      </TabsContent>
    </Tabs>
  );
}
