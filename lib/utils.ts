import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export auth validation for convenience
export {
  ALLOWED_EMAIL_DOMAIN,
  CNC_EMAIL_REGEX,
  DOMAIN_ERROR_MESSAGE,
  isAllowedEmailDomain,
  normalizeEmail,
  validateEmailForAuth,
} from "@/lib/auth/validation";
