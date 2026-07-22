import { describe, expect, it, vi } from "vitest";
import {
  getRetryBackoffMs,
  isEligibleForRetry,
  isOpsDone,
  processScheduledRenewalEmail,
  shouldSkipDueToOpsDone,
  type ScheduledEmailRecord,
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

/**
 * Minimal chainable Supabase stub covering the calls processScheduledRenewalEmail
 * makes: certificates select→in, scheduled_emails update→eq, renewal_campaigns
 * select→eq→single + update→eq, and email_logs insert.
 */
function makeSupabaseStub(liveCerts: Array<{ id: string; ops_status: string }>) {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];

  const from = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      update: () => builder,
      in: () => Promise.resolve({ data: liveCerts, error: null }),
      single: () =>
        Promise.resolve({ data: { emails_sent: 0 }, error: null }),
      eq: () => builder,
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return Promise.resolve({ error: null });
      },
    };
    return builder;
  };

  return { supabase: { from } as never, inserts };
}

function whatsappRecord(
  overrides: Partial<ScheduledEmailRecord> = {}
): ScheduledEmailRecord {
  return {
    id: "se-1",
    campaign_id: "camp-1",
    touchpoint_number: 1,
    recipient_email: "a@example.com",
    company_name: "ACME",
    certificate_ids: ["cert-1"],
    certificate_snapshot: [
      {
        id: "cert-1",
        certificate_no: "C1",
        company_name: "ACME",
        item: "PPE",
        expiry_date: "2026-03-16",
        expiry_display: "16 March 2026",
        renewal_amount: 50,
        recipient_email: "a@example.com",
      },
    ],
    subject: "ignored",
    scheduled_at: "2026-02-14T09:00:00.000Z",
    status: "pending",
    retry_count: 0,
    max_retries: 3,
    updated_at: "2026-02-14T09:00:00.000Z",
    channel: "whatsapp",
    recipient_phone: "923001234567",
    ...overrides,
  };
}

describe("processScheduledRenewalEmail — WhatsApp channel", () => {
  it("sends via WhatsApp (not email) and logs channel=whatsapp", async () => {
    const { supabase, inserts } = makeSupabaseStub([
      { id: "cert-1", ops_status: "active" },
    ]);
    const sendFn = vi.fn();
    const sendWhatsAppFn = vi
      .fn()
      .mockResolvedValue({ success: true, messageId: "wamid.123" });

    const result = await processScheduledRenewalEmail(supabase, whatsappRecord(), {
      sendFn,
      sendWhatsAppFn,
    });

    expect(result.outcome).toBe("sent");
    expect(sendWhatsAppFn).toHaveBeenCalledOnce();
    expect(sendFn).not.toHaveBeenCalled();

    const call = sendWhatsAppFn.mock.calls[0][0];
    expect(call.to).toBe("923001234567");
    expect(call.bodyParams[0]).toBe("ACME");

    const log = inserts.find((i) => i.table === "email_logs");
    expect(log?.row.channel).toBe("whatsapp");
  });

  it("fails cleanly when a whatsapp row has no phone", async () => {
    const { supabase } = makeSupabaseStub([
      { id: "cert-1", ops_status: "active" },
    ]);
    const sendWhatsAppFn = vi.fn();

    const result = await processScheduledRenewalEmail(
      supabase,
      whatsappRecord({ recipient_phone: null }),
      { sendWhatsAppFn }
    );

    expect(result.outcome).toBe("failed");
    expect(result.errorMessage).toContain("No WhatsApp number");
    expect(sendWhatsAppFn).not.toHaveBeenCalled();
  });
});
