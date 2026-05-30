import type {
  CertificateRow,
  GroupedRenewalEmail,
  RenewalEmailMap,
  RenewalStats,
  TemplateCertificate,
} from "@/lib/renewals/types";

export function formatExpiryDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

export function formatRenewalAmount(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) return "0";
  return String(amount);
}

function toTemplateCertificate(row: CertificateRow): TemplateCertificate {
  return {
    certificateNo: row.certificate_no,
    item: row.item ?? "",
    expiry: formatExpiryDisplay(row.expiry_date),
    companyName: row.company_name,
    renewalAmount: formatRenewalAmount(row.renewal_amount),
  };
}

export function filterActiveCertificates(
  certificates: CertificateRow[]
): CertificateRow[] {
  return certificates.filter(
    (cert) => cert.ops_status.trim().toLowerCase() !== "done"
  );
}

export function filterCertificatesByExpiryMonth(
  certificates: CertificateRow[],
  targetMonth: number,
  targetYear: number
): CertificateRow[] {
  return certificates.filter((cert) => {
    const [year, month] = cert.expiry_date.split("-").map(Number);
    return month === targetMonth && year === targetYear;
  });
}

export function groupCertificatesByEmail(
  certificates: CertificateRow[]
): RenewalEmailMap {
  const grouped = new Map<string, GroupedRenewalEmail>();

  for (const cert of certificates) {
    const email = cert.recipient_email.trim().toLowerCase();
    if (!email) continue;

    const templateCert = toTemplateCertificate(cert);
    const existing = grouped.get(email);

    if (existing) {
      existing.certificates.push(templateCert);
      existing.certificateCount = existing.certificates.length;
    } else {
      grouped.set(email, {
        recipientEmail: email,
        company: cert.company_name,
        certificates: [templateCert],
        certificateCount: 1,
      });
    }
  }

  return Object.fromEntries(grouped);
}

export function prepareEmailData(
  certificates: CertificateRow[],
  targetMonth: number,
  targetYear: number
): {
  emailData: RenewalEmailMap;
  filteredCertificates: CertificateRow[];
} {
  const active = filterActiveCertificates(certificates);
  const filtered = filterCertificatesByExpiryMonth(
    active,
    targetMonth,
    targetYear
  );
  const emailData = groupCertificatesByEmail(filtered);

  return { emailData, filteredCertificates: filtered };
}

export function computeRenewalStats(
  filteredCertificates: CertificateRow[]
): RenewalStats {
  const companies = new Set(
    filteredCertificates.map((c) => c.company_name.trim()).filter(Boolean)
  );
  const emails = new Set(
    filteredCertificates
      .map((c) => c.recipient_email.trim().toLowerCase())
      .filter(Boolean)
  );
  const totalRenewalAmount = filteredCertificates.reduce(
    (sum, cert) => sum + (cert.renewal_amount ?? 0),
    0
  );

  return {
    totalCertificates: filteredCertificates.length,
    uniqueCompanies: companies.size,
    uniqueEmails: emails.size,
    totalRenewalAmount,
  };
}

export function getAvailableMonthsYears(certificates: CertificateRow[]): {
  months: number[];
  years: number[];
} {
  const months = new Set<number>();
  const years = new Set<number>();

  for (const cert of certificates) {
    const [year, month] = cert.expiry_date.split("-").map(Number);
    if (year && month) {
      months.add(month);
      years.add(year);
    }
  }

  return {
    months: [...months].sort((a, b) => a - b),
    years: [...years].sort((a, b) => a - b),
  };
}
