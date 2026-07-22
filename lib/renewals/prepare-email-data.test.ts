import { describe, expect, it } from "vitest";
import {
  filterActiveCertificates,
  filterCertificatesByExpiryMonth,
  groupCertificatesByEmail,
  prepareEmailData,
} from "@/lib/renewals/prepare-email-data";
import type { CertificateRow } from "@/lib/renewals/types";

const sampleCerts: CertificateRow[] = [
  {
    id: "1",
    certificate_no: "C001",
    company_name: "ACME",
    item: "PPE",
    expiry_date: "2026-03-16",
    recipient_email: "a@example.com",
    renewal_amount: 50,
    ops_status: "",
    contact_person: null,
    phone: null,
  },
  {
    id: "2",
    certificate_no: "C002",
    company_name: "ACME",
    item: "Gloves",
    expiry_date: "2026-03-20",
    recipient_email: "a@example.com",
    renewal_amount: 30,
    ops_status: "",
    contact_person: null,
    phone: null,
  },
  {
    id: "3",
    certificate_no: "C003",
    company_name: "Beta",
    item: "Mask",
    expiry_date: "2026-03-10",
    recipient_email: "b@example.com",
    renewal_amount: 40,
    ops_status: "done",
    contact_person: null,
    phone: null,
  },
];

describe("prepareEmailData", () => {
  it("excludes done ops status and groups by email", () => {
    const { emailData, filteredCertificates } = prepareEmailData(
      sampleCerts,
      3,
      2026
    );

    expect(filteredCertificates).toHaveLength(2);
    expect(Object.keys(emailData)).toEqual(["a@example.com"]);
    expect(emailData["a@example.com"].certificateCount).toBe(2);
  });

  it("filters by expiry month", () => {
    const filtered = filterCertificatesByExpiryMonth(sampleCerts, 3, 2026);
    expect(filtered).toHaveLength(3);
    const april = filterCertificatesByExpiryMonth(sampleCerts, 4, 2026);
    expect(april).toHaveLength(0);
  });

  it("filters active certificates", () => {
    const active = filterActiveCertificates(sampleCerts);
    expect(active).toHaveLength(2);
  });

  it("groups multiple certs per email", () => {
    const active = filterActiveCertificates(sampleCerts);
    const grouped = groupCertificatesByEmail(active);
    expect(grouped["a@example.com"].certificates).toHaveLength(2);
  });
});
