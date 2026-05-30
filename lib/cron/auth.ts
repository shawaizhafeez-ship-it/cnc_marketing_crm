import "server-only";

import type { NextRequest } from "next/server";

/**
 * Validates Vercel Cron / manual cron invocations via Bearer CRON_SECRET.
 */
export function verifyCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}
