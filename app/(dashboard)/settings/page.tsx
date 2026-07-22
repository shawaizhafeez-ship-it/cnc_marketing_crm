import { Mail, MessageCircle, Settings, Sheet, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SendRenewalsButton } from "@/components/shared/send-renewals-button";
import { SyncSheetsButton } from "@/components/shared/sync-sheets-button";
import { getSettingsPageData } from "@/app/(dashboard)/settings/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CRON_JOBS,
  REQUIRED_SHEET_COLUMNS,
} from "@/lib/settings/types";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SmtpConfigCard({
  title,
  config,
}: {
  title: string;
  config: {
    host: string;
    port: number;
    from: string;
    passwordConfigured: boolean;
    cc: string[];
  };
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Read-only configuration. Passwords are stored in server environment
          variables only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Host</dt>
            <dd className="font-mono text-xs">{config.host}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Port</dt>
            <dd className="font-medium">{config.port}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">From</dt>
            <dd className="font-medium">{config.from}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Password</dt>
            <dd className="font-medium">
              {config.passwordConfigured ? "•••••••• (configured)" : "Not configured"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">CC</dt>
            <dd className="text-right font-medium">{config.cc.join(", ")}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export default async function SettingsPage() {
  let pageData: Awaited<ReturnType<typeof getSettingsPageData>> | null = null;
  let loadError: string | null = null;

  try {
    pageData = await getSettingsPageData();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load settings";
  }

  const {
    smtp,
    whatsapp,
    googleSheet,
    touchpoints,
    sheetConfig,
    latestLog,
    renewalSendLog,
    marketingSendLog,
    isAdmin,
  } = pageData ?? {};

  return (
    <>
      <PageHeader
        title="Settings"
        description="SMTP configuration, Google Sheets sync, and system preferences."
      />

      {loadError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SmtpConfigCard title="Renewal SMTP" config={smtp?.renewal ?? {
          host: "—",
          port: 465,
          from: "renewal@cncservices.net",
          passwordConfigured: false,
          cc: ["admin@cncservices.net"],
        }} />

        <SmtpConfigCard title="Marketing SMTP" config={smtp?.marketing ?? {
          host: "—",
          port: 465,
          from: "info@cncservices.net",
          passwordConfigured: false,
          cc: ["admin@cncservices.net"],
        }} />

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>WhatsApp (Meta Cloud API)</CardTitle>
            <CardDescription>
              Second renewal channel. Credentials live in server environment
              variables; messages use pre-approved templates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">
                  {whatsapp?.configured ? "Configured" : "Not configured"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Phone number ID</dt>
                <dd className="font-mono text-xs">
                  {whatsapp?.phoneNumberIdMasked ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Access token</dt>
                <dd className="font-medium">
                  {whatsapp?.tokenConfigured
                    ? "•••••••• (configured)"
                    : "Not configured"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">API version</dt>
                <dd className="font-medium">{whatsapp?.apiVersion ?? "—"}</dd>
              </div>
            </dl>
            {whatsapp && (
              <div className="mt-4 border-t pt-3 text-sm">
                <p className="mb-2 font-medium">Approved templates</p>
                <ul className="space-y-1 font-mono text-xs text-muted-foreground">
                  <li>gentle → {whatsapp.templates.gentle}</li>
                  <li>urgent → {whatsapp.templates.urgent}</li>
                  <li>final → {whatsapp.templates.final}</li>
                </ul>
              </div>
            )}
            {!whatsapp?.configured && (
              <p className="mt-4 text-xs text-muted-foreground">
                Set <code className="rounded bg-muted px-1">WHATSAPP_PHONE_NUMBER_ID</code>{" "}
                and <code className="rounded bg-muted px-1">WHATSAPP_ACCESS_TOKEN</code>{" "}
                in your environment, and create the three approved templates in
                Meta Business Manager.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Sheet className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>Google Sheet configuration</CardTitle>
            <CardDescription>
              Spreadsheet source for certificate sync. ID comes from{" "}
              <code className="rounded bg-muted px-1">GOOGLE_SHEET_ID</code> env
              var.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {googleSheet || sheetConfig ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Spreadsheet</dt>
                  <dd className="font-medium">
                    {googleSheet?.spreadsheet ?? sheetConfig?.spreadsheetName}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Worksheet</dt>
                  <dd className="font-medium">
                    {googleSheet?.worksheet ?? sheetConfig?.worksheetName}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Sheet ID</dt>
                  <dd className="truncate font-mono text-xs">
                    {googleSheet?.spreadsheetId ?? sheetConfig?.spreadsheetId ?? "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Configure GOOGLE_SHEET_ID and service account env vars in{" "}
                <code className="rounded bg-muted px-1">.env.local</code>.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>Renewal touchpoint offsets</CardTitle>
            <CardDescription>
              Stored in <code className="rounded bg-muted px-1">app_settings</code>{" "}
              — anchor is the 1st of the expiry month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {touchpoints ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Offsets (days)</dt>
                  <dd className="font-mono font-medium">
                    {touchpoints.offsets.join(", ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Send hour (UTC)</dt>
                  <dd className="font-medium">{touchpoints.send_hour}:00</dd>
                </div>
                {touchpoints.description && (
                  <p className="pt-2 text-xs text-muted-foreground">
                    {touchpoints.description}
                  </p>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Touchpoint settings not loaded.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Sheet className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>Google Sheets sync</CardTitle>
            <CardDescription>
              Pull certificate data from the Renewals spreadsheet into Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SyncSheetsButton />

            {latestLog && (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <p className="font-medium">Last sync</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="capitalize">{latestLog.status}</dd>
                  <dt className="text-muted-foreground">Started</dt>
                  <dd>{formatDate(latestLog.started_at)}</dd>
                  <dt className="text-muted-foreground">Completed</dt>
                  <dd>{formatDate(latestLog.completed_at)}</dd>
                  <dt className="text-muted-foreground">Processed</dt>
                  <dd>{latestLog.rows_processed}</dd>
                  <dt className="text-muted-foreground">Inserted</dt>
                  <dd>{latestLog.rows_inserted}</dd>
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd>{latestLog.rows_updated}</dd>
                  <dt className="text-muted-foreground">Skipped</dt>
                  <dd>{latestLog.rows_skipped}</dd>
                </dl>
                {latestLog.error_message && (
                  <p className="mt-2 text-xs text-destructive">
                    {latestLog.error_message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>Scheduler</CardTitle>
            <CardDescription>
              Cron jobs configured in <code className="rounded bg-muted px-1">vercel.json</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {CRON_JOBS.map((job) => (
                <div key={job.id} className="rounded-lg border p-4">
                  <p className="font-medium">{job.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.scheduleLabel}
                  </p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {job.schedule}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {job.description}
                  </p>
                </div>
              ))}
            </div>

            {isAdmin && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Manual renewal send</p>
                  <p className="text-sm text-muted-foreground">
                    Process pending renewal emails immediately (admin only).
                  </p>
                  <div className="mt-3">
                    <SendRenewalsButton />
                  </div>
                </div>

                {renewalSendLog && (
                  <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                    <p className="font-medium">Last renewal send run</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="capitalize">{renewalSendLog.status}</dd>
                      <dt className="text-muted-foreground">Finished</dt>
                      <dd>{formatDate(renewalSendLog.last_run_at)}</dd>
                      <dt className="text-muted-foreground">Sent</dt>
                      <dd>{renewalSendLog.sent}</dd>
                      <dt className="text-muted-foreground">Failed</dt>
                      <dd>{renewalSendLog.failed}</dd>
                    </dl>
                  </div>
                )}

                {marketingSendLog && (
                  <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                    <p className="font-medium">Last marketing send run</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="capitalize">{marketingSendLog.status}</dd>
                      <dt className="text-muted-foreground">Finished</dt>
                      <dd>{formatDate(marketingSendLog.last_run_at)}</dd>
                      <dt className="text-muted-foreground">Sent</dt>
                      <dd>{marketingSendLog.sent}</dd>
                      <dt className="text-muted-foreground">Failed</dt>
                      <dd>{marketingSendLog.failed}</dd>
                    </dl>
                  </div>
                )}
              </div>
            )}

            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                Manual cron triggers are available to admin users only.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>Required certificate columns</CardTitle>
            <CardDescription>
              Worksheet &quot;List Cleaned&quot; in spreadsheet &quot;Renewals&quot;
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {REQUIRED_SHEET_COLUMNS.map((column) => (
                <li key={column}>{column}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Rows with empty emails or invalid dates are skipped. Unchanged rows
              (same hash) are not re-upserted. Scheduled renewal emails are
              skipped at send time if any linked certificate has ops_status
              &quot;done&quot;.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
