import type { MarketingDailyStatus } from "@/lib/email/daily-limit";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MarketingDailyWidgetProps = {
  status: MarketingDailyStatus;
};

export function MarketingDailyWidget({ status }: MarketingDailyWidgetProps) {
  const pct =
    status.marketingLimit > 0
      ? Math.round((status.marketingSent / status.marketingLimit) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Marketing emails today</CardTitle>
        <CardDescription>
          Renewal sends are tracked separately and do not count toward this
          limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold">
              {status.marketingSent}
              <span className="text-lg font-normal text-muted-foreground">
                {" "}
                / {status.marketingLimit}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {status.remaining} remaining today
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Renewals sent today: {status.renewalSent}
          </p>
        </div>

        <Progress value={pct} className="h-2" />

        {!status.canSend && (
          <p className="text-sm text-amber-700">
            Daily marketing limit reached. Pending emails will resume tomorrow.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
