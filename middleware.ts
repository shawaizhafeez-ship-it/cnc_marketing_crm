import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/signup", "/auth/callback"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/** Cron routes authenticate via Authorization: Bearer CRON_SECRET, not session cookies. */
function isCronRoute(pathname: string): boolean {
  return pathname === "/api/cron" || pathname.startsWith("/api/cron/");
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    if (isCronRoute(pathname)) {
      return NextResponse.next();
    }

    const { supabaseResponse, user, invalidDomain } = await updateSession(request);

    if (invalidDomain) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set(
        "error",
        "Only @cncservices.net accounts are allowed."
      );
      return NextResponse.redirect(loginUrl);
    }

    if (isPublicRoute(pathname)) {
      if (user) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return supabaseResponse;
    }

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Middleware session error:", error);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "error",
      "Session check failed. Verify Supabase env vars on Vercel."
    );
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
