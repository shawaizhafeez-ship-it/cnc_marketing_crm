import { google } from "googleapis";
import type { SheetConfig, SheetRow } from "@/lib/sheets/types";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

function getPrivateKey(): string {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not configured");
  }
  return key.replace(/\\n/g, "\n");
}

function getServiceAccountEmail(): string {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!email) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is not configured");
  }
  return email;
}

export function getSheetConfig(): SheetConfig {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID is not configured");
  }

  return {
    spreadsheetId,
    spreadsheetName:
      process.env.GOOGLE_SHEET_NAME?.trim() || "Renewals",
    worksheetName:
      process.env.GOOGLE_WORKSHEET_NAME?.trim() || "List Cleaned",
  };
}

export function createGoogleAuthClient() {
  return new google.auth.JWT({
    email: getServiceAccountEmail(),
    key: getPrivateKey(),
    scopes: SCOPES,
  });
}

export function createSheetsClient() {
  const auth = createGoogleAuthClient();
  return google.sheets({ version: "v4", auth });
}

function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, " ");
}

/**
 * Convert raw A:Z values into array of row objects keyed by header names.
 */
export function rowsToObjects(values: string[][]): SheetRow[] {
  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(normalizeHeader);
  const rows: SheetRow[] = [];

  for (let i = 1; i < values.length; i++) {
    const raw = values[i];
    if (!raw || raw.every((cell) => !String(cell ?? "").trim())) {
      continue;
    }

    const row: SheetRow = {};
    headers.forEach((header, index) => {
      if (header) {
        row[header] = String(raw[index] ?? "").trim();
      }
    });
    rows.push(row);
  }

  return rows;
}

export async function fetchSheetRows(
  config: SheetConfig = getSheetConfig()
): Promise<SheetRow[]> {
  const sheets = createSheetsClient();
  const range = `'${config.worksheetName.replace(/'/g, "''")}'!A:Z`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const values = (response.data.values ?? []) as string[][];
  return rowsToObjects(values);
}

export { getServiceAccountEmail };
