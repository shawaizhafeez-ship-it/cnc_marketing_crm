import { describe, expect, it } from "vitest";
import { dedupeCertificatesByNumber } from "@/lib/sheets/sync";
import type { CertificateUpsert } from "@/lib/sheets/types";

function cert(
  certificateNo: string,
  company = "ACME"
): CertificateUpsert {
  return {
    certificate_no: certificateNo,
    company_name: company,
    item: null,
    expiry_date: "2026-12-31",
    recipient_email: "test@example.com",
    renewal_amount: null,
    ops_status: "pending",
    contact_person: null,
    sheet_row_hash: `hash-${certificateNo}-${company}`,
    last_synced_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("dedupeCertificatesByNumber", () => {
  it("keeps one row per certificate number", () => {
    const result = dedupeCertificatesByNumber([
      cert("C-001", "First"),
      cert("C-002"),
      cert("C-001", "Last"),
    ]);

    expect(result).toHaveLength(2);
    expect(result.find((row) => row.certificate_no === "C-001")?.company_name).toBe(
      "Last"
    );
  });
});
