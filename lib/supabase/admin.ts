import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/supabase/database.types";

/**
 * Service-role Supabase client for cron jobs and server-side sync.
 * Bypasses RLS — never import in client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing Vercel environment variable(s): ${missing.join(", ")}. ` +
        "Add them under Project → Settings → Environment Variables (Production), " +
        "then redeploy — saving env vars alone does not update a live deployment."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
