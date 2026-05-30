"use server";

import { revalidatePath } from "next/cache";
import { logEmailSend } from "@/lib/email/log-email";
import { RENEWAL_CC, sendEmail } from "@/lib/email/smtp";
import { createClient } from "@/lib/supabase/server";

export type ManualEmailActionState = {
  error?: string;
  success?: string;
};

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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendManualEmail(input: {
  recipientEmail: string;
  subject: string;
  htmlBody: string;
  ccAdmin: boolean;
  companyName?: string;
}): Promise<ManualEmailActionState> {
  const recipientEmail = input.recipientEmail.trim();
  const subject = input.subject.trim();
  const htmlBody = input.htmlBody.trim();
  const companyName = input.companyName?.trim() || recipientEmail.split("@")[0];

  if (!recipientEmail || !subject || !htmlBody) {
    return { error: "Recipient, subject, and body are required." };
  }

  if (!isValidEmail(recipientEmail)) {
    return { error: "Please enter a valid recipient email address." };
  }

  const { supabase, userId } = await requireUser();

  const sendResult = await sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    cc: input.ccAdmin ? RENEWAL_CC : undefined,
    account: "renewal",
  });

  if (sendResult.success) {
    await logEmailSend(supabase, {
      emailType: "manual",
      recipientEmail,
      companyName,
      subject,
      certificateCount: 0,
      status: "sent",
      smtpMessageId: sendResult.messageId,
      sentBy: userId,
    });

    revalidatePath("/logs");
    revalidatePath("/dashboard");

    return { success: "Email sent successfully." };
  }

  await logEmailSend(supabase, {
    emailType: "manual",
    recipientEmail,
    companyName,
    subject,
    certificateCount: 0,
    status: "failed",
    errorMessage: sendResult.error,
    sentBy: userId,
  });

  revalidatePath("/logs");

  return { error: sendResult.error };
}
