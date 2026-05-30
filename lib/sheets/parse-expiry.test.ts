import { describe, expect, it } from "vitest";
import { parseExpiryDate } from "@/lib/sheets/parse-expiry";

describe("parseExpiryDate", () => {
  it("parses DD/MM/YYYY to ISO date", () => {
    expect(parseExpiryDate("23/10/2025")).toEqual({
      success: true,
      isoDate: "2025-10-23",
    });
  });

  it("parses single-digit day and month", () => {
    expect(parseExpiryDate("3/1/2026")).toEqual({
      success: true,
      isoDate: "2026-01-03",
    });
  });

  it("rejects empty values", () => {
    expect(parseExpiryDate("")).toEqual({
      success: false,
      error: "Expiry date is empty",
    });
    expect(parseExpiryDate(null).success).toBe(false);
  });

  it("rejects wrong format", () => {
    const result = parseExpiryDate("2025-10-23");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("DD/MM/YYYY");
    }
  });

  it("rejects invalid calendar dates", () => {
    const result = parseExpiryDate("31/02/2025");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid calendar date");
    }
  });

  it("rejects invalid month", () => {
    const result = parseExpiryDate("10/13/2025");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid month");
    }
  });

  it("trims whitespace", () => {
    expect(parseExpiryDate("  16/03/2026  ")).toEqual({
      success: true,
      isoDate: "2026-03-16",
    });
  });
});
