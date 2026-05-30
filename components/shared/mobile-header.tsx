"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/brand-logo";
import { navItems, isActive } from "@/components/shared/sidebar";
import { UserNav } from "@/components/shared/user-nav";
import { Button } from "@/components/ui/button";

type MobileHeaderProps = {
  email: string;
  fullName?: string | null;
  role?: string | null;
};

export function MobileHeader({ email, fullName, role }: MobileHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const displayName = fullName ?? email.split("@")[0];

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <>
      <header className="relative z-40 flex h-16 items-center justify-between border-b bg-sidebar px-4 md:hidden">
        <BrandLogo compact />

        <div className="flex items-center gap-2">
          <UserNav email={email} fullName={fullName} role={role} />
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav-drawer"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close menu"
          onClick={close}
        />
      )}

      <aside
        id="mobile-nav-drawer"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar shadow-xl transition-transform duration-200 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <BrandLogo />
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={close}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
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
              <p className="mt-1 text-xs capitalize text-slate-400">{role}</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
