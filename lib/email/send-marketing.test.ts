import { describe, expect, it } from "vitest";
import { shouldSkipDueToOpsDone } from "@/lib/email/send-renewal";

describe("marketing send ops check", () => {
  it("skips marketing email when any linked certificate is done", () => {
    const result = shouldSkipDueToOpsDone(
      [
        { id: "cert-1", ops_status: "pending" },
        { id: "cert-2", ops_status: "done" },
      ],
      ["cert-1", "cert-2"]
    );

    expect(result.skip).toBe(true);
    expect(result.reason).toContain("done");
  });

  it("allows send when all certificates remain active", () => {
    const result = shouldSkipDueToOpsDone(
      [
        { id: "cert-1", ops_status: "pending" },
        { id: "cert-2", ops_status: "" },
      ],
      ["cert-1", "cert-2"]
    );

    expect(result.skip).toBe(false);
  });
});
