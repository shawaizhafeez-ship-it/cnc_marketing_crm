export const ALLOWED_EMAIL_DOMAIN = "cncservices.net";

/** Strict @cncservices.net email — blocks subdomains and malformed addresses */
export const CNC_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@cncservices\.net$/i;

export const DOMAIN_ERROR_MESSAGE =
  "Only @cncservices.net email addresses can access this system.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmailDomain(email: string): boolean {
  return CNC_EMAIL_REGEX.test(normalizeEmail(email));
}

export function getEmailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  const parts = normalized.split("@");
  return parts.length === 2 ? parts[1] : null;
}

export function validateEmailForAuth(email: string): {
  valid: boolean;
  error?: string;
} {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return { valid: false, error: "Email is required." };
  }

  if (!normalized.includes("@")) {
    return { valid: false, error: "Enter a valid email address." };
  }

  if (!isAllowedEmailDomain(normalized)) {
    return { valid: false, error: DOMAIN_ERROR_MESSAGE };
  }

  return { valid: true };
}
