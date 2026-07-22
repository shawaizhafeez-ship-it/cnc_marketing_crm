import { describe, expect, it } from "vitest";
import { normalizeToE164 } from "@/lib/whatsapp/phone";

describe("normalizeToE164", () => {
  it("converts local Pakistani mobile (leading 0) to E.164", () => {
    expect(normalizeToE164("03001234567")).toBe("923001234567");
    expect(normalizeToE164("0300-1234567")).toBe("923001234567");
    expect(normalizeToE164("0300 1234567")).toBe("923001234567");
    expect(normalizeToE164("(0321) 4567890")).toBe("923214567890");
  });

  it("accepts already-international formats", () => {
    expect(normalizeToE164("+92 300 1234567")).toBe("923001234567");
    expect(normalizeToE164("923001234567")).toBe("923001234567");
    expect(normalizeToE164("0092-300-1234567")).toBe("923001234567");
  });

  it("prepends country code for bare subscriber numbers", () => {
    expect(normalizeToE164("3001234567")).toBe("923001234567");
  });

  it("takes the first number when several are jammed in one cell", () => {
    expect(normalizeToE164("0300-1234567 / 021-5551212")).toBe("923001234567");
    expect(normalizeToE164("0300 1234567 or 0311 7654321")).toBe(
      "923001234567"
    );
  });

  it("returns null for empty or unusable values", () => {
    expect(normalizeToE164("")).toBeNull();
    expect(normalizeToE164(null)).toBeNull();
    expect(normalizeToE164(undefined)).toBeNull();
    expect(normalizeToE164("N/A")).toBeNull();
    expect(normalizeToE164("12345")).toBeNull();
  });

  it("rejects landline / non-mobile numbers (not starting with 3)", () => {
    expect(normalizeToE164("021-35551212")).toBeNull();
    expect(normalizeToE164("0421234567")).toBeNull();
  });

  it("rejects numbers with too many/few digits", () => {
    expect(normalizeToE164("0300-12345")).toBeNull();
    expect(normalizeToE164("0300-123456789")).toBeNull();
  });
});
