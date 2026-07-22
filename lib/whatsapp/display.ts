import "server-only";

import { WHATSAPP_TEMPLATE_NAMES } from "@/lib/whatsapp/renewal-template";

export type WhatsAppDisplayConfig = {
  configured: boolean;
  phoneNumberIdMasked: string;
  tokenConfigured: boolean;
  apiVersion: string;
  templates: { gentle: string; urgent: string; final: string };
};

function maskId(value: string | undefined): string {
  if (!value) return "—";
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

export function getWhatsAppDisplayConfig(): WhatsAppDisplayConfig {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const tokenConfigured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);

  return {
    configured: Boolean(phoneNumberId && tokenConfigured),
    phoneNumberIdMasked: maskId(phoneNumberId),
    tokenConfigured,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? "v21.0",
    templates: WHATSAPP_TEMPLATE_NAMES,
  };
}
