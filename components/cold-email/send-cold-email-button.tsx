"use client";

import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { triggerColdEmailSend } from "@/app/(dashboard)/marketing/cold-email/actions";
import { Button } from "@/components/ui/button";

export function SendColdEmailButton() {
  const [pending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await triggerColdEmailSend();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.stats) {
        const { sent, failed, processed, limitReached } = result.stats;
        toast.success(
          `Processed ${processed}: ${sent} sent, ${failed} failed${limitReached ? " (daily limit reached)" : ""}`
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
          Send pending cold emails now
        </>
      )}
    </Button>
  );
}
