import { describe, expect, it } from "vitest";
import {
  extractPlaceholders,
  renderTemplate,
  validateTemplate,
} from "@/lib/email/template-renderer";
import { DEFAULT_PREVIEW_VARIABLES } from "@/lib/marketing/template-types";

describe("renderTemplate", () => {
  it("replaces placeholders in html and subject", () => {
    const result = renderTemplate(
      "<p>Hello {contact_person} at {company_name}</p>",
      "Update for {company_name}",
      DEFAULT_PREVIEW_VARIABLES
    );

    expect(result.html).toContain("Hello John Smith at ACME Corp");
    expect(result.subject).toBe("Update for ACME Corp");
  });

  it("leaves unknown placeholders unchanged", () => {
    const result = renderTemplate(
      "<p>{unknown_var}</p>",
      "Subject",
      DEFAULT_PREVIEW_VARIABLES
    );

    expect(result.html).toContain("{unknown_var}");
  });
});

describe("extractPlaceholders", () => {
  it("finds unique variable names", () => {
    expect(
      extractPlaceholders("Hi {contact_person}, cert {certificate_no} for {company_name}")
    ).toEqual(["certificate_no", "company_name", "contact_person"]);
  });
});

describe("validateTemplate", () => {
  it("passes valid template", () => {
    const result = validateTemplate({
      name: "Test",
      subject: "Hello {company_name}",
      html_content: "<p>Dear {contact_person}</p>",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports required field errors", () => {
    const result = validateTemplate({
      name: "",
      subject: "",
      html_content: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("warns on unknown variables", () => {
    const result = validateTemplate({
      name: "Test",
      subject: "Hello {company_name}",
      html_content: "<p>{custom_field}</p>",
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("custom_field"))).toBe(true);
  });

  it("detects mismatched braces", () => {
    const result = validateTemplate({
      name: "Test",
      subject: "Broken {company_name",
      html_content: "<p>OK {contact_person}</p>",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("subject"))).toBe(true);
  });
});
