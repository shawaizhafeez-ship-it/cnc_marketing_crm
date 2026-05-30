import { createHash } from "crypto";
import { fetchSheetRows, getSheetConfig } from "@/lib/sheets/google-client";
import { parseExpiryDate } from "@/lib/sheets/parse-expiry";
import type {
  CertificateUpsert,
  SheetRow,
  SyncStats,
  SyncWarning,
} from "@/lib/sheets/types";
import { SHEET_COLUMNS } from "@/lib/sheets/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function trim(value: string | undefined | null): string {
  return String(value ?? "").trim();
}

function getCell(row: SheetRow, column: string): string {
  if (column in row) {
    return trim(row[column]);
  }
  const normalized = column.toLowerCase();
  const key = Object.keys(row).find((k) => k.toLowerCase() === normalized);
  return key ? trim(row[key]) : "";
}

function parseRenewalAmount(value: string): number | null {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  if (!cleaned) return null;
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function computeRowHash(data: Omit<CertificateUpsert, "last_synced_at">): string {
  const payload = JSON.stringify({
    certificate_no: data.certificate_no,
    company_name: data.company_name,
    item: data.item,
    expiry_date: data.expiry_date,
    recipient_email: data.recipient_email,
    renewal_amount: data.renewal_amount,
    ops_status: data.ops_status,
    contact_person: data.contact_person,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function mapSheetRowToCertificate(
  row: SheetRow,
  rowNumber: number
): { certificate: CertificateUpsert } | { warning: SyncWarning } {
  const certificateNo = getCell(row, SHEET_COLUMNS.CERTIFICATE_NO);
  const companyName = getCell(row, SHEET_COLUMNS.COMPANY_NAME);
  const email = getCell(row, SHEET_COLUMNS.EMAIL);
  const expiryRaw = getCell(row, SHEET_COLUMNS.EXPIRY);

  if (!certificateNo) {
    return {
      warning: {
        row: rowNumber,
        reason: "Missing certificate number — row skipped",
      },
    };
  }

  if (!email) {
    return {
      warning: {
        row: rowNumber,
        certificate_no: certificateNo,
        reason: "Empty email address — row skipped",
      },
    };
  }

  if (!companyName) {
    return {
      warning: {
        row: rowNumber,
        certificate_no: certificateNo,
        reason: "Missing company name — row skipped",
      },
    };
  }

  const expiryResult = parseExpiryDate(expiryRaw);
  if (!expiryResult.success) {
    return {
      warning: {
        row: rowNumber,
        certificate_no: certificateNo,
        reason: expiryResult.error,
      },
    };
  }

  const now = new Date().toISOString();
  const certificate: CertificateUpsert = {
    certificate_no: certificateNo,
    company_name: companyName,
    item: getCell(row, SHEET_COLUMNS.ITEM) || null,
    expiry_date: expiryResult.isoDate,
    recipient_email: email.toLowerCase(),
    renewal_amount: parseRenewalAmount(getCell(row, SHEET_COLUMNS.RENEWAL_AMOUNT)),
    ops_status: getCell(row, SHEET_COLUMNS.OPS_STATUS),
    contact_person: getCell(row, SHEET_COLUMNS.CONTACT_PERSON) || null,
    sheet_row_hash: "",
    last_synced_at: now,
  };

  certificate.sheet_row_hash = computeRowHash(certificate);

  return { certificate };
}

type ExistingCertificate = {
  certificate_no: string;
  sheet_row_hash: string | null;
};

/** Last row wins when the sheet contains duplicate certificate numbers. */
export function dedupeCertificatesByNumber(
  certificates: CertificateUpsert[]
): CertificateUpsert[] {
  const byCertNo = new Map<string, CertificateUpsert>();
  for (const certificate of certificates) {
    byCertNo.set(certificate.certificate_no, certificate);
  }
  return Array.from(byCertNo.values());
}

export async function syncCertificatesFromSheet(
  supabase: SupabaseClient
): Promise<SyncStats> {
  const startedAt = new Date();
  const warnings: SyncWarning[] = [];
  const errors: string[] = [];

  let rowsProcessed = 0;
  let rowsInserted = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;
  let rowsUnchanged = 0;

  try {
    const config = getSheetConfig();
    const sheetRows = await fetchSheetRows(config);
    rowsProcessed = sheetRows.length;

    const { data: existingRows, error: fetchError } = await supabase
      .from("certificates")
      .select("certificate_no, sheet_row_hash");

    if (fetchError) {
      throw new Error(`Failed to load existing certificates: ${fetchError.message}`);
    }

    const existingByCertNo = new Map<string, ExistingCertificate>(
      (existingRows ?? []).map((row) => [row.certificate_no, row])
    );

    const toUpsert: CertificateUpsert[] = [];
    const latestByCertNo = new Map<
      string,
      { certificate: CertificateUpsert; rowNumber: number }
    >();

    for (let i = 0; i < sheetRows.length; i++) {
      const rowNumber = i + 2; // 1-based sheet row (header is row 1)
      const mapped = mapSheetRowToCertificate(sheetRows[i], rowNumber);

      if ("warning" in mapped) {
        warnings.push(mapped.warning);
        rowsSkipped++;
        continue;
      }

      const { certificate } = mapped;

      if (latestByCertNo.has(certificate.certificate_no)) {
        warnings.push({
          row: rowNumber,
          certificate_no: certificate.certificate_no,
          reason:
            "Duplicate certificate number in sheet — keeping the last row for this certificate",
        });
      }

      latestByCertNo.set(certificate.certificate_no, {
        certificate,
        rowNumber,
      });
    }

    for (const { certificate } of latestByCertNo.values()) {
      const existing = existingByCertNo.get(certificate.certificate_no);

      if (existing && existing.sheet_row_hash === certificate.sheet_row_hash) {
        rowsUnchanged++;
        continue;
      }

      toUpsert.push(certificate);
    }

    const BATCH_SIZE = 100;
    for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
      const batch = dedupeCertificatesByNumber(
        toUpsert.slice(i, i + BATCH_SIZE)
      );
      const { error: upsertError } = await supabase.from("certificates").upsert(
        batch.map((cert) => ({
          certificate_no: cert.certificate_no,
          company_name: cert.company_name,
          item: cert.item,
          expiry_date: cert.expiry_date,
          recipient_email: cert.recipient_email,
          renewal_amount: cert.renewal_amount,
          ops_status: cert.ops_status,
          contact_person: cert.contact_person,
          sheet_row_hash: cert.sheet_row_hash,
          last_synced_at: cert.last_synced_at,
        })),
        { onConflict: "certificate_no" }
      );

      if (upsertError) {
        errors.push(`Batch upsert failed: ${upsertError.message}`);
        continue;
      }

      for (const cert of batch) {
        if (existingByCertNo.has(cert.certificate_no)) {
          rowsUpdated++;
        } else {
          rowsInserted++;
        }
      }
    }

    const completedAt = new Date();
    const hasErrors = errors.length > 0;
    const hasWarnings = warnings.length > 0;

    const stats: SyncStats = {
      rowsProcessed,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
      rowsUnchanged,
      warnings,
      errors,
      status: hasErrors ? "partial" : hasWarnings ? "partial" : "success",
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };

    await writeSyncLog(supabase, stats);
    return stats;
  } catch (error) {
    const completedAt = new Date();
    const message =
      error instanceof Error ? error.message : "Unknown sync error";
    errors.push(message);

    const stats: SyncStats = {
      rowsProcessed,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
      rowsUnchanged,
      warnings,
      errors,
      status: "failed",
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };

    await writeSyncLog(supabase, stats, message);
    return stats;
  }
}

async function writeSyncLog(
  supabase: SupabaseClient,
  stats: SyncStats,
  errorMessage?: string
) {
  const logMessage =
    errorMessage ??
    (stats.errors.length > 0 ? stats.errors.join("; ") : null) ??
    (stats.warnings.length > 0
      ? `${stats.warnings.length} row warning(s) during sync`
      : null);

  await supabase.from("sheet_sync_logs").insert({
    status: stats.status,
    rows_processed: stats.rowsProcessed,
    rows_inserted: stats.rowsInserted,
    rows_updated: stats.rowsUpdated,
    rows_skipped: stats.rowsSkipped,
    error_message: logMessage,
    started_at: stats.startedAt,
    completed_at: stats.completedAt,
  });
}

export async function getLatestSyncLog(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("sheet_sync_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
