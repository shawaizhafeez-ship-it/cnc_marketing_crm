"use server";

import type {
  EmailLogEntry,
  EmailLogFilters,
  EmailLogStats,
  EmailLogsResult,
} from "@/lib/email/email-log-types";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_PAGE_SIZE = 25;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return supabase;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyLogFilters(query: any, filters: EmailLogFilters) {
  let filtered = query;

  if (filters.type && filters.type !== "all") {
    filtered = filtered.eq("email_type", filters.type);
  }

  if (filters.status && filters.status !== "all") {
    filtered = filtered.eq("status", filters.status);
  }

  if (filters.recipient?.trim()) {
    filtered = filtered.ilike(
      "recipient_email",
      `%${filters.recipient.trim()}%`
    );
  }

  if (filters.from) {
    filtered = filtered.gte("sent_at", `${filters.from}T00:00:00.000Z`);
  }

  if (filters.to) {
    filtered = filtered.lte("sent_at", `${filters.to}T23:59:59.999Z`);
  }

  return filtered;
}

async function attachCampaignNames(
  supabase: Awaited<ReturnType<typeof requireUser>>,
  logs: EmailLogEntry[]
): Promise<EmailLogEntry[]> {
  if (logs.length === 0) {
    return logs;
  }

  const renewalIds = Array.from(
    new Set(
      logs
        .filter((log) => log.email_type === "renewal" && log.campaign_id)
        .map((log) => log.campaign_id as string)
    )
  );
  const marketingIds = Array.from(
    new Set(
      logs
        .filter((log) => log.email_type === "marketing" && log.campaign_id)
        .map((log) => log.campaign_id as string)
    )
  );

  const renewalNames = new Map<string, string>();
  const marketingNames = new Map<string, string>();

  if (renewalIds.length > 0) {
    const { data } = await supabase
      .from("renewal_campaigns")
      .select("id, name")
      .in("id", renewalIds);
    for (const row of data ?? []) {
      renewalNames.set(row.id, row.name);
    }
  }

  if (marketingIds.length > 0) {
    const { data } = await supabase
      .from("marketing_campaigns")
      .select("id, name")
      .in("id", marketingIds);
    for (const row of data ?? []) {
      marketingNames.set(row.id, row.name);
    }
  }

  return logs.map((log) => ({
    ...log,
    campaign_name: log.campaign_id
      ? log.email_type === "renewal"
        ? renewalNames.get(log.campaign_id) ?? null
        : log.email_type === "marketing"
          ? marketingNames.get(log.campaign_id) ?? null
          : null
      : null,
  }));
}

export async function getEmailLogStats(
  filters: EmailLogFilters = {}
): Promise<EmailLogStats> {
  const supabase = await requireUser();

  let query = supabase.from("email_logs").select("status");
  query = applyLogFilters(query, { ...filters, page: undefined, pageSize: undefined });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const sent = rows.filter((row) => row.status === "sent").length;
  const failed = rows.filter((row) => row.status === "failed").length;
  const skipped = rows.filter((row) => row.status === "skipped").length;
  const total = rows.length;
  const attempts = sent + failed;
  const successRate =
    attempts > 0 ? Math.round((sent / attempts) * 1000) / 10 : 0;

  return { total, sent, failed, skipped, successRate };
}

export async function getEmailLogs(
  filters: EmailLogFilters = {}
): Promise<EmailLogsResult> {
  const supabase = await requireUser();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("email_logs")
    .select("*", { count: "exact" })
    .order("sent_at", { ascending: false });

  query = applyLogFilters(query, filters);

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const logs = await attachCampaignNames(
    supabase,
    (data ?? []) as EmailLogEntry[]
  );
  const total = count ?? 0;

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function exportEmailLogs(
  filters: EmailLogFilters = {}
): Promise<EmailLogEntry[]> {
  const supabase = await requireUser();

  let query = supabase
    .from("email_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(5000);

  query = applyLogFilters(query, { ...filters, page: undefined, pageSize: undefined });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return attachCampaignNames(supabase, (data ?? []) as EmailLogEntry[]);
}
