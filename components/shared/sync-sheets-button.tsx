"use client";

import { useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { triggerSheetSync } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";

export function SyncSheetsButton() {
  const [pending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const result = await triggerSheetSync();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.stats) {
        const { rowsInserted, rowsUpdated, rowsSkipped, rowsUnchanged } =
          result.stats;
        toast.success(
          `Sync complete: ${rowsInserted} inserted, ${rowsUpdated} updated, ${rowsSkipped} skipped, ${rowsUnchanged} unchanged`
        );
      }
    });
  }

  return (
    <Button onClick={handleSync} disabled={pending} variant="outline">
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Sync Google Sheets now
        </>
      )}
    </Button>
  );
}
