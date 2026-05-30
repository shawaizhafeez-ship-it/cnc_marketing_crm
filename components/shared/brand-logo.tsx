import Link from "next/link";
import { Mail } from "lucide-react";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
        <Mail className="h-5 w-5 text-white" />
      </div>
      {!compact && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight text-white">
            CNC Services
          </span>
          <span className="text-xs text-slate-300">Marketing CRM</span>
        </div>
      )}
    </Link>
  );
}
