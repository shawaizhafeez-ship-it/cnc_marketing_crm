"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
};

export function RouteError({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred while loading this page.",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <AlertTriangle className="mb-2 h-8 w-8 text-destructive" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error.message && (
          <p className="rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
            {error.message}
          </p>
        )}
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
