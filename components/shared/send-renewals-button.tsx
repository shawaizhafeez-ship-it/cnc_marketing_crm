"use client";

import { useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { triggerRenewalSend } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";

export function SendRenewalsButton() {
  const [pending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await triggerRenewalSend();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.stats) {
        const { sent, skipped, failed, processed } = result.stats;
        toast.success(
          `Processed ${processed}: ${sent} sent, ${skipped} skipped, ${failed} failed`
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
          <Mail className="h-4 w-4" />
          Process pending renewal emails now
        </>
      )}
    </Button>
  );
}
