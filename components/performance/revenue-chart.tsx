"use client";

import {
  BarChart,
  Bar,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

const SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function currentMonthLabel() {
  const d = new Date();
  return SHORT[d.getMonth()] + " " + d.getFullYear();
}
import type { MonthPerformance } from "@/app/(dashboard)/performance/actions";

type Props = {
  data: MonthPerformance[];
};

function fmt(v: number) {
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return v > 0 ? String(v) : "";
}

function CustomTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: { dataKey: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const potential = payload.find((p) => p.dataKey === "potentialAmount")?.value ?? 0;
  const collected = payload.find((p) => p.dataKey === "collectedAmount")?.value ?? 0;
  const gap = potential - collected;
  const pct = potential > 0 ? Math.round((collected / potential) * 100) : 0;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-blue-500">Potential</span>
          <span className="font-medium">{potential.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-emerald-600 dark:text-emerald-400">Collected</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{collected.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6 border-t pt-1">
          <span className="text-muted-foreground">Gap</span>
          <span className="font-medium text-rose-500">{gap.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Collection Rate</span>
          <span className={`font-bold ${pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-500" : "text-rose-500"}`}>
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function RevenueChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ top: 28, right: 20, left: 10, bottom: 60 }} barCategoryGap="30%" barGap={3}>
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
          tickFormatter={(v) => fmt(v as number)}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          width={44}
        />
        <ReferenceLine
          x={currentMonthLabel()}
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 3"
          label={{ value: "Now", position: "top", fontSize: 11, fill: "#f59e0b", fontWeight: 600 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) => value === "potentialAmount" ? "Potential" : "Collected"}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="potentialAmount" name="potentialAmount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="potentialAmount"
            position="top"
            formatter={(v: unknown) => fmt(v as number)}
            style={{ fontSize: 10, fill: "#3b82f6", fontWeight: 600 }}
          />
        </Bar>
        <Bar dataKey="collectedAmount" name="collectedAmount" fill="#10b981" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="collectedAmount"
            position="top"
            formatter={(v: unknown) => fmt(v as number)}
            style={{ fontSize: 10, fill: "#10b981", fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
