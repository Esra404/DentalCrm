"use client";

import { ChevronDown, LogOut, Menu } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import type { CurrentUser } from "@/lib/auth/session";
import { getRouteTitle } from "@/lib/navigation";
import { usePathname } from "next/navigation";

type AppHeaderProps = {
  user: CurrentUser;
  mobileOpen: boolean;
  onMenuToggle: () => void;
};

export function AppHeader({ user, mobileOpen, onMenuToggle }: AppHeaderProps) {
  const pathname = usePathname();
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-20 flex h-[4.5rem] items-center justify-between gap-4 border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-controls="crm-sidebar"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
          className="flex size-10 shrink-0 items-center justify-center rounded-md text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hidden"
          onClick={onMenuToggle}
          type="button"
        >
          <Menu aria-hidden="true" size={20} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">
            {getRouteTitle(pathname)}
          </p>
          <p className="hidden truncate text-xs text-[var(--muted)] sm:block">
            Dental CRM / {getRouteTitle(pathname)}
          </p>
        </div>
      </div>

      <details className="group relative shrink-0">
        <summary
          aria-label="Kullanıcı menüsünü aç"
          className="flex cursor-pointer list-none items-center gap-2 rounded-md p-1.5 outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] [&::-webkit-details-marker]:hidden sm:gap-3 sm:px-2"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">
            {initials || "U"}
          </span>
          <span className="hidden max-w-44 text-left sm:block">
            <span className="block truncate text-sm font-medium text-[var(--ink)]">
              {user.name}
            </span>
            <span className="block text-xs text-[var(--muted)]">{user.role}</span>
          </span>
          <ChevronDown aria-hidden="true" className="hidden text-[var(--muted)] sm:block" size={16} />
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.6rem)] z-30 w-64 rounded-md border border-[var(--line)] bg-white p-3 shadow-lg">
          <div className="border-b border-[var(--line)] px-2 pb-3">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{user.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
              {user.role}
            </p>
          </div>
          <form action={logoutAction} className="pt-2">
            <button
              className="flex min-h-10 w-full items-center gap-2 rounded px-2 text-left text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              type="submit"
            >
              <LogOut aria-hidden="true" size={16} />
              Çıkış Yap
            </button>
          </form>
        </div>
      </details>
    </header>
  );
}