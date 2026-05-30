"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, FileSearch } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatExpiryDisplay } from "@/lib/renewals/prepare-email-data";
import type { CertificateRow } from "@/lib/renewals/types";
import { cn } from "@/lib/utils";

type SortKey =
  | "company_name"
  | "certificate_no"
  | "item"
  | "expiry_date"
  | "recipient_email"
  | "renewal_amount"
  | "ops_status";

type SortDirection = "asc" | "desc";

type RenewalsTableProps = {
  certificates: CertificateRow[];
};

export function RenewalsTable({ certificates }: RenewalsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("expiry_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sorted = useMemo(() => {
    const copy = [...certificates];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      let cmp = 0;

      if (sortKey === "renewal_amount") {
        cmp = (a.renewal_amount ?? 0) - (b.renewal_amount ?? 0);
      } else {
        cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [certificates, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) {
      return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
    );
  }

  if (certificates.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No active certificates found for the selected expiry period.
      </p>
    );
  }

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "company_name", label: "Company" },
    { key: "certificate_no", label: "Certificate No." },
    { key: "item", label: "Item" },
    { key: "expiry_date", label: "Expiry" },
    { key: "recipient_email", label: "Email" },
    { key: "renewal_amount", label: "Amount (Rs. k)", className: "text-right" },
    { key: "ops_status", label: "Ops Status" },
  ];

  if (certificates.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No certificates for this period"
        description="Sync Google Sheets from Settings, or choose a different expiry month."
        action={
          <Button variant="outline" asChild>
            <Link href="/settings">Go to Settings</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left font-medium text-muted-foreground",
                  col.className
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className="inline-flex items-center hover:text-foreground"
                >
                  {col.label}
                  <SortIcon column={col.key} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((cert) => (
            <tr key={cert.id} className="border-t hover:bg-muted/30">
              <td className="px-4 py-2.5">{cert.company_name}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{cert.certificate_no}</td>
              <td className="px-4 py-2.5">{cert.item ?? "—"}</td>
              <td className="px-4 py-2.5">{formatExpiryDisplay(cert.expiry_date)}</td>
              <td className="px-4 py-2.5">{cert.recipient_email}</td>
              <td className="px-4 py-2.5 text-right">
                {cert.renewal_amount != null
                  ? cert.renewal_amount.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })
                  : "—"}
              </td>
              <td className="px-4 py-2.5">{cert.ops_status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
