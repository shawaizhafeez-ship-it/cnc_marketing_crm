"use client";

import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { triggerMarketingSend } from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";

export function SendMarketingButton() {
  const [pending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await triggerMarketingSend();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.stats) {
        const { sent, skipped, failed, processed, limitReached } = result.stats;
        toast.success(
          `Processed ${processed}: ${sent} sent, ${skipped} skipped, ${failed} failed${limitReached ? " (daily limit reached)" : ""}`
        );
      }
    });
  }

  return (
    <Button onClick={handleSend} disabled={pending} variant="outline">
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          Send pending marketing emails now
        </>
      )}
    </Button>
  );
}
