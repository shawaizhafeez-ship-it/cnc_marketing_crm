import { describe, expect, it } from "vitest";
import {
  buildMarketingScheduledEmails,
  calculateDelayDays,
  calculateTouchpointDates,
} from "@/lib/scheduling/marketing-schedule";
import type { CertificateRow } from "@/lib/renewals/types";

const certs: CertificateRow[] = [
  {
    id: "cert-1",
    certificate_no: "C001",
    company_name: "ACME",
    item: "PPE",
    expiry_date: "2026-03-16",
    recipient_email: "a@example.com",
    renewal_amount: 50,
    ops_status: "",
    contact_person: "Alice",
  },
  {
    id: "cert-2",
    certificate_no: "C002",
    company_name: "Beta",
    item: "Mask",
    expiry_date: "2026-03-20",
    recipient_email: "b@example.com",
    renewal_amount: 30,
    ops_status: "",
    contact_person: null,
  },
];

describe("calculateDelayDays", () => {
  it("schedules weekly touchpoints at 0/7/14 days", () => {
    expect(calculateDelayDays("weekly", 0, 1)).toBe(0);
    expect(calculateDelayDays("weekly", 0, 2)).toBe(7);
    expect(calculateDelayDays("weekly", 0, 3)).toBe(14);
  });

  it("schedules custom day intervals from touchpoint 2", () => {
    expect(calculateDelayDays("custom_days", 10, 1)).toBe(0);
    expect(calculateDelayDays("custom_days", 10, 2)).toBe(10);
    expect(calculateDelayDays("custom_days", 10, 3)).toBe(20);
  });
});

describe("calculateTouchpointDates", () => {
  it("returns ISO dates from campaign start", () => {
    const start = new Date("2026-03-01T09:00:00.000Z");
    const dates = calculateTouchpointDates(start, [
      { touchpointNumber: 1, scheduleType: "immediate", scheduleValue: 0 },
      { touchpointNumber: 2, scheduleType: "weekly", scheduleValue: 0 },
    ]);

    expect(dates[0].scheduledAt).toBe("2026-03-01T09:00:00.000Z");
    expect(dates[1].scheduledAt).toBe("2026-03-08T09:00:00.000Z");
  });
});

describe("buildMarketingScheduledEmails", () => {
  it("creates one email per recipient per touchpoint", () => {
    const campaignStart = new Date("2026-03-01T09:00:00.000Z");
    const touchpoints = [
      {
        id: "tp-1",
        touchpoint_number: 1,
        template_id: "template-1",
        schedule_type: "immediate" as const,
        schedule_value: 0,
        delay_days: 0,
      },
      {
        id: "tp-2",
        touchpoint_number: 2,
        template_id: "template-1",
        schedule_type: "weekly" as const,
        schedule_value: 0,
        delay_days: 7,
      },
    ];
    const templates = new Map([
      [
        "template-1",
        {
          id: "template-1",
          subject: "Hello {company_name}",
          html_content: "<p>Dear {contact_person}, cert {certificate_no}</p>",
        },
      ],
    ]);

    const scheduled = buildMarketingScheduledEmails(
      certs,
      "campaign-1",
      touchpoints,
      templates,
      campaignStart
    );

    expect(scheduled).toHaveLength(4);
    expect(
      scheduled.filter((row) => row.recipient_email === "a@example.com")
    ).toHaveLength(2);
    expect(scheduled[0].rendered_subject).toContain("ACME");
    expect(scheduled[0].certificate_ids).toEqual(["cert-1"]);
  });
});
