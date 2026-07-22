import type { TemplateCertificate } from "@/lib/renewals/types";
import {
  getRenewalStage,
  type RenewalEmailType,
  type RenewalStage,
} from "@/lib/email/renewal-template";

/**
 * WhatsApp renewal messages reuse the same escalation stages as email
 * (gentle → urgent → final). Each stage maps to a distinct pre-approved Meta
 * template; our code only supplies the BODY variable values.
 *
 * Approved template BODY layout (kept intentionally minimal — 2 variables):
 *   {{1}} = company name (greeting)
 *   {{2}} = certificate summary (single line — see constraint below)
 * The tone, call-to-action, and (for `final`) the "certificate will be removed /
 * a new certificate costs more than renewal" warning live in the approved
 * template text itself, not in variables.
 *
 * IMPORTANT Meta constraint: template body PARAMETERS may not contain newlines,
 * tabs, or 4+ consecutive spaces, so multiple certificates are joined onto ONE
 * line with "; " rather than a bulleted list.
 */

export const WHATSAPP_LANGUAGE_CODE =
  process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en";

export const WHATSAPP_TEMPLATE_NAMES: Record<RenewalStage, string> = {
  gentle: process.env.WHATSAPP_TEMPLATE_GENTLE ?? "renewal_reminder_gentle",
  urgent: process.env.WHATSAPP_TEMPLATE_URGENT ?? "renewal_reminder_urgent",
  final: process.env.WHATSAPP_TEMPLATE_FINAL ?? "renewal_reminder_final",
};

export function getWhatsAppTemplateForType(
  emailType: RenewalEmailType
): string {
  return WHATSAPP_TEMPLATE_NAMES[getRenewalStage(emailType)];
}

/** Single-line certificate summary safe for a WhatsApp body parameter. */
export function formatCertificateSummaryLine(
  certificates: TemplateCertificate[],
  emailType: RenewalEmailType
): string {
  const verb = getRenewalStage(emailType) === "final" ? "expired on" : "will expire on";

  return certificates
    .map(
      (cert) =>
        `Cert# ${cert.certificateNo} (${cert.item}) ${verb} ${cert.expiry} — Rs. ${cert.renewalAmount}k`
    )
    .join("; ");
}

/**
 * Ordered BODY variable values for the approved template:
 *   [0] → {{1}} company name
 *   [1] → {{2}} certificate summary line
 */
export function buildRenewalWhatsAppParams(
  certificates: TemplateCertificate[],
  companyName: string,
  emailType: RenewalEmailType
): string[] {
  return [companyName, formatCertificateSummaryLine(certificates, emailType)];
}
