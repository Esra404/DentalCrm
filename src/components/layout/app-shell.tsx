"use client";

import { useState, type ReactNode } from "react";
import type { CurrentUser } from "@/lib/auth/session";
import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";

type AppShellProps = {
  user: CurrentUser;
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-[var(--ink)]">
      <a
        className="sr-only z-50 rounded-md bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-[var(--accent)]"
        href="#main-content"
      >
        İçeriğe geç
      </a>
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        role={user.role}
      />
      {mobileOpen ? (
        <button
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-30 bg-[#102a27]/45 lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}
      <div className="min-h-dvh min-w-0 lg:pl-[17rem]">
        <AppHeader
          mobileOpen={mobileOpen}
          onMenuToggle={() => setMobileOpen((open) => !open)}
          user={user}
        />
        <main
          className="mx-auto min-h-[calc(100dvh-4.5rem)] w-full max-w-[1600px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-9"
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}