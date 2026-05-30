import Link from "next/link";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MarketingDailyWidget } from "@/components/dashboard/marketing-daily-widget";
import { ColdEmailBatchList } from "@/components/cold-email/cold-email-batch-list";
import { ColdEmailUploadForm } from "@/components/cold-email/cold-email-upload-form";
import { SendColdEmailButton } from "@/components/cold-email/send-cold-email-button";
import { getDashboardData } from "@/app/(dashboard)/dashboard/actions";
import { listColdEmailBatches } from "@/app/(dashboard)/marketing/cold-email/actions";

export default async function ColdEmailPage() {
  let batches: Awaited<ReturnType<typeof listColdEmailBatches>> = [];
  let pageData: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let error: string | null = null;

  try {
    [batches, pageData] = await Promise.all([
      listColdEmailBatches(),
      getDashboardData(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load cold email batches";
  }

  return (
    <>
      <PageHeader
        title="Cold Email"
        description="Upload a CSV marketing list and send personalized CE marking outreach via the marketing SMTP account."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        {pageData?.isAdmin && <SendColdEmailButton />}
        <Link
          href="/logs?type=cold"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          View cold email logs
        </Link>
      </div>

      {pageData?.marketingDaily && (
        <div className="mb-6">
          <MarketingDailyWidget status={pageData.marketingDaily} />
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-10">
        <ColdEmailUploadForm />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Previous batches</h2>
        {batches.length === 0 && !error ? (
          <EmptyState
            icon={Mail}
            title="No batches yet"
            description="Upload a CSV to create your first cold email batch."
          />
        ) : (
          <ColdEmailBatchList batches={batches} />
        )}
      </div>
    </>
  );
}
