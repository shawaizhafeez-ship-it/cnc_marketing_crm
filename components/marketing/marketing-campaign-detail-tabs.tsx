"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { EmailStatusBadge } from "@/components/renewals/campaign-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SCHEDULE_TYPE_LABELS,
  type MarketingScheduledEmailRow,
  type MarketingTouchpointRow,
} from "@/lib/marketing/campaign-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

type MarketingCampaignDetailTabsProps = {
  defaultTab: string;
  filtersApplied: Record<string, unknown>;
  touchpoints: MarketingTouchpointRow[];
  scheduledEmails: MarketingScheduledEmailRow[];
};

export function MarketingCampaignDetailTabs({
  defaultTab,
  filtersApplied,
  touchpoints,
  scheduledEmails,
}: MarketingCampaignDetailTabsProps) {
  const [touchpointFilter, setTouchpointFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredEmails = useMemo(() => {
    return scheduledEmails.filter((email) => {
      const touchpoint = touchpoints.find((tp) => tp.id === email.touchpoint_id);
      if (
        touchpointFilter !== "all" &&
        touchpoint?.touchpoint_number !== Number.parseInt(touchpointFilter, 10)
      ) {
        return false;
      }
      if (statusFilter !== "all" && email.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [scheduledEmails, touchpoints, touchpointFilter, statusFilter]);

  const statusOptions = useMemo(
    () => Array.from(new Set(scheduledEmails.map((email) => email.status))).sort(),
    [scheduledEmails]
  );

  const emailColumns: ColumnDef<MarketingScheduledEmailRow>[] = [
    {
      id: "touchpoint",
      header: "TP",
      cell: ({ row }) => {
        const touchpoint = touchpoints.find(
          (tp) => tp.id === row.original.touchpoint_id
        );
        return touchpoint ? `TP${touchpoint.touchpoint_number}` : "—";
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
    },
    {
      id: "cert_count",
      header: "Certs",
      cell: ({ row }) => row.original.certificate_ids?.length ?? 0,
    },
    {
      accessorKey: "rendered_subject",
      header: "Subject",
      cell: ({ row }) => (
        <span className="max-w-[220px] truncate">{row.original.rendered_subject}</span>
      ),
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

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="touchpoints">
          Touchpoints
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
            {touchpoints.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="scheduled">
          Scheduled Emails
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
            {scheduledEmails.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters applied</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs">
              {JSON.stringify(filtersApplied, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="touchpoints" className="mt-6">
        <div className="grid gap-4 md:grid-cols-2">
          {touchpoints.map((touchpoint) => (
            <Card key={touchpoint.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Touchpoint {touchpoint.touchpoint_number}
                </CardTitle>
                <CardDescription>
                  {SCHEDULE_TYPE_LABELS[touchpoint.schedule_type]}
                  {touchpoint.schedule_type === "custom_days"
                    ? ` · every ${touchpoint.schedule_value} days`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delay days</span>
                  <span>{touchpoint.delay_days}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template</span>
                  <span className="font-mono text-xs">{touchpoint.template_id.slice(0, 8)}…</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active</span>
                  <span>{touchpoint.is_active ? "Yes" : "No"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="scheduled" className="mt-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select value={touchpointFilter} onValueChange={setTouchpointFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Touchpoint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All touchpoints</SelectItem>
              {touchpoints.map((touchpoint) => (
                <SelectItem
                  key={touchpoint.id}
                  value={String(touchpoint.touchpoint_number)}
                >
                  Touchpoint {touchpoint.touchpoint_number}
                </SelectItem>
              ))}
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
            {filteredEmails.length} of {scheduledEmails.length} rows
          </p>
        </div>

        <DataTable
          columns={emailColumns}
          data={filteredEmails}
          emptyMessage="No scheduled emails match the selected filters."
        />
      </TabsContent>
    </Tabs>
  );
}
