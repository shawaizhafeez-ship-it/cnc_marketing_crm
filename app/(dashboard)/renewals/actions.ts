"use server";

import { createClient } from "@/lib/supabase/server";
import { logEmailSend } from "@/lib/email/log-email";
import {
  generateRenewalEmailHtml,
  RENEWAL_EMAIL_SUBJECT,
} from "@/lib/email/renewal-template";
import { RENEWAL_CC, sendEmail, testSmtpConnection as testSmtp } from "@/lib/email/smtp";
import {
  computeRenewalStats,
  getAvailableMonthsYears,
  prepareEmailData,
} from "@/lib/renewals/prepare-email-data";
import type {
  CertificateRow,
  RenewalBatchResult,
  RenewalPreviewResult,
  SendRenewalResult,
} from "@/lib/renewals/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return { supabase, userId: user.id };
}

async function fetchAllActiveCertificates(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CertificateRow[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select(
      "id, certificate_no, company_name, item, expiry_date, recipient_email, renewal_amount, ops_status, contact_person, phone"
    )
    .neq("ops_status", "done")
    .order("expiry_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to load certificates: ${error.message}`);
  }

  return (data ?? []).filter(
    (row) => row.ops_status.trim().toLowerCase() !== "done"
  ) as CertificateRow[];
}

function validateMonthYear(month: number, year: number) {
  if (month < 1 || month > 12) {
    throw new Error("Invalid month selected.");
  }
  if (year < 2020 || year > 2100) {
    throw new Error("Invalid year selected.");
  }
}

export async function getRenewalPeriodOptions() {
  const { supabase } = await requireUser();
  const certificates = await fetchAllActiveCertificates(supabase);
  return getAvailableMonthsYears(certificates);
}

export async function getRenewalData(month: number, year: number) {
  validateMonthYear(month, year);
  const { supabase } = await requireUser();
  const certificates = await fetchAllActiveCertificates(supabase);
  const { emailData, filteredCertificates } = prepareEmailData(
    certificates,
    month,
    year
  );
  const stats = computeRenewalStats(filteredCertificates);
  const options = getAvailableMonthsYears(certificates);

  return {
    emailData,
    certificates: filteredCertificates,
    stats,
    options,
    month,
    year,
  };
}

export async function getRenewalPreview(
  recipientEmail: string,
  month: number,
  year: number
): Promise<RenewalPreviewResult | { error: string }> {
  try {
    validateMonthYear(month, year);
    const { supabase } = await requireUser();
    const certificates = await fetchAllActiveCertificates(supabase);
    const { emailData } = prepareEmailData(certificates, month, year);
    const normalized = recipientEmail.trim().toLowerCase();
    const group = emailData[normalized];

    if (!group) {
      return { error: "No certificates found for this recipient in the selected period." };
    }

    const html = generateRenewalEmailHtml(group.certificates);

    return {
      recipientEmail: group.recipientEmail,
      company: group.company,
      subject: RENEWAL_EMAIL_SUBJECT,
      html,
      certificateCount: group.certificateCount,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to generate preview",
    };
  }
}

async function sendOneRenewalEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  recipientEmail: string,
  month: number,
  year: number
): Promise<SendRenewalResult> {
  const certificates = await fetchAllActiveCertificates(supabase);
  const { emailData } = prepareEmailData(certificates, month, year);
  const group = emailData[recipientEmail.trim().toLowerCase()];

  if (!group) {
    return {
      recipientEmail,
      company: "",
      certificateCount: 0,
      success: false,
      message: "Recipient not found in filtered data",
    };
  }

  const html = generateRenewalEmailHtml(group.certificates);
  const sendResult = await sendEmail({
    to: group.recipientEmail,
    subject: RENEWAL_EMAIL_SUBJECT,
    html,
    cc: RENEWAL_CC,
    account: "renewal",
  });

  if (sendResult.success) {
    await logEmailSend(supabase, {
      emailType: "renewal",
      recipientEmail: group.recipientEmail,
      companyName: group.company,
      subject: RENEWAL_EMAIL_SUBJECT,
      certificateCount: group.certificateCount,
      status: "sent",
      smtpMessageId: sendResult.messageId,
      sentBy: userId,
    });

    return {
      recipientEmail: group.recipientEmail,
      company: group.company,
      certificateCount: group.certificateCount,
      success: true,
      message: "Email sent successfully",
    };
  }

  await logEmailSend(supabase, {
    emailType: "renewal",
    recipientEmail: group.recipientEmail,
    companyName: group.company,
    subject: RENEWAL_EMAIL_SUBJECT,
    certificateCount: group.certificateCount,
    status: "failed",
    errorMessage: sendResult.error,
    sentBy: userId,
  });

  return {
    recipientEmail: group.recipientEmail,
    company: group.company,
    certificateCount: group.certificateCount,
    success: false,
    message: sendResult.error,
  };
}

export async function sendRenewalBatch(
  month: number,
  year: number
): Promise<RenewalBatchResult | { error: string }> {
  try {
    validateMonthYear(month, year);
    const { supabase, userId } = await requireUser();
    const certificates = await fetchAllActiveCertificates(supabase);
    const { emailData } = prepareEmailData(certificates, month, year);
    const recipients = Object.keys(emailData);

    const results: SendRenewalResult[] = [];

    for (const recipientEmail of recipients) {
      const result = await sendOneRenewalEmail(
        supabase,
        userId,
        recipientEmail,
        month,
        year
      );
      results.push(result);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    return {
      results,
      successful,
      failed,
      total: results.length,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Batch send failed",
    };
  }
}

export async function sendSingleRenewalEmail(
  recipientEmail: string,
  month: number,
  year: number
): Promise<SendRenewalResult | { error: string }> {
  try {
    validateMonthYear(month, year);
    const { supabase, userId } = await requireUser();
    return sendOneRenewalEmail(supabase, userId, recipientEmail, month, year);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Send failed",
    };
  }
}

export async function testSmtpConnection() {
  await requireUser();
  return testSmtp("renewal");
}
