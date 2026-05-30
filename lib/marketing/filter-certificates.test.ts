import { describe, expect, it } from "vitest";
import {
  filterCertificatesForMarketing,
  hasActiveMarketingFilter,
} from "@/lib/marketing/filter-certificates";
import type { CertificateRow } from "@/lib/renewals/types";

const sampleCerts: CertificateRow[] = [
  {
    id: "1",
    certificate_no: "C001",
    company_name: "ACME",
    item: "PPE Gloves",
    expiry_date: "2026-03-16",
    recipient_email: "a@example.com",
    renewal_amount: 50,
    ops_status: "pending",
    contact_person: "Alice",
  },
  {
    id: "2",
    certificate_no: "C002",
    company_name: "ACME",
    item: "Electronics",
    expiry_date: "2026-04-01",
    recipient_email: "a@example.com",
    renewal_amount: 30,
    ops_status: "done",
    contact_person: null,
  },
  {
    id: "3",
    certificate_no: "C003",
    company_name: "Beta Corp",
    item: "PPE Mask",
    expiry_date: "2026-03-10",
    recipient_email: "b@example.com",
    renewal_amount: 40,
    ops_status: "",
    contact_person: "Bob",
  },
];

describe("filterCertificatesForMarketing", () => {
  it("requires at least one filter", () => {
    expect(hasActiveMarketingFilter({
      items: [],
      item_match: "exact",
      companies: [],
      exclude_done: true,
    })).toBe(false);

    expect(
      filterCertificatesForMarketing(sampleCerts, {
        items: [],
        item_match: "exact",
        companies: [],
        exclude_done: true,
      })
    ).toEqual([]);
  });

  it("filters by exact item match and excludes done by default", () => {
    const result = filterCertificatesForMarketing(sampleCerts, {
      items: ["PPE Gloves"],
      item_match: "exact",
      companies: [],
      exclude_done: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].certificate_no).toBe("C001");
  });

  it("filters by contains item match", () => {
    const result = filterCertificatesForMarketing(sampleCerts, {
      items: ["PPE"],
      item_match: "contains",
      companies: [],
      exclude_done: true,
    });

    expect(result.map((cert) => cert.certificate_no).sort()).toEqual([
      "C001",
      "C003",
    ]);
  });

  it("filters by company multiselect", () => {
    const result = filterCertificatesForMarketing(sampleCerts, {
      items: ["Electronics"],
      item_match: "exact",
      companies: ["ACME"],
      exclude_done: false,
    });

    expect(result).toHaveLength(1);
    expect(result[0].certificate_no).toBe("C002");
  });
});
