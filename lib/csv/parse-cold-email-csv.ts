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

export function parseColdEmailCsv(
  content: string,
  options: { verifiedOnly?: boolean } = {}
): ParseColdEmailCsvResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], skipped: 0, errors: ["CSV must include a header row and at least one data row."] };
  }

  const headers = parseCsvLine(lines[0]);
  const emailIndex = findColumnIndex(headers, [
    "email",
    "emails",
    "e-mail",
    "recipient_email",
    "recipient email",
  ]);
  const companyIndex = findColumnIndex(headers, [
    "company",
    "company_name",
    "company name",
  ]);
  const elvIndex = findColumnIndex(headers, [
    "elv result",
    "email status",
    "verification",
    "status",
  ]);

  if (emailIndex < 0) {
    return {
      rows: [],
      skipped: 0,
      errors: ["CSV must include an email column (email, emails, or E-MAIL)."],
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

  for (let i = 1; i < lines.length; i += 1) {
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
