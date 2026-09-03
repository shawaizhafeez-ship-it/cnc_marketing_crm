"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  CalendarClock,
  FileText,
  Megaphone,
  Mail,
  PenLine,
  ScrollText,
  Settings,
  Shield,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/brand-logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/renewals", label: "Renewals", icon: Send },
  { href: "/renewals/campaigns", label: "Renewal Campaigns", icon: CalendarClock },
  { href: "/marketing/templates", label: "Marketing Templates", icon: FileText },
  { href: "/marketing/campaigns", label: "Marketing Campaigns", icon: Megaphone },
  { href: "/marketing/cold-email", label: "Cold Email", icon: Mail },
  { href: "/manual-email", label: "Manual Email", icon: PenLine },
  { href: "/performance", label: "Operation Performance", icon: TrendingUp },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/renewals") return pathname === "/renewals";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  email: string;
  fullName?: string | null;
  role?: string | null;
};

export function Sidebar({ email, fullName, role }: SidebarProps) {
  const pathname = usePathname();
  const displayName = fullName ?? email.split("@")[0];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <BrandLogo />
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(pathname, href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-slate-300 hover:bg-sidebar-accent/60 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-sidebar-accent/40 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-white">{displayName}</p>
          <p className="truncate text-xs text-slate-300">{email}</p>
          {role && (
            <div className="mt-1.5 flex items-center gap-1 text-xs capitalize text-slate-400">
              <Shield className="h-3 w-3" />
              {role}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export { navItems, isActive };
