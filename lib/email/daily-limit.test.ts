import { describe, expect, it } from "vitest";
import {
  computeMarketingDailyStatus,
  getCounterDateUtc,
  MARKETING_DAILY_LIMIT,
} from "@/lib/email/daily-limit";

describe("daily-limit", () => {
  it("uses UTC date for counter key", () => {
    expect(getCounterDateUtc(new Date("2026-03-15T23:30:00.000Z"))).toBe(
      "2026-03-15"
    );
  });

  it("computes remaining marketing sends", () => {
    const status = computeMarketingDailyStatus({
      counter_date: "2026-03-15",
      marketing_sent: 42,
      marketing_limit: MARKETING_DAILY_LIMIT,
      renewal_sent: 10,
    });

    expect(status.remaining).toBe(58);
    expect(status.canSend).toBe(true);
  });

  it("blocks sends when daily limit reached", () => {
    const status = computeMarketingDailyStatus({
      counter_date: "2026-03-15",
      marketing_sent: 100,
      marketing_limit: 100,
      renewal_sent: 0,
    });

    expect(status.remaining).toBe(0);
    expect(status.canSend).toBe(false);
  });

  it("does not count renewal sends against marketing limit", () => {
    const status = computeMarketingDailyStatus({
      counter_date: "2026-03-15",
      marketing_sent: 50,
      marketing_limit: 100,
      renewal_sent: 500,
    });

    expect(status.remaining).toBe(50);
    expect(status.canSend).toBe(true);
  });
});
