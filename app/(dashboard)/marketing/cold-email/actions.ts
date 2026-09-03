"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseColdEmailCsv } from "@/lib/csv/parse-cold-email-csv";
import {
  DEFAULT_COLD_EMAIL_HTML,
  DEFAULT_COLD_EMAIL_SUBJECT,
} from "@/lib/email/cold-email-template";
import {
  getColdEmailCronRunLog,
  runColdEmailSendCron,
  type ColdEmailCronStats,
} from "@/lib/email/send-cold-email";
import { createClient } from "@/lib/supabase/server";

export type ColdEmailActionState = {
  error?: string;
  success?: string;
};

export type ColdEmailBatchSummary = {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  emails_sent: number;
  emails_failed: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type ColdEmailRecipientRow = {
  id: string;
  recipient_email: string;
  company_name: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
};

export type ColdEmailBatchDetail = {
  batch: ColdEmailBatchSummary & { html_template: string };
  recipients: ColdEmailRecipientRow[];
  pendingCount: number;
};

export type ColdEmailCsvPreview = {
  rows: Array<{ email: string; company: string }>;
  skipped: number;
  errors: string[];
  total: number;
};

export type ColdEmailSendActionState = {
  error?: string;
  stats?: ColdEmailCronStats;
};

const COLD_EMAIL_CSV_PREVIEW_SAMPLE_SIZE = 3;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return { supabase, userId: user.id };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function requireAdmin() {
  const { supabase, userId } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .single();

  if (!profile?.is_active) {
    throw new Error("Your account is not active.");
  }

  if (profile.role !== "admin") {
    throw new Error("Admin access required.");
  }

  return { supabase, userId };
}

async function readCsvFromForm(formData: FormData): Promise<string | null> {
  const file = formData.get("csv_file");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return file.text();
}

export async function previewColdEmailCsvUpload(
  formData: FormData
): Promise<ColdEmailCsvPreview> {
  await requireUser();

  const content = await readCsvFromForm(formData);
  if (!content) {
    return {
      rows: [],
      skipped: 0,
      errors: ["Please select a CSV file."],
      total: 0,
    };
  }

  const verifiedOnly = formData.get("verified_only") === "on";
  const result = parseColdEmailCsv(content, { verifiedOnly });

  return {
    rows: result.rows.slice(0, COLD_EMAIL_CSV_PREVIEW_SAMPLE_SIZE),
    skipped: result.skipped,
    errors: result.errors,
    total: result.rows.length,
  };
}

export async function createColdEmailBatch(
  _prev: ColdEmailActionState,
  formData: FormData
): Promise<ColdEmailActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const subject =
    String(formData.get("subject") ?? "").trim() || DEFAULT_COLD_EMAIL_SUBJECT;
  const htmlTemplate =
    String(formData.get("html_template") ?? "").trim() ||
    DEFAULT_COLD_EMAIL_HTML;
  const startImmediately = formData.get("start_immediately") === "on";
  const verifiedOnly = formData.get("verified_only") === "on";

  if (!name) {
    return { error: "Batch name is required." };
  }

  const content = await readCsvFromForm(formData);
  if (!content) {
    return { error: "Please upload a CSV file with email and company columns." };
  }

  const parsed = parseColdEmailCsv(content, { verifiedOnly });
  if (parsed.errors.length > 0 && parsed.rows.length === 0) {
    return { error: parsed.errors.join(" ") };
  }

  if (parsed.rows.length === 0) {
    return {
      error: "No valid recipients found in the CSV. Check columns and filters.",
    };
  }

  const { supabase, userId } = await requireUser();
  const batchId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: batchError } = await supabase.from("cold_email_batches").insert({
    id: batchId,
    name,
    subject,
    html_template: htmlTemplate,
    status: startImmediately ? "active" : "draft",
    total_recipients: parsed.rows.length,
    emails_sent: 0,
    emails_failed: 0,
    created_by: userId,
    started_at: startImmediately ? now : null,
  });

  if (batchError) {
    return { error: batchError.message };
  }

  const recipientRows = parsed.rows.map((row) => ({
    id: crypto.randomUUID(),
    batch_id: batchId,
    recipient_email: row.email,
    company_name: row.company,
    status: "pending" as const,
  }));

  const chunkSize = 500;
  for (let i = 0; i < recipientRows.length; i += chunkSize) {
    const chunk = recipientRows.slice(i, i + chunkSize);
    const { error: recipientError } = await supabase
      .from("cold_email_recipients")
      .insert(chunk);

    if (recipientError) {
      await supabase.from("cold_email_batches").delete().eq("id", batchId);
      return { error: recipientError.message };
    }
  }

  revalidatePath("/marketing/cold-email");
  redirect(`/marketing/cold-email/${batchId}`);
}

export async function listColdEmailBatches(): Promise<ColdEmailBatchSummary[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("cold_email_batches")
    .select(
      "id, name, subject, status, total_recipients, emails_sent, emails_failed, created_at, started_at, completed_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ColdEmailBatchSummary[];
}

export async function getColdEmailBatchDetail(
  batchId: string
): Promise<ColdEmailBatchDetail> {
  const { supabase } = await requireUser();

  const { data: batch, error: batchError } = await supabase
    .from("cold_email_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    throw new Error("Batch not found.");
  }

  const [{ data: recipients, error: recipientError }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("cold_email_recipients")
        .select(
          "id, recipient_email, company_name, status, sent_at, error_message, created_at"
        )
        .eq("batch_id", batchId)
        .order("created_at", { ascending: true })
        .limit(200),
      supabase
        .from("cold_email_recipients")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batchId)
        .eq("status", "pending"),
    ]);

  if (recipientError) {
    throw new Error(recipientError.message);
  }

  const rows = (recipients ?? []) as ColdEmailRecipientRow[];

  return {
    batch: batch as ColdEmailBatchDetail["batch"],
    recipients: rows,
    pendingCount: pendingCount ?? 0,
  };
}

async function updateColdEmailBatchStatus(
  batchId: string,
  status: "active" | "paused" | "cancelled"
) {
  const { supabase } = await requireUser();
  const updates: Record<string, unknown> = { status };

  if (status === "active") {
    updates.started_at = new Date().toISOString();
  }

  if (status === "cancelled") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("cold_email_batches")
    .update(updates)
    .eq("id", batchId);

  if (error) {
    throw new Error(error.message);
  }

  if (status === "cancelled") {
    await supabase
      .from("cold_email_recipients")
      .update({ status: "cancelled" })
      .eq("batch_id", batchId)
      .eq("status", "pending");
  }

  revalidatePath("/marketing/cold-email");
  revalidatePath(`/marketing/cold-email/${batchId}`);
}

export async function startColdEmailBatch(batchId: string) {
  await updateColdEmailBatchStatus(batchId, "active");
}

export async function pauseColdEmailBatch(batchId: string) {
  await updateColdEmailBatchStatus(batchId, "paused");
}

export async function cancelColdEmailBatch(batchId: string) {
  await updateColdEmailBatchStatus(batchId, "cancelled");
}

export async function deleteColdEmailBatch(
  batchId: string
): Promise<ColdEmailActionState> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("cold_email_batches")
    .delete()
    .eq("id", batchId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/marketing/cold-email");
  return { success: "Batch deleted." };
}

export async function triggerColdEmailSend(): Promise<ColdEmailSendActionState> {
  try {
    await requireUser();
    const stats = await runColdEmailSendCron();
    revalidatePath("/marketing/cold-email");
    revalidatePath("/dashboard");
    revalidatePath("/logs");
    revalidatePath("/settings");

    if (stats.status === "failed") {
      return {
        error: stats.errors.join("; ") || "Cold email send run failed",
        stats,
      };
    }

    return { stats };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Cold email send failed",
    };
  }
}

export async function getColdEmailSendLog() {
  await requireUser();
  const supabase = await createClient();
  return getColdEmailCronRunLog(supabase);
}
