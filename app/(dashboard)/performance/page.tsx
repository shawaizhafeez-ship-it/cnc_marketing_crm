import { PageHeader } from "@/components/shared/page-header";
import { RenewalChart } from "@/components/performance/renewal-chart";
import { RevenueChart } from "@/components/performance/revenue-chart";
import { LeadsChart } from "@/components/performance/leads-chart";
import { BreakdownTable } from "@/components/performance/breakdown-table";
import { getOperationPerformance, getLeadsPerformance } from "@/app/(dashboard)/performance/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PerformancePage() {
  let data: Awaited<ReturnType<typeof getOperationPerformance>> = [];
  let leadsData: Awaited<ReturnType<typeof getLeadsPerformance>> = [];
  let error: string | null = null;

  try {
    [data, leadsData] = await Promise.all([getOperationPerformance(), getLeadsPerformance()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load performance data";
  }

  const lastMonth = data[data.length - 1];

  return (
    <>
      <PageHeader
        title="Operation Performance"
        description="Certificate expiry vs renewal tracking by month."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Expiry vs Renewal by Month</CardTitle>
          <CardDescription>
            Green line = renewal rate % (left axis). Dashed gray line = total expired that month (right axis).
            {lastMonth && (
              <span className="ml-1">
                Latest month: <strong>{lastMonth.label}</strong> — {lastMonth.expired} expired, {lastMonth.renewed} renewed ({lastMonth.rate}%).
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No data available.</p>
          ) : (
            <RenewalChart data={data} />
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Potential Renewal Revenue by Month</CardTitle>
          <CardDescription>
            Sum of Renewal Amount for all certificates expiring each month. Represents revenue if all certificates in that month renew.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No data available.</p>
          ) : (
            <RevenueChart data={data} />
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Leads Performance by Month</CardTitle>
          <CardDescription>
            Gray bars = total leads. Green line = conversion rate %. Excludes Type=&quot;Renewal&quot; rows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leadsData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No leads data available.</p>
          ) : (
            <LeadsChart data={leadsData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>All months with certificate expirations</CardDescription>
        </CardHeader>
        <CardContent>
          <BreakdownTable data={data} />
        </CardContent>
      </Card>
    </>
  );
}
