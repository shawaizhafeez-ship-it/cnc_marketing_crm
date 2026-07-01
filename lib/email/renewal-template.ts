import type { TemplateCertificate } from "@/lib/renewals/types";

/**
 * Renewal touchpoints escalate in tone:
 *   gentle  → touchpoint 1 (15 days before) — friendly reminder
 *   urgent  → touchpoint 2 (around expiry)  — act now, deadline is close
 *   final   → touchpoint 3 (after expiry)   — final notice; certificate will be
 *             removed from the system and a new (costlier) one required.
 *
 * RENEWAL_EMAIL_SUBJECT is kept for the manual one-off send path, which uses the
 * gentle first-touch tone.
 */
export const RENEWAL_EMAIL_SUBJECT = "Reminder: Your CE Certificate Renewal is Approaching";

export type RenewalStage = "gentle" | "urgent" | "final";

export const RENEWAL_SUBJECTS: Record<RenewalStage, string> = {
  gentle: "Reminder: Your CE Certificate Renewal is Approaching",
  urgent: "Action Required: Your CE Certificate Renewal is Due",
  final:
    "Final Notice: Your CE Certificate Has Expired — Immediate Action Required",
};

const FOOTER_TEMPLATE = `
<p><strong><u>Our Bank Detail:</u></strong></p>
<p>Beneficiary Name:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;<strong>CNC Services</strong><br />IBAN.:&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;<span lang="X-NONE">PK10MEZN000</span>1<span lang="X-NONE">310111763327<br />A/C No.&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 0131-0111-7633-2-7<br /></span>Bank Name:&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Meezan Bank &nbsp;</p>
<p>&nbsp;</p>
<p class="MsoNormal" style="-webkit-text-stroke-width: 0px; background-color: #ffffff; color: #222222; font-family: Arial, Helvetica, sans-serif; font-size: small; font-style: normal; font-variant-caps: normal; font-variant-ligatures: normal; font-weight: 400; letter-spacing: normal; margin: 0px; orphans: 2; text-align: start; text-decoration-color: initial; text-decoration-style: initial; text-decoration-thickness: initial; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px;"><span style="font-size: 11pt;"><span dir="ltr" lang="EN-US">Regards,</span></span></p>
<p class="MsoNormal" style="-webkit-text-stroke-width: 0px; background-color: #ffffff; color: #222222; font-family: Arial, Helvetica, sans-serif; font-size: small; font-style: normal; font-variant-caps: normal; font-variant-ligatures: normal; font-weight: 400; letter-spacing: normal; margin: 0px 0px 12pt; orphans: 2; text-align: start; text-decoration-color: initial; text-decoration-style: initial; text-decoration-thickness: initial; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px;"><span style="font-size: 11pt;"><span dir="ltr" lang="EN-US">Fahad Hussain | </span></span><span style="color: #156082; font-size: 11pt;"><span dir="ltr" lang="EN-US"><strong>Renewal Manager</strong></span></span></p>
<p class="MsoNormal" style="-webkit-text-stroke-width: 0px; background-color: #ffffff; color: #222222; font-family: Arial, Helvetica, sans-serif; font-size: small; font-style: normal; font-variant-caps: normal; font-variant-ligatures: normal; font-weight: 400; letter-spacing: normal; margin: 0px 0px 12pt; orphans: 2; text-align: start; text-decoration-color: initial; text-decoration-style: initial; text-decoration-thickness: initial; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px;"><span style="color: #156082; font-size: 11pt;"><span dir="ltr" lang="EN-US"><strong>CNC Services</strong></span></span><br /><span style="font-size: 11pt;"><em>Bukhari Commercial,D.H.A Phase 6, Karachi, Pakistan</em></span><br /><span style="font-size: 11pt;"><em><span dir="ltr" lang="EN-US">Email: </span></em></span><a style="color: #1155cc;" href="mailto:info@cncservices.net" target="_blank"><span style="color: #467886; font-size: 11pt;"><em><span dir="ltr" lang="EN-US">info@cncservices.net</span></em></span></a><span style="font-size: 11pt;"><em><span dir="ltr" lang="EN-US"> &nbsp;| Website: </span></em></span><a style="color: #1155cc;" href="http://www.cncservices.net/" target="_blank" rel="noopener noreferrer"><span style="color: #467886; font-size: 11pt;"><em><span dir="ltr" lang="EN-US">www.cncservices.net</span></em></span></a></p>
<p class="MsoNormal" style="-webkit-text-stroke-width: 0px; background-color: #ffffff; color: #222222; font-family: Arial, Helvetica, sans-serif; font-size: small; font-style: normal; font-variant-caps: normal; font-variant-ligatures: normal; font-weight: 400; letter-spacing: normal; margin: 0px; orphans: 2; text-align: start; text-decoration-color: initial; text-decoration-style: initial; text-decoration-thickness: initial; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px;"><span style="color: #156082; font-size: 11pt;"><span dir="ltr" lang="EN-US"><strong>We Provide assistance with CE Marking, RoHS, REACH</strong></span></span></p>
<p class="MsoNormal" style="-webkit-text-stroke-width: 0px; background-color: #ffffff; color: #222222; font-family: Arial, Helvetica, sans-serif; font-size: small; font-style: normal; font-variant-caps: normal; font-variant-ligatures: normal; font-weight: 400; letter-spacing: normal; margin: 0px; orphans: 2; text-align: start; text-decoration-color: initial; text-decoration-style: initial; text-decoration-thickness: initial; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px;">&nbsp;</p>
<p>&nbsp;</p>
`;

const GENTLE_BODY_TEMPLATE = `
<p>Hello,</p>
<p>&nbsp;</p>
<p>We hope this email finds you well. This is a friendly reminder that the following <strong>CE certificate(s)</strong> will be expiring soon:</p>
<p>&nbsp;</p>
<ol>{certificate_list}</ol>
<p>&nbsp;</p>
<p>To ensure there is no disruption to your business, we recommend starting the renewal process early. Simply reply to this email, and we will assist you promptly.</p>
<p>&nbsp;</p>
${FOOTER_TEMPLATE}
`;

const URGENT_BODY_TEMPLATE = `
<p>Hello,</p>
<p>&nbsp;</p>
<p>We are following up on our earlier reminder regarding your <strong>CE certificate(s)</strong>. Our records show the following certificate(s) still require renewal, and the deadline is now very close:</p>
<p>&nbsp;</p>
<ol>{certificate_list}</ol>
<p>&nbsp;</p>
<p><strong>Please act now to avoid a lapse in your certification.</strong> A gap in your CE marking can interrupt your ability to trade and place your compliance at risk. Reply to this email today and we will prioritise your renewal.</p>
<p>&nbsp;</p>
${FOOTER_TEMPLATE}
`;

const FINAL_BODY_TEMPLATE = `
<p>Hello,</p>
<p>&nbsp;</p>
<p>This is our <strong>final notice</strong> regarding your <strong>CE certificate(s)</strong>. Despite our previous reminders, the following certificate(s) have now expired:</p>
<p>&nbsp;</p>
<ol>{certificate_list}</ol>
<p>&nbsp;</p>
<p><strong>Important:</strong> if we do not hear from you shortly, this certificate will be <strong>permanently removed from our system</strong>. Once removed, it can no longer be renewed &mdash; you will be required to apply for an entirely <strong>new certificate, which costs significantly more than a standard renewal</strong>, along with additional processing time.</p>
<p>&nbsp;</p>
<p>To avoid this additional cost and reinstate your compliance, please reply to this email immediately and we will assist you right away.</p>
<p>&nbsp;</p>
${FOOTER_TEMPLATE}
`;

const BODY_TEMPLATES: Record<RenewalStage, string> = {
  gentle: GENTLE_BODY_TEMPLATE,
  urgent: URGENT_BODY_TEMPLATE,
  final: FINAL_BODY_TEMPLATE,
};

export type RenewalEmailType =
  | "15_days_before"
  | "30_days_before"
  | "1_week_after"
  | "2_weeks_after";

export function getRenewalStage(emailType: RenewalEmailType): RenewalStage {
  if (emailType === "15_days_before") {
    return "gentle";
  }
  if (emailType === "30_days_before" || emailType === "1_week_after") {
    return "urgent";
  }
  return "final";
}

export function getRenewalSubjectForType(emailType: RenewalEmailType): string {
  return RENEWAL_SUBJECTS[getRenewalStage(emailType)];
}

export function getRenewalSubjectForTouchpoint(
  touchpointNumber: number
): string {
  if (touchpointNumber === 1) {
    return RENEWAL_SUBJECTS.gentle;
  }
  if (touchpointNumber === 2) {
    return RENEWAL_SUBJECTS.urgent;
  }
  return RENEWAL_SUBJECTS.final;
}

function formatCertificateListItem(
  cert: TemplateCertificate,
  emailType: RenewalEmailType
): string {
  const preExpiry = getRenewalStage(emailType) !== "final";
  const verb = preExpiry ? "will expire on" : "expired on";

  return `<li>Certificate# ${cert.certificateNo} for ${cert.item} (${cert.companyName}) ${verb} ${cert.expiry}, Renewal Charges: Rs. ${cert.renewalAmount}k</li>`;
}

export function formatCertificateListHtml(
  certificates: TemplateCertificate[],
  emailType: RenewalEmailType = "15_days_before"
): string {
  return certificates
    .map((cert) => formatCertificateListItem(cert, emailType))
    .join("\n");
}

export function generateRenewalEmailHtml(
  certificates: TemplateCertificate[],
  emailType: RenewalEmailType = "15_days_before"
): string {
  const certificateList = formatCertificateListHtml(certificates, emailType);
  const stage = getRenewalStage(emailType);
  return BODY_TEMPLATES[stage].replace("{certificate_list}", certificateList);
}
