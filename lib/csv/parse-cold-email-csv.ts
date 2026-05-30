export type ColdEmailCsvRow = {
  email: string;
  company: string;
  elvResult?: string | null;
};

export type ParseColdEmailCsvResult = {
  rows: ColdEmailCsvRow[];
  skipped: number;
  errors: string[];
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumnIndex(
  headers: string[],
  candidates: string[]
): number {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalized.indexOf(candidate);
    if (index >= 0) return index;
  }
  return -1;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function looksLikeTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}[ T]/.test(value.trim());
}

function looksLikeVariant(value: string): boolean {
  return /^variant\s*\d+/i.test(value.trim());
}

function inferColumnsFromDataRow(
  cells: string[]
): { emailIndex: number; companyIndex: number; elvIndex: number } | null {
  let emailIndex = -1;
  for (let i = 0; i < cells.length; i += 1) {
    if (isValidEmail(cells[i].trim().toLowerCase())) {
      emailIndex = i;
      break;
    }
  }

  if (emailIndex < 0) {
    return null;
  }

  if (emailIndex + 1 < cells.length) {
    const next = cells[emailIndex + 1].trim();
    if (
      next &&
      !isValidEmail(next.toLowerCase()) &&
      !looksLikeTimestamp(next) &&
      !looksLikeVariant(next)
    ) {
      return { emailIndex, companyIndex: emailIndex + 1, elvIndex: -1 };
    }
  }

  for (let i = 0; i < cells.length; i += 1) {
    if (i === emailIndex) continue;
    const val = cells[i].trim();
    if (
      !val ||
      isValidEmail(val.toLowerCase()) ||
      looksLikeTimestamp(val) ||
      looksLikeVariant(val)
    ) {
      continue;
    }
    return { emailIndex, companyIndex: i, elvIndex: -1 };
  }

  return null;
}

export function parseColdEmailCsv(
  content: string,
  options: { verifiedOnly?: boolean } = {}
): ParseColdEmailCsvResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 1) {
    return {
      rows: [],
      skipped: 0,
      errors: ["CSV must include at least one data row."],
    };
  }

  const firstLineCells = parseCsvLine(lines[0]);
  let emailIndex = findColumnIndex(firstLineCells, [
    "email",
    "emails",
    "e-mail",
    "recipient_email",
    "recipient email",
  ]);
  let companyIndex = findColumnIndex(firstLineCells, [
    "company",
    "company_name",
    "company name",
  ]);
  let elvIndex = findColumnIndex(firstLineCells, [
    "elv result",
    "email status",
    "verification",
    "status",
  ]);
  let startRow = 1;

  // Headerless export e.g. send_logs: timestamp,email,company,variant
  if (emailIndex < 0 || companyIndex < 0) {
    const inferred = inferColumnsFromDataRow(firstLineCells);
    if (inferred) {
      emailIndex = inferred.emailIndex;
      companyIndex = inferred.companyIndex;
      elvIndex = inferred.elvIndex;
      startRow = 0;
    }
  }

  if (emailIndex < 0) {
    return {
      rows: [],
      skipped: 0,
      errors: [
        "CSV must include an email column (header row with email / E-MAIL, or headerless rows like timestamp,email,company).",
      ],
    };
  }

  if (companyIndex < 0) {
    return {
      rows: [],
      skipped: 0,
      errors: ["CSV must include a company column (company or company_name)."],
    };
  }

  const rows: ColdEmailCsvRow[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  const errors: string[] = [];

  for (let i = startRow; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const email = (cells[emailIndex] ?? "").trim().toLowerCase();
    const company = (cells[companyIndex] ?? "").trim();
    const elvResult =
      elvIndex >= 0 ? (cells[elvIndex] ?? "").trim().toLowerCase() : null;

    if (!email && !company) {
      skipped += 1;
      continue;
    }

    if (options.verifiedOnly && elvResult) {
      const okValues = ["ok", "valid", "verified"];
      if (!okValues.includes(elvResult)) {
        skipped += 1;
        continue;
      }
    }

    if (!isValidEmail(email)) {
      skipped += 1;
      if (errors.length < 5) {
        errors.push(`Row ${i + 1}: invalid email "${email || "(empty)"}"`);
      }
      continue;
    }

    if (!company) {
      skipped += 1;
      continue;
    }

    if (seen.has(email)) {
      skipped += 1;
      continue;
    }

    seen.add(email);
    rows.push({ email, company, elvResult });
  }

  return { rows, skipped, errors };
}
