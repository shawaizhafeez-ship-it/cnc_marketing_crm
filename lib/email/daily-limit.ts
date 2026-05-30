import type { SupabaseClient } from "@supabase/supabase-js";

export const MARKETING_DAILY_LIMIT = 100;

export type DailyCounterRow = {
  id: string;
  counter_date: string;
  renewal_sent: number;
  marketing_sent: number;
  marketing_limit: number;
  updated_at: string;
};

export type MarketingDailyStatus = {
  counterDate: string;
  marketingSent: number;
  marketingLimit: number;
  renewalSent: number;
  remaining: number;
  canSend: boolean;
};

export function getCounterDateUtc(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function computeMarketingDailyStatus(
  row: Pick<DailyCounterRow, "counter_date" | "marketing_sent" | "marketing_limit" | "renewal_sent">
): MarketingDailyStatus {
  const remaining = Math.max(0, row.marketing_limit - row.marketing_sent);

  return {
    counterDate: row.counter_date,
    marketingSent: row.marketing_sent,
    marketingLimit: row.marketing_limit,
    renewalSent: row.renewal_sent,
    remaining,
    canSend: row.marketing_sent < row.marketing_limit,
  };
}

export async function getOrCreateDailyCounter(
  supabase: SupabaseClient,
  date: string = getCounterDateUtc()
): Promise<DailyCounterRow> {
  const { data: existing, error: readError } = await supabase
    .from("daily_send_counters")
    .select("*")
    .eq("counter_date", date)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to read daily counter: ${readError.message}`);
  }

  if (existing) {
    return existing as DailyCounterRow;
  }

  // ignoreDuplicates avoids race when two requests create the same date row
  const { error: upsertError } = await supabase
    .from("daily_send_counters")
    .upsert(
      {
        counter_date: date,
        renewal_sent: 0,
        marketing_sent: 0,
        marketing_limit: MARKETING_DAILY_LIMIT,
      },
      { onConflict: "counter_date", ignoreDuplicates: true }
    );

  if (upsertError) {
    throw new Error(`Failed to ensure daily counter: ${upsertError.message}`);
  }

  const { data: row, error: finalReadError } = await supabase
    .from("daily_send_counters")
    .select("*")
    .eq("counter_date", date)
    .single();

  if (finalReadError || !row) {
    throw new Error(
      `Failed to read daily counter: ${finalReadError?.message ?? "row not found"}`
    );
  }

  return row as DailyCounterRow;
}

export async function getMarketingDailyStatus(
  supabase: SupabaseClient,
  date: Date = new Date()
): Promise<MarketingDailyStatus> {
  const counterDate = getCounterDateUtc(date);
  const row = await getOrCreateDailyCounter(supabase, counterDate);
  return computeMarketingDailyStatus(row);
}

export async function canSendMarketingEmail(
  supabase: SupabaseClient,
  date: Date = new Date()
): Promise<boolean> {
  const status = await getMarketingDailyStatus(supabase, date);
  return status.canSend;
}

export async function incrementMarketingDailyCounter(
  supabase: SupabaseClient,
  date: Date = new Date()
): Promise<MarketingDailyStatus> {
  const counterDate = getCounterDateUtc(date);
  const row = await getOrCreateDailyCounter(supabase, counterDate);

  const { data: updated, error } = await supabase
    .from("daily_send_counters")
    .update({
      marketing_sent: row.marketing_sent + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("counter_date", counterDate)
    .select("*")
    .single();

  if (error || !updated) {
    throw new Error(
      `Failed to increment marketing counter: ${error?.message ?? "unknown"}`
    );
  }

  return computeMarketingDailyStatus(updated as DailyCounterRow);
}
