import { NextRequest, NextResponse } from "next/server";
import { withCronAuth } from "@/lib/cron/route-handler";
import { syncCertificatesFromSheet } from "@/lib/sheets/sync";
import { createAdminClient } from "@/lib/supabase/admin";

async function runSync() {
  const supabase = createAdminClient();
  return syncCertificatesFromSheet(supabase);
}

/**
 * Vercel Cron invokes GET. POST supported for manual/curl triggers.
 */
export async function GET(request: NextRequest) {
  return withCronAuth(request, async () => {
    try {
      const stats = await runSync();
      return NextResponse.json(stats, {
        status: stats.status === "failed" ? 500 : 200,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
