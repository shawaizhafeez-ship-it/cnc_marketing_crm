"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  createRenewalCampaign,
  getRenewalCampaignPreview,
  type CampaignActionState,
} from "@/app/(dashboard)/renewals/campaigns/actions";
import { formatExpiryDisplay } from "@/lib/renewals/prepare-email-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type PreviewData = Awaited<ReturnType<typeof getRenewalCampaignPreview>>;

type CreateCampaignFormProps = {
  defaultMonth: number;
  defaultYear: number;
  availableMonths: number[];
  availableYears: number[];
};

const initialState: CampaignActionState = {};

export function CreateCampaignForm({
  defaultMonth,
  defaultYear,
  availableMonths,
  availableYears,
}: CreateCampaignFormProps) {
  const [state, formAction, pending] = useActionState(
    createRenewalCampaign,
    initialState
  );
  const [previewPending, startPreview] = useTransition();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const months =
    availableMonths.length > 0
      ? availableMonths
      : Array.from({ length: 12 }, (_, i) => i + 1);
  const years =
    availableYears.length > 0
      ? availableYears
      : [new Date().getFullYear(), new Date().getFullYear() + 1];

  useEffect(() => {
    startPreview(async () => {
      try {
        const data = await getRenewalCampaignPreview(month, year);
        setPreview(data);
      } catch {
        setPreview(null);
      }
    });
  }, [month, year]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Campaign settings</CardTitle>
          <CardDescription>
            Month-anchor scheduling: emails sent 15 days before the 1st, then +2
            and +4 weeks from the 1st of the expiry month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="year" value={year} />

            <div className="space-y-2">
              <Label htmlFor="name">Campaign name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder={`Renewal Campaign ${year}-${String(month).padStart(2, "0")}`}
                defaultValue={`Renewal Campaign ${MONTH_NAMES[month - 1]} ${year}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Automated month-anchor renewal follow-up"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month-select">Expiry month</Label>
                <select
                  id="month-select"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {MONTH_NAMES[m - 1]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year-select">Expiry year</Label>
                <select
                  id="year-select"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <Button type="submit" disabled={pending || previewPending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating...
                </>
              ) : (
                "Create scheduled campaign"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule preview</CardTitle>
            <CardDescription>
              {previewPending
                ? "Loading preview..."
                : preview
                  ? `Anchor: ${preview.anchorDate} · Send time: ${preview.sendHourUtc}:00 UTC`
                  : "Select month and year"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview && (
              <dl className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <dt className="text-muted-foreground">Certificates</dt>
                  <dd className="font-medium">{preview.summary.totalCertificates}</dd>
                  <dt className="text-muted-foreground">Recipients</dt>
                  <dd className="font-medium">{preview.summary.totalRecipients}</dd>
                  <dt className="text-muted-foreground">Emails scheduled</dt>
                  <dd className="font-medium">{preview.summary.totalEmailsScheduled}</dd>
                </div>

                <div className="border-t pt-3">
                  <p className="mb-2 font-medium">Touchpoint dates</p>
                  <ul className="space-y-1">
                    {preview.touchpoints.map((tp) => (
                      <li
                        key={tp.touchpointNumber}
                        className={tp.isPast ? "text-muted-foreground line-through" : ""}
                      >
                        TP{tp.touchpointNumber}:{" "}
                        {new Date(tp.scheduledAt).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "UTC",
                        })}{" "}
                        UTC
                        {tp.isPast ? " (skipped — past)" : ""}
                        {!tp.isPast &&
                          preview.summary.touchpointCounts[tp.touchpointNumber] !==
                            undefined && (
                            <>
                              {" "}
                              — {preview.summary.touchpointCounts[tp.touchpointNumber]}{" "}
                              emails
                            </>
                          )}
                      </li>
                    ))}
                  </ul>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {preview && preview.certificates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Certificate preview</CardTitle>
              <CardDescription>
                Showing first {Math.min(10, preview.certificates.length)} of{" "}
                {preview.certificates.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Company</th>
                    <th className="pb-2 pr-4">Certificate</th>
                    <th className="pb-2 pr-4">Expiry</th>
                    <th className="pb-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.certificates.slice(0, 10).map((cert) => (
                    <tr key={cert.id} className="border-b">
                      <td className="py-2 pr-4">{cert.company_name}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {cert.certificate_no}
                      </td>
                      <td className="py-2 pr-4">
                        {formatExpiryDisplay(cert.expiry_date)}
                      </td>
                      <td className="py-2">{cert.recipient_email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
