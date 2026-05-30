import { redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/supabase/server";
import { validateEmailForAuth } from "@/lib/auth/validation";
import { MobileHeader } from "@/components/shared/mobile-header";
import { Sidebar } from "@/components/shared/sidebar";
import { UserNav } from "@/components/shared/user-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const emailValidation = validateEmailForAuth(user.email);
  if (!emailValidation.valid) {
    redirect("/login?error=Only%20%40cncservices.net%20accounts%20are%20allowed.");
  }

  const profile = await getProfile();

  if (profile && !profile.is_active) {
    redirect("/login?error=Your%20account%20has%20been%20deactivated.");
  }

  const email = profile?.email ?? user.email;
  const fullName = profile?.full_name;
  const role = profile?.role;

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
