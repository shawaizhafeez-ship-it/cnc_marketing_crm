import "server-only";

import nodemailer from "nodemailer";

export type SmtpAccount = "renewal" | "marketing";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  account?: SmtpAccount;
};

function getSmtpConfig(account: SmtpAccount) {
  if (account === "marketing") {
    return {
      host: process.env.SMTP_MARKETING_HOST ?? "mail.cncservices.net",
      port: Number(process.env.SMTP_MARKETING_PORT ?? 465),
      user: process.env.SMTP_MARKETING_USER ?? "info@cncservices.net",
      password: process.env.SMTP_MARKETING_PASSWORD,
    };
  }

  return {
    host: process.env.SMTP_RENEWAL_HOST ?? "mail.cncservices.net",
    port: Number(process.env.SMTP_RENEWAL_PORT ?? 465),
    user: process.env.SMTP_RENEWAL_USER ?? "renewal@cncservices.net",
    password: process.env.SMTP_RENEWAL_PASSWORD,
  };
}

function createTransporter(account: SmtpAccount) {
  const config = getSmtpConfig(account);

  if (!config.password) {
    throw new Error(
      account === "renewal"
        ? "SMTP_RENEWAL_PASSWORD is not configured"
        : "SMTP_MARKETING_PASSWORD is not configured"
    );
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: Number(process.env.SMTP_TIMEOUT ?? 30_000),
  });
}

export async function testSmtpConnection(
  account: SmtpAccount = "renewal"
): Promise<{ success: true; message: string } | { success: false; message: string }> {
  try {
    const transporter = createTransporter(account);
    await transporter.verify();
    return { success: true, message: "SMTP connection successful" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  const account = options.account ?? "renewal";
  const config = getSmtpConfig(account);

  try {
    const transporter = createTransporter(account);
    const info = await transporter.sendMail({
      from: config.user,
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: options.html,
    });

    return {
      success: true,
      messageId: info.messageId ?? "",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export const RENEWAL_CC = ["admin@cncservices.net"];
export const MARKETING_CC = ["admin@cncservices.net"];
