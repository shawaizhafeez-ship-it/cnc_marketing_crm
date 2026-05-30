"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Mail, Send, Wifi } from "lucide-react";
import { toast } from "sonner";
import {
  getRenewalPreview,
  sendRenewalBatch,
  testSmtpConnection,
} from "@/app/(dashboard)/renewals/actions";
import type {
  GroupedRenewalEmail,
  RenewalStats,
  SendRenewalResult,
} from "@/lib/renewals/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type RenewalSendPanelProps = {
  month: number;
  year: number;
  emailGroups: GroupedRenewalEmail[];
  stats: RenewalStats;
};

export function RenewalSendPanel({
  month,
  year,
  emailGroups,
  stats,
}: RenewalSendPanelProps) {
  const [selectedEmail, setSelectedEmail] = useState(
    emailGroups[0]?.recipientEmail ?? ""
  );
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState("Renewal CE Marking");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<SendRenewalResult[] | null>(
    null
  );
  const [sendProgress, setSendProgress] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (emailGroups.length > 0 && !emailGroups.find((g) => g.recipientEmail === selectedEmail)) {
      setSelectedEmail(emailGroups[0].recipientEmail);
    }
  }, [emailGroups, selectedEmail]);

  useEffect(() => {
    if (!selectedEmail) {
      setPreviewHtml("");
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    getRenewalPreview(selectedEmail, month, year).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setPreviewHtml("");
        toast.error(result.error);
      } else {
        setPreviewHtml(result.html);
        setPreviewSubject(result.subject);
      }
      setPreviewLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedEmail, month, year]);

  function handleTestConnection() {
    startTransition(async () => {
      const result = await testSmtpConnection();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleSendAll() {
    if (emailGroups.length === 0) return;

    setBatchResults(null);
    setSendProgress(0);

    startTransition(async () => {
      setSendProgress(10);

      const result = await sendRenewalBatch(month, year);

      if ("error" in result) {
        toast.error(result.error);
        setSendProgress(0);
        return;
      }

      setBatchResults(result.results);
      setSendProgress(100);

      if (result.failed === 0) {
        toast.success(`Successfully sent ${result.successful} renewal emails`);
      } else {
        toast.warning(
          `Sent ${result.successful} of ${result.total} emails (${result.failed} failed)`
        );
      }
    });
  }

  const selectedGroup = emailGroups.find((g) => g.recipientEmail === selectedEmail);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" />
            Email preview
          </CardTitle>
          <CardDescription>
            Preview grouped renewal email before sending ({stats.uniqueEmails}{" "}
            recipients)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preview-recipient">Select recipient</Label>
            <select
              id="preview-recipient"
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              disabled={emailGroups.length === 0}
            >
              {emailGroups.map((group) => (
                <option key={group.recipientEmail} value={group.recipientEmail}>
                  {group.company} ({group.recipientEmail}) — {group.certificateCount}{" "}
                  cert{group.certificateCount !== 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedGroup && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">To:</span>{" "}
                {selectedGroup.recipientEmail}
              </p>
              <p>
                <span className="text-muted-foreground">CC:</span> admin@cncservices.net
              </p>
              <p>
                <span className="text-muted-foreground">Subject:</span> {previewSubject}
              </p>
              <p>
                <span className="text-muted-foreground">Certificates:</span>{" "}
                {selectedGroup.certificateCount}
              </p>
            </div>
          )}

          {previewLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading preview...
            </div>
          ) : previewHtml ? (
            <div
              className="max-h-[480px] overflow-auto rounded-md border bg-white p-4 text-black"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a recipient to preview the email.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5" />
            Send renewal emails
          </CardTitle>
          <CardDescription>
            Test SMTP connection, then send all {emailGroups.length} grouped emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <p>
              Ready to send{" "}
              <strong>{emailGroups.length}</strong> renewal email
              {emailGroups.length !== 1 ? "s" : ""} covering{" "}
              <strong>{stats.totalCertificates}</strong> certificates.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              Test connection
            </Button>

            <Button
              type="button"
              onClick={handleSendAll}
              disabled={pending || emailGroups.length === 0}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send all renewal emails
                </>
              )}
            </Button>
          </div>

          {pending && sendProgress < 100 && (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.max(sendProgress, 15)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Sending emails sequentially (2s delay between each)...
              </p>
            </div>
          )}

          {batchResults && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Send results</p>
              <div className="max-h-64 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Company</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.map((result) => (
                      <tr key={result.recipientEmail} className="border-t">
                        <td className="px-3 py-2">{result.company}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {result.recipientEmail}
                        </td>
                        <td className="px-3 py-2">
                          {result.success ? (
                            <span className="text-green-600">Sent</span>
                          ) : (
                            <span className="text-destructive" title={result.message}>
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
