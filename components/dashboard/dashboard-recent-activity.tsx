import Link from "next/link";
import { ScrollText } from "lucide-react";
import { EmailStatusBadge } from "@/components/renewals/campaign-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmailLogEntry } from "@/lib/email/email-log-types";

type DashboardRecentActivityProps = {
  logs: EmailLogEntry[];
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function emailTypeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function DashboardRecentActivity({ logs }: DashboardRecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Recent email activity</CardTitle>
            <CardDescription>Last 10 entries from email logs.</CardDescription>
          </div>
          <Link
            href="/logs"
            className="text-sm text-muted-foreground hover:underline"
          >
            View all logs
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No email activity yet"
            description="Sent, failed, and manual emails will appear here once campaigns run or you send from Manual Email."
            action={
              <Button variant="outline" asChild size="sm">
                <Link href="/logs">View email logs</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Sent</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Recipient</th>
                  <th className="pb-2 pr-4 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(log.sent_at)}
                    </td>
                    <td className="py-3 pr-4">{emailTypeLabel(log.email_type)}</td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {log.recipient_email}
                    </td>
                    <td className="max-w-[240px] truncate py-3 pr-4">
                      {log.subject}
                    </td>
                    <td className="py-3">
                      <EmailStatusBadge status={log.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
