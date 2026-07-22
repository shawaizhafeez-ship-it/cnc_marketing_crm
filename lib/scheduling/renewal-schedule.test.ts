import { describe, expect, it } from "vitest";
import {
  buildScheduledEmails,
  countRecipientsMissingPhone,
  getAnchorDateString,
  getMonthAnchor,
  getTouchpointDate,
  getTouchpointPreviews,
  summarizeScheduledEmails,
  TOUCHPOINT_OFFSETS,
} from "@/lib/scheduling/renewal-schedule";
import type { CertificateRow } from "@/lib/renewals/types";

function isoDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

describe("renewal-schedule", () => {
  describe("getMonthAnchor", () => {
    it("returns 1st of month in UTC", () => {
      const anchor = getMonthAnchor(2026, 3);
      expect(anchor.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    });
  });

  describe("getTouchpointDate — March 2026 example", () => {
    /**
     * Certificate expiring March 16, 2026 uses anchor March 1, 2026:
     *   TP1 → Feb 14, TP2 → Mar 15, TP3 → Mar 29
     */
    const anchor = getMonthAnchor(2026, 3);

    it("touchpoint 1 is 15 days before anchor", () => {
      const tp1 = getTouchpointDate(anchor, 1);
      expect(isoDateOnly(tp1.toISOString())).toBe("2026-02-14");
      expect(tp1.getUTCHours()).toBe(9);
    });

    it("touchpoint 2 is 14 days after anchor", () => {
      const tp2 = getTouchpointDate(anchor, 2);
      expect(isoDateOnly(tp2.toISOString())).toBe("2026-03-15");
    });

    it("touchpoint 3 is 28 days after anchor", () => {
      const tp3 = getTouchpointDate(anchor, 3);
      expect(isoDateOnly(tp3.toISOString())).toBe("2026-03-29");
    });
  });

  describe("getTouchpointDate — January edge case", () => {
    it("touchpoint 1 falls in prior year", () => {
      const anchor = getMonthAnchor(2026, 1);
      const tp1 = getTouchpointDate(anchor, 1);
      expect(isoDateOnly(tp1.toISOString())).toBe("2025-12-17");
    });

    it("touchpoint 2 and 3 remain in January", () => {
      const anchor = getMonthAnchor(2026, 1);
      expect(isoDateOnly(getTouchpointDate(anchor, 2).toISOString())).toBe(
        "2026-01-15"
      );
      expect(isoDateOnly(getTouchpointDate(anchor, 3).toISOString())).toBe(
        "2026-01-29"
      );
    });
  });

  describe("offsets", () => {
    it("matches documented offsets", () => {
      expect(TOUCHPOINT_OFFSETS[1]).toBe(-15);
      expect(TOUCHPOINT_OFFSETS[2]).toBe(14);
      expect(TOUCHPOINT_OFFSETS[3]).toBe(28);
    });
  });

  describe("getAnchorDateString", () => {
    it("formats YYYY-MM-DD", () => {
      expect(getAnchorDateString(2026, 3)).toBe("2026-03-01");
    });
  });

  describe("buildScheduledEmails", () => {
    const certs: CertificateRow[] = [
      {
        id: "a1",
        certificate_no: "C1",
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
        id: "a2",
        certificate_no: "C2",
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
        id: "b1",
        certificate_no: "C3",
        company_name: "Beta",
        item: "Mask",
        expiry_date: "2026-03-10",
        recipient_email: "b@example.com",
        renewal_amount: 40,
        ops_status: "",
        contact_person: null,
        phone: null,
      },
    ];

    it("groups certs by recipient per touchpoint", () => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      const scheduled = buildScheduledEmails(
        certs,
        "campaign-id",
        2026,
        3,
        { now }
      );

      // 2 recipients × 3 touchpoints = 6 rows
      expect(scheduled).toHaveLength(6);

      const acmeTp1 = scheduled.find(
        (s) => s.recipient_email === "a@example.com" && s.touchpoint_number === 1
      );
      expect(acmeTp1?.certificate_ids).toEqual(["a1", "a2"]);
      expect(acmeTp1?.certificate_snapshot).toHaveLength(2);
    });

    it("skips touchpoints already in the past", () => {
      const now = new Date("2026-03-20T00:00:00.000Z");
      const scheduled = buildScheduledEmails(
        certs,
        "campaign-id",
        2026,
        3,
        { now }
      );

      // Only TP3 (Mar 29) remains for each recipient
      expect(scheduled).toHaveLength(2);
      expect(scheduled.every((s) => s.touchpoint_number === 3)).toBe(true);
    });

    it("returns empty when all touchpoints are past", () => {
      const now = new Date("2026-04-01T00:00:00.000Z");
      const scheduled = buildScheduledEmails(
        certs,
        "campaign-id",
        2026,
        3,
        { now }
      );
      expect(scheduled).toHaveLength(0);
    });
  });

  describe("multi-channel scheduling", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const withPhone: CertificateRow = {
      id: "p1",
      certificate_no: "P1",
      company_name: "Phoned Co",
      item: "PPE",
      expiry_date: "2026-03-16",
      recipient_email: "phone@example.com",
      renewal_amount: 50,
      ops_status: "",
      contact_person: null,
      phone: "923001234567",
    };
    const noPhone: CertificateRow = {
      ...withPhone,
      id: "n1",
      certificate_no: "N1",
      recipient_email: "nophone@example.com",
      phone: null,
    };

    it("defaults to email-only (channel set, no phone)", () => {
      const scheduled = buildScheduledEmails([withPhone], "c", 2026, 3, { now });
      expect(scheduled).toHaveLength(3);
      expect(scheduled.every((s) => s.channel === "email")).toBe(true);
      expect(scheduled.every((s) => s.recipient_phone === null)).toBe(true);
    });

    it("emits 6 rows for 'both' when the recipient has a phone", () => {
      const scheduled = buildScheduledEmails([withPhone], "c", 2026, 3, {
        now,
        channels: ["email", "whatsapp"],
      });
      expect(scheduled).toHaveLength(6);
      const wa = scheduled.filter((s) => s.channel === "whatsapp");
      expect(wa).toHaveLength(3);
      expect(wa.every((s) => s.recipient_phone === "923001234567")).toBe(true);
    });

    it("skips whatsapp rows for recipients without a phone", () => {
      const scheduled = buildScheduledEmails([noPhone], "c", 2026, 3, {
        now,
        channels: ["email", "whatsapp"],
      });
      // email TP1-3 only; no whatsapp rows
      expect(scheduled).toHaveLength(3);
      expect(scheduled.every((s) => s.channel === "email")).toBe(true);
    });

    it("summarizes per-channel counts", () => {
      const scheduled = buildScheduledEmails([withPhone], "c", 2026, 3, {
        now,
        channels: ["email", "whatsapp"],
      });
      const summary = summarizeScheduledEmails([withPhone], scheduled);
      expect(summary.channelCounts).toEqual({ email: 3, whatsapp: 3 });
    });

    it("counts recipients missing a phone", () => {
      expect(countRecipientsMissingPhone([withPhone, noPhone])).toBe(1);
    });
  });

  describe("getTouchpointPreviews", () => {
    it("marks past touchpoints", () => {
      const previews = getTouchpointPreviews(
        2026,
        3,
        9,
        new Date("2026-03-20T00:00:00.000Z")
      );
      expect(previews.filter((p) => p.isPast)).toHaveLength(2);
      expect(previews.find((p) => p.touchpointNumber === 3)?.isPast).toBe(false);
    });
  });
});
