import { describe, expect, it } from "vitest";
import {
  buildRenewalWhatsAppParams,
  formatCertificateSummaryLine,
  getWhatsAppTemplateForType,
  WHATSAPP_TEMPLATE_NAMES,
} from "@/lib/whatsapp/renewal-template";
import type { TemplateCertificate } from "@/lib/renewals/types";

const certs: TemplateCertificate[] = [
  {
    certificateNo: "CE-1",
    item: "Machinery",
    expiry: "16 March 2026",
    companyName: "ABC Ltd",
    renewalAmount: "25",
  },
  {
    certificateNo: "CE-2",
    item: "Toys",
    expiry: "20 March 2026",
    companyName: "ABC Ltd",
    renewalAmount: "10",
  },
];

describe("getWhatsAppTemplateForType", () => {
  it("maps each stage to its approved template name", () => {
    expect(getWhatsAppTemplateForType("15_days_before")).toBe(
      WHATSAPP_TEMPLATE_NAMES.gentle
    );
    expect(getWhatsAppTemplateForType("30_days_before")).toBe(
      WHATSAPP_TEMPLATE_NAMES.urgent
    );
    expect(getWhatsAppTemplateForType("2_weeks_after")).toBe(
      WHATSAPP_TEMPLATE_NAMES.final
    );
  });
});

describe("formatCertificateSummaryLine", () => {
  it("uses future tense before expiry and joins on one line (no newlines)", () => {
    const line = formatCertificateSummaryLine(certs, "15_days_before");
    expect(line).toContain("will expire on");
    expect(line).not.toContain("expired on");
    expect(line).not.toContain("\n");
    expect(line).toContain("; ");
  });

  it("uses past tense for the final touchpoint", () => {
    const line = formatCertificateSummaryLine(certs, "2_weeks_after");
    expect(line).toContain("expired on");
    expect(line).not.toContain("will expire on");
  });
});

describe("buildRenewalWhatsAppParams", () => {
  it("returns [company, certificate summary] in order", () => {
    const params = buildRenewalWhatsAppParams(certs, "ABC Ltd", "15_days_before");
    expect(params).toHaveLength(2);
    expect(params[0]).toBe("ABC Ltd");
    expect(params[1]).toContain("CE-1");
    expect(params[1]).toContain("CE-2");
  });
});
