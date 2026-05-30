export type ManualEmailTemplate = {
  id: string;
  label: string;
  subject: string;
  html: string;
};

export const MANUAL_EMAIL_TEMPLATES: ManualEmailTemplate[] = [
  {
    id: "custom",
    label: "Custom (blank)",
    subject: "",
    html: "",
  },
  {
    id: "business_update",
    label: "Business Update",
    subject: "Important Update from CNC Services",
    html: `<p>Dear Valued Client,</p>
<p>&nbsp;</p>
<p>We hope this email finds you well. We are writing to inform you about important updates regarding your certificates and services with CNC Services.</p>
<p>&nbsp;</p>
<p>Please feel free to contact us if you have any questions or require further assistance.</p>
<p>&nbsp;</p>
<p>Best regards,<br/>
<strong>CNC Services Team</strong><br/>
Email: info@cncservices.net</p>`,
  },
  {
    id: "certificate_information",
    label: "Certificate Information",
    subject: "Certificate Information - CNC Services",
    html: `<p>Dear Client,</p>
<p>&nbsp;</p>
<p>Thank you for your inquiry regarding your certificate status. We have reviewed your request and would like to provide you with the following information:</p>
<p>&nbsp;</p>
<ul>
<li>Certificate Status: [Please specify]</li>
<li>Validity Period: [Please specify]</li>
<li>Next Steps: [Please specify]</li>
</ul>
<p>&nbsp;</p>
<p>If you need any clarification or have additional questions, please don't hesitate to reach out to us.</p>
<p>&nbsp;</p>
<p>Best regards,<br/>
<strong>CNC Services Team</strong><br/>
Email: info@cncservices.net</p>`,
  },
  {
    id: "general_inquiry",
    label: "General Inquiry Response",
    subject: "Re: Your Inquiry - CNC Services",
    html: `<p>Dear [Client Name],</p>
<p>&nbsp;</p>
<p>Thank you for contacting CNC Services. We have received your inquiry and appreciate you taking the time to reach out to us.</p>
<p>&nbsp;</p>
<p>We will review your request and get back to you within 1-2 business days with a detailed response.</p>
<p>&nbsp;</p>
<p>In the meantime, if you have any urgent questions, please feel free to contact us directly.</p>
<p>&nbsp;</p>
<p>Best regards,<br/>
<strong>CNC Services Team</strong><br/>
Email: info@cncservices.net</p>`,
  },
];
