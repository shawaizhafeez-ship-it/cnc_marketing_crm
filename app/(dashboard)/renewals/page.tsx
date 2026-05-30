import { PageHeader } from "@/components/shared/page-header";
import { RenewalsFilter } from "@/components/renewals/renewals-filter";
import { RenewalSendPanel } from "@/components/renewals/renewal-send-panel";
import { RenewalsTable } from "@/components/renewals/renewals-table";
import { getRenewalData, getRenewalPeriodOptions } from "@/app/(dashboard)/renewals/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RenewalsPageProps = {
  searchParams: Promise<{ month?: string; year?: string }>;
};

function getDefaultPeriod(options: { months: number[]; years: number[] }) {
  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();

  if (options.months.includes(10)) month = 10;
  if (options.years.includes(2025)) year = 2025;
  else if (options.years.length > 0) year = options.years[options.years.length - 1];

  return { month, year };
}

export default async function RenewalsPage({ searchParams }: RenewalsPageProps) {
  const params = await searchParams;

  try {
    const options = await getRenewalPeriodOptions();
    const defaults = getDefaultPeriod(options);

    const month = params.month
      ? Number.parseInt(params.month, 10)
      : defaults.month;
    const year = params.year
      ? Number.parseInt(params.year, 10)
      : defaults.year;

    const resolvedMonth = Number.isNaN(month) ? defaults.month : month;
    const resolvedYear = Number.isNaN(year) ? defaults.year : year;

    const data = await getRenewalData(resolvedMonth, resolvedYear);
    const emailGroups = Object.values(data.emailData);
    const periodLabel = new Date(resolvedYear, resolvedMonth - 1, 1).toLocaleString(
      "en-US",
      { month: "long", year: "numeric" }
    );

    return (
      <>
        <PageHeader
          title="Send Renewal Emails"
          description="Filter certificates by expiry month and send grouped renewal emails."
        />

        <div className="space-y-6">
          <RenewalsFilter
            month={resolvedMonth}
            year={resolvedYear}
            availableMonths={data.options.months}
            availableYears={data.options.years}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total certificates"
              value={String(data.stats.totalCertificates)}
            />
            <MetricCard
              label="Unique companies"
              value={String(data.stats.uniqueCompanies)}
            />
            <MetricCard
              label="Email recipients"
              value={String(data.stats.uniqueEmails)}
            />
            <MetricCard
              label="Total renewal amount"
              value={`Rs. ${data.stats.totalRenewalAmount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}k`}
            />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">
              Certificates expiring in {periodLabel}
            </h2>
            <RenewalsTable certificates={data.certificates} />
          </div>

          {emailGroups.length > 0 && (
            <RenewalSendPanel
              month={resolvedMonth}
              year={resolvedYear}
              emailGroups={emailGroups}
              stats={data.stats}
            />
          )}
        </div>
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader
          title="Send Renewal Emails"
          description="Filter certificates by expiry month and send grouped renewal emails."
        />
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "Failed to load renewal data. Sync Google Sheets from Settings first."}
        </div>
      </>
    );
  }
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
