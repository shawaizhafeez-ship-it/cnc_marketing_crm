"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeEmail,
  validateEmailForAuth,
} from "@/lib/auth/validation";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function safeRedirectPath(path: string): string {
  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return "/dashboard";
}

export async function signInWithEmail(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(
    String(formData.get("redirectTo") ?? "/dashboard")
  );

  if (!password) {
    return { error: "Password is required." };
  }

  const emailValidation = validateEmailForAuth(email);
  if (!emailValidation.valid) {
    return { error: emailValidation.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

/** @deprecated Use signInWithEmail */
export async function signIn(
  prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  return signInWithEmail(prevState, formData);
}

export async function signUpWithEmail(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const emailValidation = validateEmailForAuth(email);
  if (!emailValidation.valid) {
    return { error: emailValidation.error };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
      emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "Account created. Check your email to confirm your address, then sign in.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  if (!validateEmailForAuth(user.email).valid) {
    await supabase.auth.signOut();
    return null;
  }

  return user;
}
