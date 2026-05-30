import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_DOMAIN = "cncservices.net";
const CNC_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@cncservices\.net$/i;

function isAllowedEmail(email: string | undefined): boolean {
  if (!email) return false;
  return CNC_EMAIL_REGEX.test(email.trim().toLowerCase());
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not use getSession(); always validate with getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sign out sessions with non-CNC emails (defense in depth)
  if (user?.email && !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    return { supabaseResponse, user: null, invalidDomain: true };
  }

  return { supabaseResponse, user, invalidDomain: false };
}

export { ALLOWED_DOMAIN, isAllowedEmail };
