import type { TemplateCertificate } from "@/lib/renewals/types";

export const RENEWAL_EMAIL_SUBJECT = "Renewal CE Marking";

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

const RENEWAL_BODY_TEMPLATE = `
<p>Hello,</p>
<p>&nbsp;</p>
<p>We hope this email finds you well. We would like to remind you that the following <strong>CE certificate(s)</strong> will be expiring soon:</p>
<p>&nbsp;</p>
<ol>{certificate_list}</ol>
<p>&nbsp;</p>
<p>To ensure there is no disruption to your business, we recommend starting the renewal process now. Simply reply to this email, and we will assist you promptly.</p>
<p>&nbsp;</p>
${FOOTER_TEMPLATE}
`;

export type RenewalEmailType =
  | "15_days_before"
  | "30_days_before"
  | "1_week_after"
  | "2_weeks_after";

function formatCertificateListItem(
  cert: TemplateCertificate,
  emailType: RenewalEmailType
): string {
  const preExpiry = emailType === "15_days_before" || emailType === "30_days_before";
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
  return RENEWAL_BODY_TEMPLATE.replace("{certificate_list}", certificateList);
}
