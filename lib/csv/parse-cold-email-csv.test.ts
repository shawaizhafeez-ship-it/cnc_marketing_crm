import { describe, expect, it } from "vitest";
import { parseColdEmailCsv } from "@/lib/csv/parse-cold-email-csv";
import {
  DEFAULT_COLD_EMAIL_HTML,
  DEFAULT_COLD_EMAIL_SUBJECT,
  renderColdEmailHtml,
} from "@/lib/email/cold-email-template";

describe("parseColdEmailCsv", () => {
  it("parses email and company columns", () => {
    const csv = `email,company
alice@example.com,ACME Ltd
bob@example.com,Beta Corp`;

    const result = parseColdEmailCsv(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      email: "alice@example.com",
      company: "ACME Ltd",
      elvResult: null,
    });
  });

  it("filters by ELV Result when verifiedOnly is enabled", () => {
    const csv = `email,company,ELV Result
ok@example.com,Good Co,ok
bad@example.com,Bad Co,invalid`;

    const result = parseColdEmailCsv(csv, { verifiedOnly: true });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe("ok@example.com");
    expect(result.skipped).toBe(1);
  });

  it("deduplicates emails", () => {
    const csv = `email,company
dup@example.com,First
dup@example.com,Second`;

    const result = parseColdEmailCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });
});

describe("renderColdEmailHtml", () => {
  it("replaces company placeholder", () => {
    const html = renderColdEmailHtml(DEFAULT_COLD_EMAIL_HTML, "Test Company");
    expect(html).toContain("Dear Test Company,");
    expect(html).not.toContain("{{company}}");
  });

  it("uses fallback company name when empty", () => {
    const html = renderColdEmailHtml("<p>Dear {{company}},</p>", "  ");
    expect(html).toContain("Dear Valued Client,");
  });
});

describe("cold email defaults", () => {
  it("matches notebook subject", () => {
    expect(DEFAULT_COLD_EMAIL_SUBJECT).toBe("Get CE Marking Now");
  });
});
