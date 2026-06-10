"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { triggerMarketingSend } from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";

export function SendMarketingButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await triggerMarketingSend();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.stats) {
        const { sent, skipped, failed, processed } = result.stats;
        toast.success(
          `Processed ${processed}: ${sent} sent, ${skipped} skipped, ${failed} failed.`
        );
        router.refresh();
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
