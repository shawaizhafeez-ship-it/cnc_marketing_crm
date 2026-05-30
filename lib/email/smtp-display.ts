import "server-only";

import { MARKETING_CC, RENEWAL_CC } from "@/lib/email/smtp";

export type SmtpDisplayConfig = {
  host: string;
  port: number;
  from: string;
  passwordConfigured: boolean;
  cc: string[];
};

export function getMaskedSmtpConfigs(): {
  renewal: SmtpDisplayConfig;
  marketing: SmtpDisplayConfig;
} {
  return {
    renewal: {
      host: process.env.SMTP_RENEWAL_HOST ?? "mail.cncservices.net",
      port: Number(process.env.SMTP_RENEWAL_PORT ?? 465),
      from: process.env.SMTP_RENEWAL_USER ?? "renewal@cncservices.net",
      passwordConfigured: Boolean(process.env.SMTP_RENEWAL_PASSWORD),
      cc: RENEWAL_CC,
    },
    marketing: {
      host: process.env.SMTP_MARKETING_HOST ?? "mail.cncservices.net",
      port: Number(process.env.SMTP_MARKETING_PORT ?? 465),
      from: process.env.SMTP_MARKETING_USER ?? "info@cncservices.net",
      passwordConfigured: Boolean(process.env.SMTP_MARKETING_PASSWORD),
      cc: MARKETING_CC,
    },
  };
}
