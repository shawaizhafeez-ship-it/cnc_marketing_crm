"use client";

import { useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createDefaultTemplates } from "@/app/(dashboard)/marketing/templates/actions";
import { Button } from "@/components/ui/button";

export function SeedDefaultTemplatesButton() {
  const [pending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const result = await createDefaultTemplates();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.success ?? "Default templates created.");
    });
  }

  return (
    <Button variant="outline" onClick={handleSeed} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Seeding...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Insert default templates
        </>
      )}
    </Button>
  );
}
