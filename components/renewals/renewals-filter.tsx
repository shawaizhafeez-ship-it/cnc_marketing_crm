"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type RenewalsFilterProps = {
  month: number;
  year: number;
  availableMonths: number[];
  availableYears: number[];
};

export function RenewalsFilter({
  month,
  year,
  availableMonths,
  availableYears,
}: RenewalsFilterProps) {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedMonth = formData.get("month");
    const selectedYear = formData.get("year");
    router.push(`/renewals?month=${selectedMonth}&year=${selectedYear}`);
  }

  const months =
    availableMonths.length > 0 ? availableMonths : Array.from({ length: 12 }, (_, i) => i + 1);
  const years =
    availableYears.length > 0
      ? availableYears
      : [new Date().getFullYear(), new Date().getFullYear() + 1];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Expiry period
        </CardTitle>
        <CardDescription>
          Filter active certificates (ops_status ≠ done) by expiry month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <select
              id="month"
              name="month"
              defaultValue={month}
              className="flex h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {MONTH_NAMES[m - 1]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <select
              id="year"
              name="year"
              defaultValue={year}
              className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit">Filter certificates</Button>
        </form>
      </CardContent>
    </Card>
  );
}
