import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

/**
 * Supabase email invite / confirmation / magic-link callback.
 * Configure redirect URL in Supabase: {APP_URL}/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      errorDescription?.replace(/\+/g, " ") ??
        "Email link is invalid or has expired. Request a new invite."
    );
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return NextResponse.redirect(new URL(next, origin));
    }

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      exchangeError.message ??
        "Could not verify email link. Request a new invite."
    );
    return NextResponse.redirect(loginUrl);
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set(
    "error",
    "Invalid confirmation link. Request a new invite from your administrator."
  );
  return NextResponse.redirect(loginUrl);
}
