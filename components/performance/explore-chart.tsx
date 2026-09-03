"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MonthPerformance, MonthLeads } from "@/app/(dashboard)/performance/actions";

type Props = {
  data: MonthPerformance[];
  leadsData: MonthLeads[];
};

const METRICS = [
  { key: "expired",         label: "Expired Certificates",  source: "renewal" },
  { key: "renewed",         label: "Renewed Certificates",  source: "renewal" },
  { key: "rate",            label: "Renewal Rate %",        source: "renewal" },
  { key: "potentialAmount", label: "Potential Revenue",     source: "renewal" },
  { key: "collectedAmount", label: "Collected Revenue",     source: "renewal" },
  { key: "total",           label: "Total Leads",           source: "leads"   },
  { key: "closed",          label: "Closed Leads",          source: "leads"   },
  { key: "leadsRate",       label: "Leads Conversion %",    source: "leads"   },
] as const;

type MetricKey = typeof METRICS[number]["key"];

const BREAKDOWNS = [
  { key: "none", label: "None (overall)" },
  { key: "item", label: "By Item Type"   },
] as const;

type BreakdownKey = typeof BREAKDOWNS[number]["key"];

const COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316","#a855f7",
];

const SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function currentMonthLabel() {
  const d = new Date();
  return SHORT[d.getMonth()] + " " + d.getFullYear();
}

function fmtTick(v: number, isAmount: boolean, isPercent: boolean) {
  if (isPercent) return `${v}%`;
  if (isAmount) {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(0) + "k";
  }
  return String(v);
}

export function ExploreChart({ data, leadsData }: Props) {
  const [metric, setMetric]         = useState<MetricKey>("expired");
  const [breakdown, setBreakdown]   = useState<BreakdownKey>("none");
  const [hidden, setHidden]         = useState<Set<string>>(new Set());

  function toggleSeries(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  const selectedMetric = METRICS.find((m) => m.key === metric)!;
  const isAmount  = metric === "potentialAmount" || metric === "collectedAmount";
  const isPercent = metric === "rate" || metric === "leadsRate";
  const isLeads   = selectedMetric.source === "leads";
  const effectiveBreakdown = breakdown;

  // Sorted list of all months (labels) from the data
  const monthLabels = isLeads
    ? leadsData.map((m) => m.label)
    : data.map((m) => m.label);

  // Compute series: { seriesKey → Map<monthLabel, value> }
  const { seriesKeys, rows } = useMemo(() => {
    if (isLeads) {
      if (effectiveBreakdown === "none") {
        const rows = leadsData.map((m) => ({
          label: m.label,
          Overall: metric === "leadsRate" ? m.rate : metric === "total" ? m.total : m.closed,
        }));
        return { seriesKeys: ["Overall"], rows };
      }

      // By item for leads — use byItem map
      const itemSet = new Set<string>();
      for (const m of leadsData) Object.keys(m.byItem).forEach((k) => itemSet.add(k));
      const items = Array.from(itemSet).sort();

      const rows = leadsData.map((m) => {
        const row: Record<string, number | string> = { label: m.label };
        for (const item of items) {
          const entry = m.byItem[item] ?? { total: 0, closed: 0 };
          if (metric === "total")     row[item] = entry.total;
          else if (metric === "closed") row[item] = entry.closed;
          else if (metric === "leadsRate") row[item] = entry.total > 0 ? Math.round((entry.closed / entry.total) * 100) : 0;
        }
        return row;
      });
      return { seriesKeys: items, rows };
    }

    if (effectiveBreakdown === "none") {
      const rows = data.map((m) => ({
        label: m.label,
        Overall: m[metric as keyof MonthPerformance] as number,
      }));
      return { seriesKeys: ["Overall"], rows };
    }

    // By item — build per-month per-item values
    const itemSet = new Set<string>();
    for (const month of data) {
      for (const cert of month.certs) itemSet.add(cert.item || "Unknown");
    }
    const items = Array.from(itemSet).sort();

    const rows = data.map((month) => {
      const row: Record<string, number | string> = { label: month.label };

      for (const item of items) {
        const certs = month.certs.filter((c) => (c.item || "Unknown") === item);
        if (metric === "expired")         row[item] = certs.length;
        else if (metric === "renewed")    row[item] = certs.filter((c) => c.renewed).length;
        else if (metric === "rate") {
          const total = certs.length;
          const ren   = certs.filter((c) => c.renewed).length;
          row[item] = total > 0 ? Math.round((ren / total) * 100) : 0;
        } else if (metric === "potentialAmount") {
          row[item] = certs.reduce((s, c) => s + c.renewalAmount, 0);
        } else if (metric === "collectedAmount") {
          row[item] = certs.filter((c) => c.renewed).reduce((s, c) => s + c.renewalAmount, 0);
        }
      }
      return row;
    });

    return { seriesKeys: items, rows };
  }, [data, leadsData, metric, effectiveBreakdown, isLeads, monthLabels]);

  const nowLabel = currentMonthLabel();

  return (
    <div>
      {/* Controls */}
      <div className="mb-5 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Metric</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Break down lines by</label>
          <select
            value={effectiveBreakdown}
            onChange={(e) => setBreakdown(e.target.value as BreakdownKey)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {BREAKDOWNS.map((b) => (
              <option key={b.key} value={b.key}>{b.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clickable legend */}
      {seriesKeys.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {seriesKeys.map((key, i) => {
            const color = COLORS[i % COLORS.length];
            const isHidden = hidden.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleSeries(key)}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity"
                style={{
                  borderColor: color,
                  color: isHidden ? "hsl(var(--muted-foreground))" : color,
                  opacity: isHidden ? 0.45 : 1,
                  backgroundColor: isHidden ? "transparent" : `${color}18`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isHidden ? "hsl(var(--muted-foreground))" : color }}
                />
                {key}
              </button>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={rows} margin={{ top: 16, right: 20, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={70}
          />
          <YAxis
            tickFormatter={(v) => fmtTick(v as number, isAmount, isPercent)}
            domain={isPercent ? [0, 100] : undefined}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            width={isAmount ? 52 : 40}
          />
          <Tooltip
            formatter={(v, name) => [
              isAmount
                ? (v as number).toLocaleString()
                : isPercent
                ? `${v}%`
                : v,
              name,
            ]}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine
            x={nowLabel}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 3"
            label={{ value: "Now", position: "top", fontSize: 11, fill: "#f59e0b", fontWeight: 600 }}
          />
          {seriesKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
              activeDot={{ r: 5 }}
              hide={hidden.has(key)}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
