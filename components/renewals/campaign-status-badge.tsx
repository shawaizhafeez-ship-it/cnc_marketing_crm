import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  completed: "secondary",
  cancelled: "destructive",
};

const STATUS_CLASS: Record<string, string> = {
  active: "bg-green-600 hover:bg-green-600/90 border-transparent",
  paused: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-50",
  completed: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent",
};

export function CampaignStatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANTS[status] ?? "secondary";

  return (
    <Badge
      variant={variant}
      className={cn("capitalize", STATUS_CLASS[status])}
    >
      {status}
    </Badge>
  );
}

export function EmailStatusBadge({ status }: { status: string }) {
  const variant =
    status === "failed"
      ? "destructive"
      : status === "sent"
        ? "default"
        : status === "pending"
          ? "outline"
          : "secondary";

  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}
