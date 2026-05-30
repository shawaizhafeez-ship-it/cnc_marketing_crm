import { AlertTriangle } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { profileSetupSql } from "@/lib/auth/profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AccountSetupRequiredProps = {
  userId: string;
  email: string;
};

export function AccountSetupRequired({
  userId,
  email,
}: AccountSetupRequiredProps) {
  const sql = profileSetupSql({ id: userId, email });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-2xl border-amber-500/30">
        <CardHeader>
          <AlertTriangle className="mb-2 h-8 w-8 text-amber-600" />
          <CardTitle>Account setup required</CardTitle>
          <CardDescription>
            You signed in as <strong>{email}</strong>, but no profile row exists
            in the database. The app needs this row before you can use the
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Run this SQL in Supabase → SQL Editor, then refresh this page:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
            {sql}
          </pre>
          <p className="text-sm text-muted-foreground">
            Also confirm these Vercel environment variables are set for project{" "}
            <code className="rounded bg-muted px-1">ubpmxqsteenhvstqpjpz</code>
            :{" "}
            <code className="rounded bg-muted px-1">
              NEXT_PUBLIC_SUPABASE_URL
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            , and{" "}
            <code className="rounded bg-muted px-1">
              SUPABASE_SERVICE_ROLE_KEY
            </code>
            .
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
