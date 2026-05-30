"use client";

import { useTransition } from "react";
import { Loader2, Pause, Play, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  cancelColdEmailBatch,
  deleteColdEmailBatch,
  pauseColdEmailBatch,
  startColdEmailBatch,
} from "@/app/(dashboard)/marketing/cold-email/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ColdEmailActionsProps = {
  batchId: string;
  status: string;
};

export function ColdEmailActions({ batchId, status }: ColdEmailActionsProps) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed");
      }
    });
  }

  function runWithResult(
    action: () => Promise<{ error?: string; success?: string }>,
    fallbackSuccess: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success ?? fallbackSuccess);
    });
  }

  if (status === "cancelled" || status === "completed") {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the batch and all recipient records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                runWithResult(
                  () => deleteColdEmailBatch(batchId),
                  "Batch deleted"
                )
              }
            >
              Delete batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "draft" || status === "paused") && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => startColdEmailBatch(batchId), "Batch started")
          }
        >
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {status === "draft" ? "Start sending" : "Resume"}
        </Button>
      )}

      {status === "active" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => pauseColdEmailBatch(batchId), "Batch paused")
          }
        >
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
          Pause
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            className="text-destructive hover:text-destructive"
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Pending recipients will be marked cancelled and will not be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep batch</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                run(() => cancelColdEmailBatch(batchId), "Batch cancelled")
              }
            >
              Cancel batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
