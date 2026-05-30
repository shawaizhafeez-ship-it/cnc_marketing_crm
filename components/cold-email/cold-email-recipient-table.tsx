"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { EmailStatusBadge } from "@/components/renewals/campaign-status-badge";
import { DataTable } from "@/components/ui/data-table";
import type { ColdEmailRecipientRow } from "@/app/(dashboard)/marketing/cold-email/actions";

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

const columns: ColumnDef<ColdEmailRecipientRow>[] = [
  {
    accessorKey: "recipient_email",
    header: "Email",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.recipient_email}</span>
    ),
  },
  {
    accessorKey: "company_name",
    header: "Company",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <EmailStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "sent_at",
    header: "Sent at",
    cell: ({ row }) => formatDateTime(row.original.sent_at),
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

type ColdEmailRecipientTableProps = {
  recipients: ColdEmailRecipientRow[];
};

export function ColdEmailRecipientTable({
  recipients,
}: ColdEmailRecipientTableProps) {
  return (
    <DataTable
      columns={columns}
      data={recipients}
      emptyMessage="No recipients in this batch."
    />
  );
}
