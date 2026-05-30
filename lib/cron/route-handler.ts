import { verifyCronRequest } from "@/lib/cron/auth";
import { NextRequest, NextResponse } from "next/server";

export { verifyCronRequest };

export function unauthorizedCronResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function withCronAuth(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  if (!verifyCronRequest(request)) {
    return unauthorizedCronResponse();
  }
  return handler();
}
