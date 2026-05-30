import {
  formatExpiryDisplay,
  formatRenewalAmount,
} from "@/lib/renewals/prepare-email-data";
import type { CertificateRow } from "@/lib/renewals/types";
import type { TemplateVariables } from "@/lib/marketing/template-types";

function deriveContactPerson(
  email: string,
  contactPerson: string | null
): string {
  if (contactPerson?.trim()) {
    return contactPerson.trim();
  }

  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildRecipientTemplateVariables(
  certificates: CertificateRow[]
): TemplateVariables {
  if (certificates.length === 0) {
    return {
      company_name: "",
      contact_person: "",
      certificate_no: "",
      item: "",
      expiry_date: "",
      renewal_amount: "",
    };
  }

  const first = certificates[0];
  const items = Array.from(
    new Set(certificates.map((cert) => cert.item?.trim()).filter(Boolean))
  ) as string[];
  const certNumbers = certificates.map((cert) => cert.certificate_no);

  let certificateNo: string;
  if (certificates.length === 1) {
    certificateNo = first.certificate_no;
  } else if (certificates.length <= 3) {
    certificateNo = `${certificates.length} certificates (${certNumbers.join(", ")})`;
  } else {
    certificateNo = `${certificates.length} certificates (${certNumbers.slice(0, 3).join(", ")}, ...)`;
  }

  let expiryDate: string;
  if (certificates.length === 1) {
    expiryDate = formatExpiryDisplay(first.expiry_date);
  } else {
    expiryDate = "Multiple dates";
  }

  let renewalAmount: string;
  if (certificates.length === 1) {
    renewalAmount = formatRenewalAmount(first.renewal_amount);
  } else {
    const total = certificates.reduce(
      (sum, cert) => sum + (cert.renewal_amount ?? 0),
      0
    );
    renewalAmount = total > 0 ? String(total) : "Contact us";
  }

  return {
    company_name: first.company_name,
    contact_person: deriveContactPerson(
      first.recipient_email,
      first.contact_person
    ),
    certificate_no: certificateNo,
    item: items.join(", "),
    expiry_date: expiryDate,
    renewal_amount: renewalAmount,
  };
}
