"use client";

import { RouteError } from "@/components/shared/route-error";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Dashboard error"
      description="We couldn't load this section. Your session may have expired, or there was a server problem."
    />
  );
}
