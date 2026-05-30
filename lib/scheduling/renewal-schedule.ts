import { formatExpiryDisplay } from "@/lib/renewals/prepare-email-data";
import type { CertificateRow } from "@/lib/renewals/types";
import { RENEWAL_EMAIL_SUBJECT } from "@/lib/email/renewal-template";

/**
 * Month-anchor renewal scheduling
 *
 * All certificates expiring in the same month share one anchor (1st of that month).
 *
 * Worked example — certificate expiring March 16, 2026:
 *   anchor     = 2026-03-01
 *   Touchpoint 1 (−15d) = 2026-02-14 09:00 UTC
 *   Touchpoint 2 (+14d) = 2026-03-15 09:00 UTC
 *   Touchpoint 3 (+28d) = 2026-03-29 09:00 UTC
 *
 * January edge case — anchor 2026-01-01:
 *   Touchpoint 1 (−15d) = 2025-12-17 09:00 UTC (prior year)
 */

export type TouchpointNumber = 1 | 2 | 3;

export const TOUCHPOINT_OFFSETS: Record<TouchpointNumber, number> = {
  1: -15,
  2: 14,
  3: 28,
};

export const DEFAULT_SEND_HOUR_UTC = 9;

export type CertificateSnapshot = {
  id: string;
  certificate_no: string;
  company_name: string;
  item: string | null;
  expiry_date: string;
  expiry_display: string;
  renewal_amount: number | null;
  recipient_email: string;
};

export type ScheduledEmailInsert = {
  campaign_id: string;
  touchpoint_number: TouchpointNumber;
  recipient_email: string;
  company_name: string;
  certificate_ids: string[];
  certificate_snapshot: CertificateSnapshot[];
  subject: string;
  scheduled_at: string;
  status: "pending";
};

export type TouchpointPreview = {
  touchpointNumber: TouchpointNumber;
  scheduledAt: string;
  isPast: boolean;
};

export type BuildScheduledEmailsOptions = {
  sendHourUtc?: number;
  now?: Date;
  subject?: string;
};

export function getMonthAnchor(year: number, month: number): Date {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`);
  }
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

export function getAnchorDateString(year: number, month: number): string {
  const anchor = getMonthAnchor(year, month);
  const y = anchor.getUTCFullYear();
  const m = String(anchor.getUTCMonth() + 1).padStart(2, "0");
  const d = String(anchor.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTouchpointDate(
  anchor: Date,
  touchpointNumber: TouchpointNumber,
  sendHourUtc: number = DEFAULT_SEND_HOUR_UTC
): Date {
  const offsetDays = TOUCHPOINT_OFFSETS[touchpointNumber];
  const result = new Date(anchor.getTime());
  result.setUTCDate(result.getUTCDate() + offsetDays);
  result.setUTCHours(sendHourUtc, 0, 0, 0);
  return result;
}

export function getTouchpointPreviews(
  year: number,
  month: number,
  sendHourUtc: number = DEFAULT_SEND_HOUR_UTC,
  now: Date = new Date()
): TouchpointPreview[] {
  const anchor = getMonthAnchor(year, month);
  return ([1, 2, 3] as TouchpointNumber[]).map((touchpointNumber) => {
    const date = getTouchpointDate(anchor, touchpointNumber, sendHourUtc);
    return {
      touchpointNumber,
      scheduledAt: date.toISOString(),
      isPast: date.getTime() <= now.getTime(),
    };
  });
}

function toSnapshot(cert: CertificateRow): CertificateSnapshot {
  return {
    id: cert.id,
    certificate_no: cert.certificate_no,
    company_name: cert.company_name,
    item: cert.item,
    expiry_date: cert.expiry_date,
    expiry_display: formatExpiryDisplay(cert.expiry_date),
    renewal_amount: cert.renewal_amount,
    recipient_email: cert.recipient_email,
  };
}

function groupByRecipient(
  certificates: CertificateRow[]
): Map<string, CertificateRow[]> {
  const map = new Map<string, CertificateRow[]>();

  for (const cert of certificates) {
    const email = cert.recipient_email.trim().toLowerCase();
    if (!email) continue;

    const list = map.get(email) ?? [];
    list.push(cert);
    map.set(email, list);
  }

  return map;
}

export function buildScheduledEmails(
  certificates: CertificateRow[],
  campaignId: string,
  targetYear: number,
  targetMonth: number,
  options: BuildScheduledEmailsOptions = {}
): ScheduledEmailInsert[] {
  const sendHourUtc = options.sendHourUtc ?? DEFAULT_SEND_HOUR_UTC;
  const now = options.now ?? new Date();
  const subject = options.subject ?? RENEWAL_EMAIL_SUBJECT;
  const anchor = getMonthAnchor(targetYear, targetMonth);
  const grouped = groupByRecipient(certificates);
  const scheduled: ScheduledEmailInsert[] = [];

  for (const [recipientEmail, certs] of grouped) {
    const companyName = certs[0]?.company_name ?? recipientEmail;
    const certificateIds = certs.map((c) => c.id);
    const snapshot = certs.map(toSnapshot);

    for (const touchpointNumber of [1, 2, 3] as TouchpointNumber[]) {
      const scheduledAt = getTouchpointDate(anchor, touchpointNumber, sendHourUtc);

      if (scheduledAt.getTime() <= now.getTime()) {
        continue;
      }

      scheduled.push({
        campaign_id: campaignId,
        touchpoint_number: touchpointNumber,
        recipient_email: recipientEmail,
        company_name: companyName,
        certificate_ids: certificateIds,
        certificate_snapshot: snapshot,
        subject,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
      });
    }
  }

  return scheduled;
}

export function summarizeScheduledEmails(
  certificates: CertificateRow[],
  scheduledEmails: ScheduledEmailInsert[]
) {
  const recipients = new Set(scheduledEmails.map((e) => e.recipient_email));

  return {
    totalCertificates: certificates.length,
    totalRecipients: recipients.size,
    totalEmailsScheduled: scheduledEmails.length,
    touchpointCounts: {
      1: scheduledEmails.filter((e) => e.touchpoint_number === 1).length,
      2: scheduledEmails.filter((e) => e.touchpoint_number === 2).length,
      3: scheduledEmails.filter((e) => e.touchpoint_number === 3).length,
    },
  };
}
