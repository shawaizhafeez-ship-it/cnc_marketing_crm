import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { CreateCampaignForm } from "@/components/renewals/create-campaign-form";
import { getRenewalCampaignPreview } from "@/app/(dashboard)/renewals/campaigns/actions";
import { Button } from "@/components/ui/button";

export default async function NewRenewalCampaignPage() {
  const now = new Date();
  let defaultMonth = now.getMonth() + 1;
  let defaultYear = now.getFullYear();
  let availableMonths: number[] = [];
  let availableYears: number[] = [];

  try {
    const preview = await getRenewalCampaignPreview(defaultMonth, defaultYear);
    availableMonths = preview.options.months;
    availableYears = preview.options.years;

    if (availableMonths.includes(10)) defaultMonth = 10;
    if (availableYears.includes(2025)) defaultYear = 2025;
    else if (availableYears.length > 0) {
      defaultYear = availableYears[availableYears.length - 1];
    }
  } catch {
    // Use calendar defaults if no certificate data yet
  }

  return (
    <>
      <PageHeader
        title="Create Renewal Campaign"
        description="Schedule automated month-anchor renewal emails for all certificates expiring in a selected month."
      />

      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/renewals/campaigns">Back to campaigns</Link>
        </Button>
      </div>

      <CreateCampaignForm
        defaultMonth={defaultMonth}
        defaultYear={defaultYear}
        availableMonths={availableMonths}
        availableYears={availableYears}
      />
    </>
  );
}
