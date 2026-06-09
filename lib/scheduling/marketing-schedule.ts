import { renderTemplate } from "@/lib/email/template-renderer";
import { buildRecipientTemplateVariables } from "@/lib/marketing/build-recipient-variables";
import { groupCertificatesByRecipient } from "@/lib/marketing/filter-certificates";
import type {
  CampaignStartMode,
  TouchpointScheduleType,
} from "@/lib/marketing/campaign-types";
import type { CertificateRow } from "@/lib/renewals/types";

export type ResolveCampaignStartResult =
  | { ok: true; start: Date }
  | { ok: false; error: string };

/** Format a Date for `<input type="datetime-local" />` in local time. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultScheduledCampaignStart(now: Date = new Date()): Date {
  const start = new Date(now.getTime());
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  return start;
}

export function resolveCampaignStart(options: {
  startMode?: CampaignStartMode;
  scheduledStartAt?: string | null;
  now?: Date;
}): ResolveCampaignStartResult {
  const now = options.now ?? new Date();
  const startMode = options.startMode ?? "immediate";

  if (startMode === "immediate") {
    return { ok: true, start: now };
  }

  const raw = options.scheduledStartAt?.trim();
  if (!raw) {
    return { ok: false, error: "Choose a date and time for the first send." };
  }

  const start = new Date(raw);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "Invalid scheduled start date and time." };
  }

  if (start.getTime() < now.getTime() - 60_000) {
    return {
      ok: false,
      error: "Scheduled start must be at least 1 minute in the future.",
    };
  }

  return { ok: true, start };
}

export type TouchpointScheduleConfig = {
  touchpointNumber: number;
  scheduleType: TouchpointScheduleType;
  scheduleValue: number;
};

export type MarketingTemplateContent = {
  id: string;
  subject: string;
  html_content: string;
};

export type MarketingTouchpointRecord = {
  id: string;
  touchpoint_number: number;
  template_id: string;
  schedule_type: TouchpointScheduleType;
  schedule_value: number;
  delay_days: number;
};

export type MarketingScheduledEmailInsert = {
  campaign_id: string;
  touchpoint_id: string;
  template_id: string;
  recipient_email: string;
  company_name: string;
  certificate_ids: string[];
  rendered_subject: string;
  rendered_html: string;
  scheduled_at: string;
  status: "pending";
};

export type MarketingScheduleSummary = {
  totalCertificates: number;
  totalRecipients: number;
  totalEmailsScheduled: number;
};

export function calculateDelayDays(
  scheduleType: TouchpointScheduleType,
  scheduleValue: number,
  touchpointNumber: number
): number {
  switch (scheduleType) {
    case "immediate":
      return 0;
    case "weekly":
      return (touchpointNumber - 1) * 7;
    case "monthly":
      return (touchpointNumber - 1) * 30;
    case "custom_days":
      if (touchpointNumber === 1) {
        return 0;
      }
      return scheduleValue * (touchpointNumber - 1);
    default:
      return 0;
  }
}

export function calculateTouchpointDates(
  campaignStart: Date,
  touchpointsConfig: TouchpointScheduleConfig[]
): Array<{ touchpointNumber: number; scheduledAt: string; delayDays: number }> {
  return touchpointsConfig.map((touchpoint) => {
    const delayDays = calculateDelayDays(
      touchpoint.scheduleType,
      touchpoint.scheduleValue,
      touchpoint.touchpointNumber
    );
    const scheduledAt = new Date(campaignStart.getTime());
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + delayDays);

    return {
      touchpointNumber: touchpoint.touchpointNumber,
      scheduledAt: scheduledAt.toISOString(),
      delayDays,
    };
  });
}

export function buildMarketingScheduledEmails(
  filteredCerts: CertificateRow[],
  campaignId: string,
  touchpoints: MarketingTouchpointRecord[],
  templates: Map<string, MarketingTemplateContent>,
  campaignStart: Date = new Date()
): MarketingScheduledEmailInsert[] {
  const grouped = groupCertificatesByRecipient(filteredCerts);
  const scheduleDates = calculateTouchpointDates(
    campaignStart,
    touchpoints.map((touchpoint) => ({
      touchpointNumber: touchpoint.touchpoint_number,
      scheduleType: touchpoint.schedule_type,
      scheduleValue: touchpoint.schedule_value,
    }))
  );
  const scheduleByTouchpoint = new Map(
    scheduleDates.map((entry) => [entry.touchpointNumber, entry.scheduledAt])
  );

  const scheduled: MarketingScheduledEmailInsert[] = [];

  for (const [recipientEmail, certificates] of grouped) {
    const companyName = certificates[0]?.company_name ?? recipientEmail;
    const certificateIds = certificates.map((cert) => cert.id);
    const variables = buildRecipientTemplateVariables(certificates);

    for (const touchpoint of touchpoints) {
      const template = templates.get(touchpoint.template_id);
      if (!template) {
        throw new Error(`Template ${touchpoint.template_id} not found.`);
      }

      const rendered = renderTemplate(
        template.html_content,
        template.subject,
        variables
      );

      scheduled.push({
        campaign_id: campaignId,
        touchpoint_id: touchpoint.id,
        template_id: touchpoint.template_id,
        recipient_email: recipientEmail,
        company_name: companyName,
        certificate_ids: certificateIds,
        rendered_subject: rendered.subject,
        rendered_html: rendered.html,
        scheduled_at:
          scheduleByTouchpoint.get(touchpoint.touchpoint_number) ??
          campaignStart.toISOString(),
        status: "pending",
      });
    }
  }

  return scheduled;
}

export function summarizeMarketingSchedule(
  filteredCerts: CertificateRow[],
  touchpointCount: number
): MarketingScheduleSummary {
  const recipients = groupCertificatesByRecipient(filteredCerts);

  return {
    totalCertificates: filteredCerts.length,
    totalRecipients: recipients.size,
    totalEmailsScheduled: recipients.size * touchpointCount,
  };
}
