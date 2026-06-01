import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmailStatusBadge } from "@/components/renewals/campaign-status-badge";
import { ColdEmailActions } from "@/components/cold-email/cold-email-actions";
import { ColdEmailRecipientTable } from "@/components/cold-email/cold-email-recipient-table";
import { SendColdEmailButton } from "@/components/cold-email/send-cold-email-button";
import { getColdEmailBatchDetail } from "@/app/(dashboard)/marketing/cold-email/actions";
import { renderColdEmailHtml } from "@/lib/email/cold-email-template";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ColdEmailBatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ColdEmailBatchPage({
  params,
}: ColdEmailBatchPageProps) {
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getColdEmailBatchDetail>>;

  try {
    detail = await getColdEmailBatchDetail(id);
  } catch {
    notFound();
  }

  const { batch, recipients, pendingCount } = detail;
  const previewHtml = renderColdEmailHtml(
    batch.html_template,
    recipients[0]?.company_name ?? "Example Company Ltd"
  );

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/marketing/cold-email">
            <ArrowLeft className="h-4 w-4" />
            Back to cold email
          </Link>
        </Button>
      </div>

      <PageHeader
        title={batch.name}
        description={`Subject: ${batch.subject}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <EmailStatusBadge status={batch.status} />
        <ColdEmailActions batchId={batch.id} status={batch.status} />
        {batch.status === "active" && pendingCount > 0 && (
          <SendColdEmailButton />
        )}
      </div>

      {batch.status === "active" && pendingCount > 0 && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          <p className="font-medium">Queue waiting — emails are not sent automatically on upload.</p>
          <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
            Click <strong>Send pending cold emails now</strong> to process up to{" "}
            <strong>10 emails</strong> per run (2s apart). Repeat until the queue
            is empty, or wait for the daily Vercel cron (8:00 UTC on Hobby).
            Daily marketing limit: 100 emails total.
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total recipients</CardDescription>
            <CardTitle className="text-3xl">{batch.total_recipients}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sent</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {batch.emails_sent}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {batch.emails_failed}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email preview</CardTitle>
            <CardDescription>
              Rendered with the first recipient&apos;s company name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none rounded-lg border bg-white p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Batch details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Created:</span>{" "}
              {new Date(batch.created_at).toLocaleString("en-GB")}
            </p>
            <p>
              <span className="text-muted-foreground">Started:</span>{" "}
              {batch.started_at
                ? new Date(batch.started_at).toLocaleString("en-GB")
                : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Completed:</span>{" "}
              {batch.completed_at
                ? new Date(batch.completed_at).toLocaleString("en-GB")
                : "—"}
            </p>
            <Link
              href={`/logs?type=cold&recipient=`}
              className="inline-block text-primary underline-offset-4 hover:underline"
            >
              View send logs for this batch
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Recipients</h2>
          {batch.total_recipients > recipients.length && (
            <p className="text-sm text-muted-foreground">
              Showing first {recipients.length} of {batch.total_recipients}
            </p>
          )}
        </div>
        <ColdEmailRecipientTable recipients={recipients} />
      </div>
    </>
  );
}
