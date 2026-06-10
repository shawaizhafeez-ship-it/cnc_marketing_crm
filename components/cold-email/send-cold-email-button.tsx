"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { triggerColdEmailSend } from "@/app/(dashboard)/marketing/cold-email/actions";
import { Button } from "@/components/ui/button";

type SendColdEmailButtonProps = {
  label?: string;
};

export function SendColdEmailButton({
  label = "Send pending cold emails now",
}: SendColdEmailButtonProps) {
  const router = useRouter();
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
          `Processed ${processed}: ${sent} sent, ${failed} failed${limitReached ? " (daily limit reached)" : ""}.`
        );
        router.refresh();
      }
    });
  }

  return (
    <Button onClick={handleSend} disabled={pending} variant="default">
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}
