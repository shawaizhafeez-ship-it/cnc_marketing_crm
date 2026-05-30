"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  signUpWithEmail,
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

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    signUpWithEmail,
    initialState
  );
  const [clientError, setClientError] = useState<string | null>(null);

  const displayError = clientError ?? state.error;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setClientError(null);

    const validation = validateEmailForAuth(email);
    if (!validation.valid) {
      event.preventDefault();
      setClientError(validation.error ?? "Invalid email address.");
      return;
    }

    if (password.length < 8) {
      event.preventDefault();
      setClientError("Password must be at least 8 characters.");
    }
  }

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create account
        </CardTitle>
        <CardDescription>
          Sign up with your @cncservices.net email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Your name"
                autoComplete="name"
                className="pl-9"
              />
            </div>
          </div>

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
                autoComplete="new-password"
                required
                minLength={8}
                className="pl-9"
              />
            </div>
          </div>

          {displayError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </div>
          )}

          {state.success && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">
              {state.success}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
