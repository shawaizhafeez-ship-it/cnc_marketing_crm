import { revalidatePath } from "next/cache";
import { syncCertificatesFromSheet } from "@/lib/sheets/sync";
import { createAdminClient } from "@/lib/supabase/admin";

const REVALIDATE_PATHS = [
  "/dashboard",
  "/renewals",
  "/marketing/campaigns",
  "/marketing/campaigns/new",
  "/settings",
] as const;

/**
 * Pulls the latest Google Sheets rows into Supabase after the dashboard loads.
 * Failures are logged only — the app should still render.
 */
export async function syncGoogleSheetsOnAppLoad(): Promise<void> {
  try {
    const admin = createAdminClient();
    const stats = await syncCertificatesFromSheet(admin);

    if (stats.status === "failed") {
      console.error(
        "Sheet sync on app load failed:",
        stats.errors.join("; ") || "unknown error"
      );
      return;
    }

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }
  } catch (error) {
    console.error(
      "Sheet sync on app load failed:",
      error instanceof Error ? error.message : error
    );
  }
}
