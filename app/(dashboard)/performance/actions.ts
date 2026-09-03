"use server";

import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

function makeAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export type CertDetail = {
  certNo: string;
  company: string;
  contactPerson: string;
  expiry: string;
  item: string;
  renewalAmount: number;
  renewed: boolean;
};

export type MonthPerformance = {
  monthKey: string;
  label: string;
  expired: number;
  renewed: number;
  notRenewed: number;
  rate: number;
  potentialAmount: number;
  collectedAmount: number;
  certs: CertDetail[];
};

export async function getOperationPerformance(): Promise<MonthPerformance[]> {
  const sheets = google.sheets({ version: "v4", auth: makeAuth() });

  const [listRes, renewalRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "List Cleaned!A:K",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Renewal Status!A:R",
    }),
  ]);

  const listRows = (listRes.data.values ?? []).slice(1);
  const renewalRows = (renewalRes.data.values ?? []).slice(1);

  // Build map of certNo → renewal records (Type=Renewal, Paid)
  type RenewalRecord = { year: number; amount: number };
  const renewalsByCert = new Map<string, RenewalRecord[]>();
  for (const row of renewalRows) {
    const certNo = row[8]?.trim();
    const paymentStatus = row[14]?.trim();
    const monthYear = row[15]?.trim() ?? "";
    if (!certNo || paymentStatus !== "Paid") continue;
    const yearMatch = monthYear.match(/\d{4}/);
    if (!yearMatch) continue;
    const renewalYear = parseInt(yearMatch[0]);
    const amount = parseFloat(row[16] ?? "0");
    if (!renewalsByCert.has(certNo)) renewalsByCert.set(certNo, []);
    renewalsByCert.get(certNo)!.push({ year: renewalYear, amount: isNaN(amount) ? 0 : amount });
  }

  // Group List Cleaned by expiry month, storing full cert details
  type CertEntry = {
    certNo: string;
    company: string;
    contactPerson: string;
    expiry: string;
    item: string;
    expiryYear: number;
    renewalAmount: number;
  };
  const byMonth = new Map<string, { certs: CertEntry[]; totalAmount: number }>();

  for (const row of listRows) {
    const certNo = row[1]?.trim();
    const expiryRaw = row[4]?.trim();
    if (!certNo || !expiryRaw) continue;
    const parts = expiryRaw.split("/");
    if (parts.length !== 3) continue;
    const [, mm, yyyy] = parts;
    if (!mm || !yyyy || yyyy.length !== 4) continue;

    const key = mm.padStart(2, "0") + "/" + yyyy;
    if (!byMonth.has(key)) byMonth.set(key, { certs: [], totalAmount: 0 });

    const entry = byMonth.get(key)!;
    const renewalAmount = parseFloat(row[10] ?? "0");
    const safeAmount = isNaN(renewalAmount) ? 0 : renewalAmount;

    entry.certs.push({
      certNo,
      company: row[0]?.trim() ?? "",
      contactPerson: row[6]?.trim() ?? "",
      expiry: expiryRaw,
      item: row[2]?.trim() || "Unknown",
      expiryYear: parseInt(yyyy),
      renewalAmount: safeAmount,
    });
    entry.totalAmount += safeAmount;
  }

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const results: MonthPerformance[] = [];
  for (const [key, { certs, totalAmount }] of byMonth) {
    const [mm, yyyy] = key.split("/");
    const monthIdx = parseInt(mm, 10) - 1;

    let collectedAmount = 0;
    const certDetails: CertDetail[] = certs.map(({ certNo, company, contactPerson, expiry, item, expiryYear, renewalAmount }) => {
      const records = renewalsByCert.get(certNo) ?? [];
      const match = records.find((r) => r.year >= expiryYear);
      const renewed = !!match;
      if (renewed) collectedAmount += match!.amount;
      return { certNo, company, contactPerson, expiry, item, renewalAmount: renewalAmount * 1000, renewed };
    });

    const renewed = certDetails.filter((c) => c.renewed).length;
    const expired = certDetails.length;

    results.push({
      monthKey: key,
      label: MONTH_NAMES[monthIdx] + " " + yyyy,
      expired,
      renewed,
      notRenewed: expired - renewed,
      rate: expired > 0 ? Math.round((renewed / expired) * 100) : 0,
      potentialAmount: Math.round(totalAmount) * 1000,
      collectedAmount: Math.round(collectedAmount) * 1000,
      certs: certDetails,
    });
  }

  results.sort((a, b) => {
    const [am, ay] = a.monthKey.split("/");
    const [bm, by] = b.monthKey.split("/");
    return parseInt(ay) - parseInt(by) || parseInt(am) - parseInt(bm);
  });

  const now = new Date();
  const futureDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
  const futureYear = futureDate.getFullYear();
  const futureMonth = futureDate.getMonth() + 1;

  return results.filter((r) => {
    const [mm, yyyy] = r.monthKey.split("/");
    const year = parseInt(yyyy);
    const month = parseInt(mm);
    const afterStart = year > 2025 || (year === 2025 && month >= 1);
    const beforeCutoff = year < futureYear || (year === futureYear && month <= futureMonth);
    return afterStart && beforeCutoff;
  });
}

// ---------------------------------------------------------------------------
// Leads performance (Renewal Status rows where Type ≠ "Renewal")
// ---------------------------------------------------------------------------

export type MonthLeads = {
  monthKey: string;
  label: string;
  total: number;
  closed: number;
  open: number;
  rate: number;
  byItem: Record<string, { total: number; closed: number }>;
};

const MONTH_NUM_MAP: Record<string, string> = {
  // full names
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
  // abbreviations
  jan: "01", feb: "02", mar: "03", apr: "04",
  jun: "06", jul: "07", aug: "08",
  sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseMonthYear(raw: string): { key: string; label: string } | null {
  if (!raw?.trim()) return null;
  const parts = raw.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const [monthRaw, yearRaw] = parts;
  const mm = MONTH_NUM_MAP[monthRaw.toLowerCase()] ?? null;
  if (!mm || !/^\d{4}$/.test(yearRaw)) return null;
  const SHORT = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const label = SHORT[parseInt(mm)] + " " + yearRaw;
  return { key: mm + "/" + yearRaw, label };
}

export async function getLeadsPerformance(): Promise<MonthLeads[]> {
  const sheets = google.sheets({ version: "v4", auth: makeAuth() });

  const [renewalRes, listRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "Renewal Status!A:R" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "List Cleaned!A:C" }),
  ]);

  // Build certNo → item map from List Cleaned
  const itemByCert = new Map<string, string>();
  for (const row of (listRes.data.values ?? []).slice(1)) {
    const certNo = row[1]?.trim();
    const item   = row[2]?.trim() || "Unknown";
    if (certNo) itemByCert.set(certNo, item);
  }

  const rows = (renewalRes.data.values ?? []).slice(1);

  const byMonth = new Map<string, {
    label: string;
    total: number;
    closed: number;
    byItem: Record<string, { total: number; closed: number }>;
  }>();

  for (const row of rows) {
    const type          = row[3]?.trim();
    const certNo        = row[8]?.trim();
    const paymentStatus = row[14]?.trim();
    const monthYearRaw  = row[15]?.trim() ?? "";

    if (type === "Renewal") continue;

    const parsed = parseMonthYear(monthYearRaw);
    if (!parsed) continue;

    const { key, label } = parsed;
    if (!byMonth.has(key)) byMonth.set(key, { label, total: 0, closed: 0, byItem: {} });

    const entry  = byMonth.get(key)!;
    const isPaid = paymentStatus === "Paid";
    const item   = (certNo && itemByCert.get(certNo)) || "Unknown";

    entry.total += 1;
    if (isPaid) entry.closed += 1;

    if (!entry.byItem[item]) entry.byItem[item] = { total: 0, closed: 0 };
    entry.byItem[item].total += 1;
    if (isPaid) entry.byItem[item].closed += 1;
  }

  const results: MonthLeads[] = [];
  for (const [key, { label, total, closed, byItem }] of byMonth) {
    results.push({
      monthKey: key,
      label,
      total,
      closed,
      open: total - closed,
      rate: total > 0 ? Math.round((closed / total) * 100) : 0,
      byItem,
    });
  }

  results.sort((a, b) => {
    const [am, ay] = a.monthKey.split("/");
    const [bm, by] = b.monthKey.split("/");
    return parseInt(ay) - parseInt(by) || parseInt(am) - parseInt(bm);
  });

  // From Jan 2025 onwards, no future cutoff (leads are recorded in the past)
  return results.filter((r) => {
    const [mm, yyyy] = r.monthKey.split("/");
    const year = parseInt(yyyy);
    const month = parseInt(mm);
    return year > 2025 || (year === 2025 && month >= 1);
  });
}
