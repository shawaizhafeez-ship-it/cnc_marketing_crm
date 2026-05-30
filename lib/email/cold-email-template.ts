export const DEFAULT_COLD_EMAIL_SUBJECT = "Get CE Marking Now";

export const COLD_EMAIL_VARIANT = "variant 4";

const UNSUBSCRIBE_URL = "http://www.cncservices.net/";

/**
 * Default cold email HTML from legacy Jupyter notebook (CNC Emal Marketing_1000list).
 * Placeholder: {{company}}
 */
export const DEFAULT_COLD_EMAIL_HTML = `<p>Dear {{company}},</p>
<p>At CNC Services, we specialize in <strong>CE marking</strong> certification for various <strong>products and directives (PPE, MDR, LVD, MD, CPR)</strong>.</p>
<p>Our services include:</p>
<ul>
<li><strong>Category 1 compliance</strong> &ndash; completed in just 3 days.</li>
<li><strong>Category 1 compliance</strong> with accredited lab testing &ndash; completed within 2 weeks.</li>
<li><strong>Category 2 certification</strong> &ndash; conducted through our trusted notified body partners in Croatia and Italy (4 weeks of testing, 2 weeks for certification).</li>
</ul>
<p>All certificates can be verified online.</p>
<p>With 15 years of expertise, we streamline your certification process, ensuring regulatory compliance while accelerating your product's time to market partnering with EU Notified Bodies &amp; Govt. accredited labs.</p>
<p><strong>Interested in certifying your products?</strong><br />Reply to this email or visit website or call/whatsapp us &nbsp;0340-6881029</p>
<p><a href="https://www.linkedin.com/posts/cnc-services12_ceawareness-cecertification-cncservices-activity-7353757657926660097-8kh0">Watch our CE Certification Awareness Video</a></p>
<p><strong>Best regards,</strong></p>
<p><strong>Fahad Hussain</strong> | Operation Manager<br /><strong>CNC Services</strong><br />Bukhari Commercial, D.H.A Phase 6, Karachi, Pakistan<br />Email: <a href="mailto:info@cncservices.net">info@cncservices.net</a> | Website: <a href="http://www.cncservices.net/" target="_blank">www.cncservices.net</a></p>
<p><strong>We provide assistance with CE Marking, RoHS, and REACH compliance.</strong></p>
<p>If you no longer wish to receive emails from us, you can <a style="color: #156082;" href="${UNSUBSCRIBE_URL}">unsubscribe here</a></p>`;

export function renderColdEmailHtml(
  template: string,
  companyName: string
): string {
  const company = companyName.trim() || "Valued Client";
  return template.replaceAll("{{company}}", company);
}
