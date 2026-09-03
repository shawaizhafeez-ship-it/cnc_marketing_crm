"use client";

import {
  ComposedChart,
  Bar,
  Line,
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
import type { MonthLeads } from "@/app/(dashboard)/performance/actions";

type Props = {
  data: MonthLeads[];
};

export function LeadsChart({ data }: Props) {
  const dataByLabel = new Map(data.map((d) => [d.label, d]));

  function CustomTooltip({ active, label }: any) {
    if (!active || !label) return null;
    const row = dataByLabel.get(label);
    if (!row) return null;
    const { total, closed, open, rate } = row;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Total Leads</span>
            <span className="font-medium">{total}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-emerald-600 dark:text-emerald-400">Closed (Paid)</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{closed}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-amber-500">Open</span>
            <span className="font-medium text-amber-500">{open}</span>
          </div>
          <div className="border-t pt-1 mt-1 flex justify-between gap-6">
            <span className="text-muted-foreground">Conversion Rate</span>
            <span className={`font-bold ${rate >= 70 ? "text-emerald-600" : rate >= 40 ? "text-amber-500" : "text-rose-500"}`}>
              {rate}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={data} margin={{ top: 24, right: 40, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          angle={-45}
          textAnchor="end"
          interval={0}
          height={70}
        />
        {/* Left axis — conversion rate % */}
        <YAxis
          yAxisId="rate"
          orientation="left"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          width={44}
          label={{ value: "Conversion Rate %", angle: -90, position: "insideLeft", offset: 12, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
        />
        {/* Right axis — total leads count */}
        <YAxis
          yAxisId="count"
          orientation="right"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          width={40}
          label={{ value: "Total Leads", angle: 90, position: "insideRight", offset: 12, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
        />
        <ReferenceLine
          x={currentMonthLabel()}
          yAxisId="rate"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 3"
          label={{ value: "Now", position: "top", fontSize: 11, fill: "#f59e0b", fontWeight: 600 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) =>
            value === "rate" ? "Conversion Rate %" : "Total Leads"
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        {/* Conversion rate % — left axis, solid green */}
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="rate"
          name="rate"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#10b981" }}
          activeDot={{ r: 6 }}
        >
          <LabelList
            dataKey="rate"
            position="top"
            formatter={(v: unknown) => `${Math.round(v as number)}%`}
            style={{ fontSize: 10, fill: "#10b981", fontWeight: 600 }}
          />
        </Line>
        {/* Total leads — right axis, bars */}
        <Bar
          yAxisId="count"
          dataKey="total"
          name="total"
          fill="#94a3b8"
          radius={[4, 4, 0, 0]}
          opacity={0.7}
        >
          <LabelList
            dataKey="total"
            position="top"
            formatter={(v: unknown) => (v as number) > 0 ? String(v) : ""}
            style={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
          />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
