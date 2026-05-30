import { NextRequest, NextResponse } from "next/server";
import { withCronAuth } from "@/lib/cron/route-handler";
import { runRenewalSendCron } from "@/lib/email/send-renewal";

/**
 * Vercel Cron invokes GET every 5 minutes. POST supported for manual triggers.
 */
export async function GET(request: NextRequest) {
  return withCronAuth(request, async () => {
    try {
      const stats = await runRenewalSendCron();
      return NextResponse.json(stats, {
        status: stats.status === "failed" ? 500 : 200,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Renewal send cron failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
