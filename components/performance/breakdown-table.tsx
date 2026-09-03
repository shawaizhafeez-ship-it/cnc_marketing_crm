"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import type { MonthPerformance } from "@/app/(dashboard)/performance/actions";

type Props = {
  data: MonthPerformance[];
};

export function BreakdownTable({ data }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-2 w-6" />
            <th className="pb-2 pr-4 font-medium">Month</th>
            <th className="pb-2 pr-4 font-medium text-right">Expired</th>
            <th className="pb-2 pr-4 font-medium text-right text-emerald-600">Renewed</th>
            <th className="pb-2 pr-4 font-medium text-right text-rose-500">Not Renewed</th>
            <th className="pb-2 pr-4 font-medium text-right text-indigo-600">Potential</th>
            <th className="pb-2 pr-4 font-medium text-right text-emerald-600">Collected</th>
            <th className="pb-2 font-medium text-right">Rate</th>
          </tr>
        </thead>
        <tbody>
          {[...data].reverse().map((row) => {
            const isOpen = expanded.has(row.monthKey);
            return (
              <>
                <tr
                  key={row.monthKey}
                  className="border-b hover:bg-muted/30 cursor-pointer"
                  onClick={() => toggle(row.monthKey)}
                >
                  <td className="py-2 pr-2 text-muted-foreground">
                    {isOpen
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />}
                  </td>
                  <td className="py-2 pr-4 font-medium">{row.label}</td>
                  <td className="py-2 pr-4 text-right">{row.expired}</td>
                  <td className="py-2 pr-4 text-right text-emerald-600 dark:text-emerald-400">{row.renewed}</td>
                  <td className="py-2 pr-4 text-right text-rose-500">{row.notRenewed}</td>
                  <td className="py-2 pr-4 text-right text-indigo-600 dark:text-indigo-400">{row.potentialAmount.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right text-emerald-600 dark:text-emerald-400">{row.collectedAmount.toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <span className={`font-semibold ${
                      row.rate >= 70 ? "text-emerald-600 dark:text-emerald-400"
                      : row.rate >= 40 ? "text-amber-500"
                      : "text-rose-500"
                    }`}>
                      {row.rate}%
                    </span>
                  </td>
                </tr>

                {isOpen && (
                  <tr key={row.monthKey + "-detail"} className="border-b bg-muted/20">
                    <td colSpan={8} className="px-4 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border/50">
                            <th className="pb-1.5 pr-4 font-medium">Certificate No.</th>
                            <th className="pb-1.5 pr-4 font-medium">Company</th>
                            <th className="pb-1.5 pr-4 font-medium">Contact Person</th>
                            <th className="pb-1.5 pr-4 font-medium">Expiry</th>
                            <th className="pb-1.5 pr-4 font-medium text-right">Renewal Amt</th>
                            <th className="pb-1.5 font-medium text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.certs.map((cert) => (
                            <tr key={cert.certNo} className="border-b border-border/30 last:border-0">
                              <td className="py-1.5 pr-4 font-mono">{cert.certNo}</td>
                              <td className="py-1.5 pr-4">{cert.company}</td>
                              <td className="py-1.5 pr-4 text-muted-foreground">{cert.contactPerson || "—"}</td>
                              <td className="py-1.5 pr-4 text-muted-foreground">{cert.expiry}</td>
                              <td className="py-1.5 pr-4 text-right">{cert.renewalAmount.toLocaleString()}</td>
                              <td className="py-1.5 text-right">
                                {cert.renewed ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Renewed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                                    <XCircle className="h-3.5 w-3.5" /> Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
