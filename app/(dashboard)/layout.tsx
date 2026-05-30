import { redirect } from "next/navigation";
import { AccountSetupRequired } from "@/components/auth/account-setup-required";
import { MobileHeader } from "@/components/shared/mobile-header";
import { Sidebar } from "@/components/shared/sidebar";
import { UserNav } from "@/components/shared/user-nav";
import { resolveUserProfile } from "@/lib/auth/profile";
import { validateEmailForAuth } from "@/lib/auth/validation";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;

  try {
    user = await getUser();
  } catch (error) {
    console.error("Dashboard layout auth error:", error);
    redirect(
      "/login?error=" +
        encodeURIComponent(
          "Could not verify your session. Check Supabase env vars on Vercel."
        )
    );
  }

  if (!user?.email) {
    redirect("/login");
  }

  const emailValidation = validateEmailForAuth(user.email);
  if (!emailValidation.valid) {
    redirect("/login?error=Only%20%40cncservices.net%20accounts%20are%20allowed.");
  }

  let profile;

  try {
    profile = await resolveUserProfile(user, { autoCreate: true });
  } catch (error) {
    console.error("Dashboard layout profile error:", error);
    redirect(
      "/login?error=" +
        encodeURIComponent(
          error instanceof Error
            ? error.message
            : "Could not load your profile."
        )
    );
  }

  if (!profile) {
    return <AccountSetupRequired userId={user.id} email={user.email} />;
  }

  if (!profile.is_active) {
    redirect("/login?error=Your%20account%20has%20been%20deactivated.");
  }

  const email = profile.email ?? user.email;
  const fullName = profile.full_name;
  const role = profile.role;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar email={email} fullName={fullName} role={role} />

      <div className="flex flex-1 flex-col">
        <MobileHeader email={email} fullName={fullName} role={role} />

        <header className="hidden h-16 items-center justify-end border-b bg-card px-6 md:flex">
          <UserNav email={email} fullName={fullName} role={role} />
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
