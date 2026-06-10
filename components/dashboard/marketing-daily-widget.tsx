import type { MarketingDailyStatus } from "@/lib/email/daily-limit";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Marketing emails today</CardTitle>
        <CardDescription>
          Campaign emails have no daily limit. Cold email keeps a separate{" "}
          {status.marketingLimit}/day cap on the marketing SMTP account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold">{status.marketingSent}</p>
            <p className="text-sm text-muted-foreground">
              Marketing-account sends tracked today (mostly cold email)
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Renewals sent today: {status.renewalSent}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
