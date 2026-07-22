/**
 * Normalize a raw phone number to E.164 for WhatsApp (Meta Cloud API).
 *
 * The Renewals sheet's TEL column holds mixed/inconsistent formats:
 *   "0300-1234567", "0300 1234567", "+92 300 1234567", "0092300...", "92300...",
 *   "(0321) 4567890", occasionally with a trailing landline / extra digits.
 *
 * Returns E.164 WITHOUT the leading "+" (Meta accepts either; we store the plain
 * digit string, e.g. "923001234567"), or null if the value can't be salvaged.
 *
 * Defaults to Pakistan (country code 92). Local numbers are of the form
 * 0 + 3xx + 7 digits (mobile) → 92 + 3xx + 7 digits.
 */

const DEFAULT_COUNTRY_CODE = "92";

/** Pakistani MSISDN: country code 92 + a 10-digit subscriber number starting with 3. */
const PK_E164 = /^92(3\d{9})$/;

export function normalizeToE164(
  raw: string | null | undefined,
  defaultCountryCode: string = DEFAULT_COUNTRY_CODE
): string | null {
  if (raw == null) {
    return null;
  }

  // If multiple numbers are jammed in one cell (e.g. "0300... / 021..."),
  // take the first token.
  const firstToken = String(raw).split(/[,/;]| or /i)[0] ?? "";

  // Keep digits only; a leading "+" or "00" is an international prefix we drop.
  let digits = firstToken.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  // Strip an international dialing prefix "00" (e.g. 0092...).
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Local format: 0XXXXXXXXXX → replace leading 0 with the country code.
  if (digits.startsWith("0")) {
    digits = defaultCountryCode + digits.slice(1);
  }

  // Bare subscriber number (10 digits starting with 3) → prepend country code.
  if (/^3\d{9}$/.test(digits)) {
    digits = defaultCountryCode + digits;
  }

  // Validate as a Pakistani mobile MSISDN.
  return PK_E164.test(digits) ? digits : null;
}
