import "server-only";

/**
 * WhatsApp transport via the Meta WhatsApp Cloud API.
 *
 * Mirrors the contract of lib/email/smtp.ts `sendEmail`: it NEVER throws for a
 * failed send — it always resolves the discriminated union so the renewal send
 * pipeline can branch on `success` and apply its retry/backoff logic uniformly
 * across email and WhatsApp.
 *
 * Business-initiated messages must use pre-approved templates, so we only send
 * the `template` message type (name + language + body variables), never free text.
 */

const DEFAULT_API_VERSION = "v21.0";

export type WhatsAppSendResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

export type SendWhatsAppTemplateOptions = {
  /** Destination in E.164 (with or without leading +), e.g. "923001234567". */
  to: string;
  /** Approved Meta template name. */
  templateName: string;
  /** Ordered BODY variable values ({{1}}, {{2}}, …). */
  bodyParams: string[];
  /** Template language code, e.g. "en" or "en_US". */
  languageCode?: string;
};

export type SendWhatsAppTemplateFn = typeof sendWhatsAppTemplate;

function getWhatsAppConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? DEFAULT_API_VERSION,
  };
}

/** True when the minimum env is present to attempt a WhatsApp send. */
export function isWhatsAppConfigured(): boolean {
  const { phoneNumberId, accessToken } = getWhatsAppConfig();
  return Boolean(phoneNumberId && accessToken);
}

function buildTemplatePayload(options: SendWhatsAppTemplateOptions) {
  return {
    messaging_product: "whatsapp",
    to: options.to,
    type: "template",
    template: {
      name: options.templateName,
      language: { code: options.languageCode ?? "en" },
      components: [
        {
          type: "body",
          parameters: options.bodyParams.map((text) => ({
            type: "text",
            text,
          })),
        },
      ],
    },
  };
}

export async function sendWhatsAppTemplate(
  options: SendWhatsAppTemplateOptions
): Promise<WhatsAppSendResult> {
  const { phoneNumberId, accessToken, apiVersion } = getWhatsAppConfig();

  if (!phoneNumberId || !accessToken) {
    return {
      success: false,
      error:
        "WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN missing)",
    };
  }

  if (!options.to) {
    return { success: false, error: "Missing WhatsApp destination number" };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildTemplatePayload(options)),
    });

    const data = (await response.json().catch(() => null)) as
      | {
          messages?: Array<{ id?: string }>;
          error?: { message?: string };
        }
      | null;

    if (!response.ok) {
      const message =
        data?.error?.message ??
        `WhatsApp API error (HTTP ${response.status})`;
      return { success: false, error: message };
    }

    const messageId = data?.messages?.[0]?.id ?? "";
    return { success: true, messageId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send WhatsApp message",
    };
  }
}

/** Settings-page connectivity check — validates config presence. */
export async function testWhatsAppConfig(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isWhatsAppConfigured()) {
    return {
      success: false,
      message:
        "WhatsApp not configured — set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.",
    };
  }
  return { success: true, message: "WhatsApp credentials are configured." };
}
