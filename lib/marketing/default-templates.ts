export const DEFAULT_MARKETING_TEMPLATES = [
  {
    name: "Product Update Notification",
    category: "product_updates" as const,
    subject: "Important Updates for {item} - {company_name}",
    description: "General template for product updates and announcements",
    html_content: `<p>Dear {contact_person},</p>
<p>&nbsp;</p>
<p>We hope this email finds you well. We wanted to inform you about important updates regarding <strong>{item}</strong> products.</p>
<p>&nbsp;</p>
<p><strong>Key Updates:</strong></p>
<ul>
<li>New compliance requirements</li>
<li>Updated testing procedures</li>
<li>Product specifications changes</li>
</ul>
<p>&nbsp;</p>
<p>For your certificate <strong>{certificate_no}</strong>, please note these changes may affect your renewal process.</p>
<p>&nbsp;</p>
<p>If you have any questions, please don't hesitate to contact us.</p>
<p>&nbsp;</p>
<p>Best regards,<br/>
<strong>CNC Services Team</strong><br/>
Email: info@cncservices.net<br/>
Website: www.cncservices.net</p>`,
  },
  {
    name: "Compliance News Alert",
    category: "compliance_news" as const,
    subject: "Compliance Alert: {item} Regulations Update",
    description: "Template for compliance and regulatory updates",
    html_content: `<p>Hello {contact_person},</p>
<p>&nbsp;</p>
<p>We're writing to alert you about recent regulatory changes affecting <strong>{item}</strong> products.</p>
<p>&nbsp;</p>
<p><strong>What's Changed:</strong></p>
<p>New compliance standards have been introduced that may impact your current certifications, including certificate <strong>{certificate_no}</strong>.</p>
<p>&nbsp;</p>
<p><strong>Action Required:</strong></p>
<p>Please review your current compliance status and contact us to ensure your certifications remain valid.</p>
<p>&nbsp;</p>
<p>We're here to help {company_name} navigate these changes smoothly.</p>
<p>&nbsp;</p>
<p>Regards,<br/>
<strong>CNC Services Compliance Team</strong><br/>
Email: info@cncservices.net</p>`,
  },
  {
    name: "Monthly Newsletter",
    category: "general_marketing" as const,
    subject: "CNC Services Monthly Update - {company_name}",
    description: "Monthly newsletter template for general marketing",
    html_content: `<p>Dear {contact_person},</p>
<p>&nbsp;</p>
<p>Welcome to our monthly newsletter! Here's what's happening in the world of {item} certification.</p>
<p>&nbsp;</p>
<p><strong>This Month's Highlights:</strong></p>
<ul>
<li>Industry news and trends</li>
<li>New certification services</li>
<li>Upcoming regulatory changes</li>
<li>Success stories from our clients</li>
</ul>
<p>&nbsp;</p>
<p><strong>Your Certificates:</strong></p>
<p>Don't forget about certificate <strong>{certificate_no}</strong> - we'll keep you updated on any relevant changes.</p>
<p>&nbsp;</p>
<p>Thank you for choosing CNC Services for your certification needs.</p>
<p>&nbsp;</p>
<p>Best regards,<br/>
<strong>CNC Services Team</strong><br/>
Email: info@cncservices.net<br/>
Website: www.cncservices.net</p>`,
  },
];
