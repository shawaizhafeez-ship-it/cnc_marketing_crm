"use client";

import { useTransition } from "react";
import { Loader2, Pause, Play, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  cancelRenewalCampaign,
  pauseRenewalCampaign,
  resumeRenewalCampaign,
} from "@/app/(dashboard)/renewals/campaigns/actions";
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

type CampaignActionsProps = {
  campaignId: string;
  status: string;
};

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed");
      }
    });
  }

  if (status === "cancelled" || status === "completed") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => pauseRenewalCampaign(campaignId), "Campaign paused")
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

      {status === "paused" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => resumeRenewalCampaign(campaignId), "Campaign resumed")
          }
        >
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Resume
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
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Pending scheduled emails will be marked cancelled. Sent emails
              are not affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep campaign</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                run(
                  () => cancelRenewalCampaign(campaignId),
                  "Campaign cancelled"
                )
              }
            >
              Cancel campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
