"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { EmailStatusBadge } from "@/components/renewals/campaign-status-badge";
import { DataTable } from "@/components/ui/data-table";
import type { ColdEmailBatchSummary } from "@/app/(dashboard)/marketing/cold-email/actions";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const columns: ColumnDef<ColdEmailBatchSummary>[] = [
  {
    accessorKey: "name",
    header: "Batch",
    cell: ({ row }) => (
      <Link
        href={`/marketing/cold-email/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <EmailStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "total_recipients",
    header: "Recipients",
  },
  {
    accessorKey: "emails_sent",
    header: "Sent",
  },
  {
    accessorKey: "emails_failed",
    header: "Failed",
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];

type ColdEmailBatchListProps = {
  batches: ColdEmailBatchSummary[];
};

export function ColdEmailBatchList({ batches }: ColdEmailBatchListProps) {
  return (
    <DataTable
      columns={columns}
      data={batches}
      emptyMessage="No cold email batches yet."
    />
  );
}
