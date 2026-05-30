import { Suspense } from "react";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EmailLogsView } from "@/components/logs/email-logs-view";
import { getEmailLogStats, getEmailLogs } from "@/app/(dashboard)/logs/actions";
import type { EmailLogFilters, EmailLogType } from "@/lib/email/email-log-types";
import { Button } from "@/components/ui/button";

type LogsPageProps = {
  searchParams: Promise<{
    type?: string;
    status?: string;
    recipient?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

function parseFilters(params: Awaited<LogsPageProps["searchParams"]>): EmailLogFilters {
  const type = params.type as EmailLogType | undefined;
  const validTypes: EmailLogType[] = [
    "all",
    "renewal",
    "marketing",
    "cold",
    "manual",
  ];
  const page = params.page ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  return {
    type: type && validTypes.includes(type) ? type : "all",
    status: params.status ?? "all",
    recipient: params.recipient ?? null,
    from: params.from ?? null,
    to: params.to ?? null,
    page,
  };
}

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);

  let stats: Awaited<ReturnType<typeof getEmailLogStats>> | null = null;
  let result: Awaited<ReturnType<typeof getEmailLogs>> | null = null;
  let error: string | null = null;

  try {
    [stats, result] = await Promise.all([
      getEmailLogStats(filters),
      getEmailLogs(filters),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load email logs";
  }

  return (
    <>
      <PageHeader
        title="Email Logs"
        description="View sent, failed, and skipped emails across renewal, marketing, and manual sends."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {stats && result && (
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          {result.total === 0 &&
          filters.type === "all" &&
          filters.status === "all" &&
          !filters.recipient &&
          !filters.from &&
          !filters.to ? (
            <EmptyState
              icon={ScrollText}
              title="No email logs yet"
              description="Logs appear when renewal campaigns, marketing campaigns, or manual emails are sent."
              action={
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
              }
            />
          ) : (
            <EmailLogsView stats={stats} result={result} filters={filters} />
          )}
        </Suspense>
      )}
    </>
  );
}
