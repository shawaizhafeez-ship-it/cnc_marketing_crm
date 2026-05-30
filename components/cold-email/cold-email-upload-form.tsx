"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createColdEmailBatch,
  previewColdEmailCsvUpload,
  type ColdEmailActionState,
  type ColdEmailCsvPreview,
} from "@/app/(dashboard)/marketing/cold-email/actions";
import {
  DEFAULT_COLD_EMAIL_HTML,
  DEFAULT_COLD_EMAIL_SUBJECT,
  renderColdEmailHtml,
} from "@/lib/email/cold-email-template";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ColdEmailActionState = {};

export function ColdEmailUploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createColdEmailBatch,
    initialState
  );
  const [previewPending, startPreview] = useTransition();
  const [preview, setPreview] = useState<ColdEmailCsvPreview | null>(null);
  const [htmlTemplate, setHtmlTemplate] = useState(DEFAULT_COLD_EMAIL_HTML);
  const [subject, setSubject] = useState(DEFAULT_COLD_EMAIL_SUBJECT);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [startImmediately, setStartImmediately] = useState(true);

  function handlePreview() {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);

    startPreview(async () => {
      try {
        const result = await previewColdEmailCsvUpload(formData);
        setPreview(result);
        if (result.errors.length > 0 && result.total === 0) {
          toast.error(result.errors[0]);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to preview CSV"
        );
      }
    });
  }

  const previewHtml = renderColdEmailHtml(htmlTemplate, "Example Company Ltd");

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upload marketing list</CardTitle>
          <CardDescription>
            CSV must include <code className="text-xs">email</code> and{" "}
            <code className="text-xs">company</code> columns, or headerless rows like{" "}
            <code className="text-xs">timestamp,email,company,variant</code> (send logs export).
            Optional <code className="text-xs">ELV Result</code> column for verified-only
            filtering.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Batch name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. CE Marking outreach May 2026"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv_file">CSV file</Label>
              <Input
                id="csv_file"
                name="csv_file"
                type="file"
                accept=".csv,text/csv"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="verified_only"
                checked={verifiedOnly}
                onCheckedChange={(value) => setVerifiedOnly(value === true)}
              />
              <Label htmlFor="verified_only" className="font-normal">
                Only include rows where ELV Result is ok / valid / verified
              </Label>
              {verifiedOnly && (
                <input type="hidden" name="verified_only" value="on" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="start_immediately"
                checked={startImmediately}
                onCheckedChange={(value) => setStartImmediately(value === true)}
              />
              <Label htmlFor="start_immediately" className="font-normal">
                Start sending immediately (queue for cron / manual send)
              </Label>
              {startImmediately && (
                <input type="hidden" name="start_immediately" value="on" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="html_template">Email template (HTML)</Label>
              <Textarea
                id="html_template"
                name="html_template"
                value={htmlTemplate}
                onChange={(event) => setHtmlTemplate(event.target.value)}
                rows={12}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Use <code>{`{{company}}`}</code> for the recipient company name.
              </p>
            </div>

            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handlePreview} disabled={previewPending}>
                {previewPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Previewing...
                  </>
                ) : (
                  "Preview CSV"
                )}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Creating batch...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Create batch
                  </>
                )}
              </Button>
            </div>
          </form>

          {preview && (
            <div className="mt-6 rounded-lg border p-4">
              <p className="text-sm font-medium">
                {preview.total} recipient{preview.total === 1 ? "" : "s"} ready
                {preview.skipped > 0 ? ` · ${preview.skipped} skipped` : ""}
              </p>
              {preview.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                  {preview.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
              {preview.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 pr-3">Email</th>
                        <th className="py-1">Company</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr key={row.email} className="border-b border-muted">
                          <td className="py-1 pr-3 font-mono">{row.email}</td>
                          <td className="py-1">{row.company}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.total > preview.rows.length && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Showing first {preview.rows.length} of {preview.total}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template preview</CardTitle>
          <CardDescription>
            Subject: {subject || DEFAULT_COLD_EMAIL_SUBJECT}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none rounded-lg border bg-white p-4 text-foreground"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
