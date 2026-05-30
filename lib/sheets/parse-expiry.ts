import type { ParseExpiryResult } from "@/lib/sheets/types";

/**
 * Parse expiry date from Google Sheets (DD/MM/YYYY) to ISO date (YYYY-MM-DD).
 */
export function parseExpiryDate(value: string | null | undefined): ParseExpiryResult {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return { success: false, error: "Expiry date is empty" };
  }

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return {
      success: false,
      error: `Invalid date format "${trimmed}" — expected DD/MM/YYYY`,
    };
  }

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (month < 1 || month > 12) {
    return { success: false, error: `Invalid month in "${trimmed}"` };
  }

  if (day < 1 || day > 31) {
    return { success: false, error: `Invalid day in "${trimmed}"` };
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { success: false, error: `Invalid calendar date "${trimmed}"` };
  }

  const isoDate = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

  return { success: true, isoDate };
}
