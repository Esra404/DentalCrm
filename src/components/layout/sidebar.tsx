"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Smile, X } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import { CRM_NAVIGATION } from "@/lib/navigation";

type SidebarProps = {
  role: Role;
  mobileOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ role, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = CRM_NAVIGATION.filter((item) => item.roles.includes(role));
  const groups = [...new Set(visibleItems.map((item) => item.group))];

  return (
    <aside
      aria-label="Application sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-white/10 bg-[#173d37] text-white transition-transform duration-200 ease-out lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      id="crm-sidebar"
    >
      <div className="flex h-[4.5rem] items-center justify-between border-b border-white/10 px-5">
        <Link
          className="flex min-w-0 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          href="/dashboard"
          onClick={onClose}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#d9eee7] text-[#173d37]">
            <Smile aria-hidden="true" size={20} strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">Dental CRM</span>
            <span className="block truncate text-xs text-white/60">Klinik çalışma alanı</span>
          </span>
        </Link>
        <button
          aria-label="Menüyü kapat"
          className="flex size-9 items-center justify-center rounded-md text-white/75 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-200 lg:hidden"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <nav
        aria-label="Ana gezinme"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
        id="primary-navigation"
      >
        {groups.map((group) => (
          <div className="mb-6 last:mb-0" key={group}>
            <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {group}
            </h2>
            <ul className="flex flex-col gap-1">
              {visibleItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={`group flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-200 ${active ? "bg-[#d9eee7] text-[#173d37]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
                        href={item.href}
                        onClick={onClose}
                      >
                        <Icon aria-hidden="true" className="shrink-0" size={18} strokeWidth={1.8} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/55">
        Klinik içi sistem
      </div>
    </aside>
  );
}