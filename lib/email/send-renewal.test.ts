import { describe, expect, it } from "vitest";
import {
  getRetryBackoffMs,
  isEligibleForRetry,
  isOpsDone,
  shouldSkipDueToOpsDone,
} from "@/lib/email/send-renewal";

describe("isOpsDone", () => {
  it("returns true for done (case insensitive, trimmed)", () => {
    expect(isOpsDone("done")).toBe(true);
    expect(isOpsDone("Done")).toBe(true);
    expect(isOpsDone(" DONE ")).toBe(true);
  });

  it("returns false for other statuses", () => {
    expect(isOpsDone("")).toBe(false);
    expect(isOpsDone("pending")).toBe(false);
    expect(isOpsDone("in progress")).toBe(false);
  });
});

describe("shouldSkipDueToOpsDone", () => {
  const liveCerts = [
    { id: "cert-1", ops_status: "active" },
    { id: "cert-2", ops_status: "" },
  ];

  it("does not skip when all certificates are active", () => {
    expect(
      shouldSkipDueToOpsDone(liveCerts, ["cert-1", "cert-2"])
    ).toEqual({ skip: false });
  });

  it("skips when any certificate is marked done", () => {
    const result = shouldSkipDueToOpsDone(
      [
        { id: "cert-1", ops_status: "active" },
        { id: "cert-2", ops_status: "done" },
      ],
      ["cert-1", "cert-2"]
    );

    expect(result.skip).toBe(true);
    expect(result.reason).toContain("done");
  });

  it("skips when a linked certificate is missing", () => {
    const result = shouldSkipDueToOpsDone(liveCerts, ["cert-1", "cert-missing"]);

    expect(result.skip).toBe(true);
    expect(result.reason).toContain("no longer exists");
  });

  it("skips when certificate_ids is empty", () => {
    expect(shouldSkipDueToOpsDone(liveCerts, [])).toEqual({
      skip: true,
      reason: "No certificates linked to scheduled email",
    });
  });
});

describe("retry backoff", () => {
  it("uses exponential backoff based on retry_count", () => {
    expect(getRetryBackoffMs(0)).toBe(60_000);
    expect(getRetryBackoffMs(1)).toBe(120_000);
    expect(getRetryBackoffMs(2)).toBe(240_000);
  });

  it("allows retry only after backoff elapsed", () => {
    const updatedAt = "2026-03-15T09:00:00.000Z";

    expect(
      isEligibleForRetry(
        {
          status: "failed",
          retry_count: 1,
          max_retries: 3,
          updated_at: updatedAt,
        },
        new Date("2026-03-15T09:01:00.000Z")
      )
    ).toBe(false);

    expect(
      isEligibleForRetry(
        {
          status: "failed",
          retry_count: 1,
          max_retries: 3,
          updated_at: updatedAt,
        },
        new Date("2026-03-15T09:02:01.000Z")
      )
    ).toBe(true);
  });

  it("does not retry when max_retries reached", () => {
    expect(
      isEligibleForRetry({
        status: "failed",
        retry_count: 3,
        max_retries: 3,
        updated_at: "2026-03-15T09:00:00.000Z",
      })
    ).toBe(false);
  });
});
