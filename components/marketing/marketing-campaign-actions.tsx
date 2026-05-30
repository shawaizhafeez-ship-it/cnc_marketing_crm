"use client";

import { useTransition } from "react";
import { Loader2, Pause, Play, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  cancelMarketingCampaign,
  deleteMarketingCampaign,
  pauseMarketingCampaign,
  resumeMarketingCampaign,
} from "@/app/(dashboard)/marketing/campaigns/actions";
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

type MarketingCampaignActionsProps = {
  campaignId: string;
  status: string;
};

export function MarketingCampaignActions({
  campaignId,
  status,
}: MarketingCampaignActionsProps) {
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
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the campaign, touchpoints, and scheduled
              emails.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                runWithResult(
                  () => deleteMarketingCampaign(campaignId),
                  "Campaign deleted"
                )
              }
            >
              Delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => pauseMarketingCampaign(campaignId), "Campaign paused")
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <Pause className="h-4 w-4" />}
          Pause
        </Button>
      )}

      {status === "paused" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => resumeMarketingCampaign(campaignId), "Campaign resumed")
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <Play className="h-4 w-4" />}
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
            <XCircle className="h-4 w-4" />
            Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Pending scheduled emails will be marked cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep campaign</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                run(
                  () => cancelMarketingCampaign(campaignId),
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
