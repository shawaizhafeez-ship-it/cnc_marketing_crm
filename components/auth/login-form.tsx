"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Mail, Lock, Loader2 } from "lucide-react";
import {
  signInWithEmail,
  type AuthActionState,
} from "@/app/(auth)/actions";
import { validateEmailForAuth } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionState = {};

type LoginFormProps = {
  redirectTo?: string;
  initialError?: string;
};

export function LoginForm({ redirectTo, initialError }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    signInWithEmail,
    initialState
  );
  const [clientError, setClientError] = useState<string | null>(
    initialError ?? null
  );

  const displayError = clientError ?? state.error;
  const displaySuccess = state.success;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setClientError(null);

    if (!password) {
      event.preventDefault();
      setClientError("Password is required.");
      return;
    }

    const validation = validateEmailForAuth(email);
    if (!validation.valid) {
      event.preventDefault();
      setClientError(validation.error ?? "Invalid email address.");
    }
  }

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Sign in
        </CardTitle>
        <CardDescription>
          Use your @cncservices.net account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
          <input
            type="hidden"
            name="redirectTo"
            value={redirectTo ?? "/dashboard"}
          />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@cncservices.net"
                autoComplete="email"
                required
                pattern="[a-zA-Z0-9._%+-]+@cncservices\.net"
                title="Only @cncservices.net email addresses are allowed"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={1}
                className="pl-9"
              />
            </div>
          </div>

          {displayError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </div>
          )}

          {displaySuccess && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">
              {displaySuccess}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Access restricted to CNC Services staff with a{" "}
          <span className="font-medium">@cncservices.net</span> email address.
        </p>
      </CardContent>
    </Card>
  );
}
