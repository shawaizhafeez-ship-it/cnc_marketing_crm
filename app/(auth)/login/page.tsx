import { Mail } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
          <Mail className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          CNC Services
        </h1>
        <p className="mt-1 text-sm text-slate-300">Marketing CRM</p>
      </div>

      <div className="w-full max-w-md">
        <LoginForm
          redirectTo={params.redirectTo}
          initialError={params.error}
        />
      </div>
    </div>
  );
}
