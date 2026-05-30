import type { CertificateRow } from "@/lib/renewals/types";

export type ItemMatchType = "exact" | "contains";

export type MarketingFilters = {
  items: string[];
  item_match: ItemMatchType;
  companies: string[];
  exclude_done: boolean;
};

export type MarketingFilterPreview = {
  certificates: CertificateRow[];
  totalCertificates: number;
  uniqueRecipients: number;
  uniqueCompanies: number;
};

export function hasActiveMarketingFilter(filters: MarketingFilters): boolean {
  return filters.items.length > 0 || filters.companies.length > 0;
}

export function filterCertificatesForMarketing(
  certificates: CertificateRow[],
  filters: MarketingFilters
): CertificateRow[] {
  if (!hasActiveMarketingFilter(filters)) {
    return [];
  }

  let result = certificates.filter(
    (cert) => cert.recipient_email && cert.recipient_email.trim() !== ""
  );

  if (filters.exclude_done) {
    result = result.filter(
      (cert) => cert.ops_status.trim().toLowerCase() !== "done"
    );
  }

  if (filters.items.length > 0) {
    if (filters.item_match === "exact") {
      const itemSet = new Set(filters.items.map((item) => item.trim()));
      result = result.filter(
        (cert) => cert.item && itemSet.has(cert.item.trim())
      );
    } else {
      const terms = filters.items.map((item) => item.trim().toLowerCase());
      result = result.filter((cert) => {
        const item = (cert.item ?? "").toLowerCase();
        return terms.some((term) => item.includes(term));
      });
    }
  }

  if (filters.companies.length > 0) {
    const companySet = new Set(
      filters.companies.map((company) => company.trim())
    );
    result = result.filter((cert) => companySet.has(cert.company_name.trim()));
  }

  return result;
}

export function summarizeFilteredCertificates(
  certificates: CertificateRow[]
): Omit<MarketingFilterPreview, "certificates"> {
  const recipients = new Set(
    certificates.map((cert) => cert.recipient_email.trim().toLowerCase())
  );
  const companies = new Set(certificates.map((cert) => cert.company_name));

  return {
    totalCertificates: certificates.length,
    uniqueRecipients: recipients.size,
    uniqueCompanies: companies.size,
  };
}

export function getUniqueItems(certificates: CertificateRow[]): string[] {
  const items = new Set<string>();
  for (const cert of certificates) {
    if (cert.item?.trim()) {
      items.add(cert.item.trim());
    }
  }
  return Array.from(items).sort((a, b) => a.localeCompare(b));
}

export function getUniqueCompanies(certificates: CertificateRow[]): string[] {
  const companies = new Set<string>();
  for (const cert of certificates) {
    if (cert.company_name?.trim()) {
      companies.add(cert.company_name.trim());
    }
  }
  return Array.from(companies).sort((a, b) => a.localeCompare(b));
}

export function groupCertificatesByRecipient(
  certificates: CertificateRow[]
): Map<string, CertificateRow[]> {
  const grouped = new Map<string, CertificateRow[]>();

  for (const cert of certificates) {
    const email = cert.recipient_email.trim().toLowerCase();
    const list = grouped.get(email) ?? [];
    list.push(cert);
    grouped.set(email, list);
  }

  return grouped;
}
