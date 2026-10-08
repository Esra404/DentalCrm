"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TreatmentSearchForm({ query }: { query: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(query);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const currentQuery = params.get("q") ?? "";
      const nextQuery = value.trim();
      if (currentQuery === nextQuery) return;

      if (nextQuery) params.set("q", nextQuery);
      else params.delete("q");
      params.delete("cursor");

      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [pathname, router, value]);

  return (
    <form
      action="/treatments"
      className="flex min-w-0 flex-col gap-3 sm:flex-row"
      method="get"
      role="search"
    >
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">Tedavi ara</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          size={17}
        />
        <input
          className="min-h-11 w-full min-w-0 rounded-md border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-[var(--ink)] outline-none placeholder:text-[#83928d] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
          maxLength={120}
          name="q"
          onChange={(event) => setValue(event.target.value)}
          placeholder="Tedavi adı veya açıklama ile ara..."
          type="search"
          value={value}
        />
      </label>
      <button
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        type="submit"
      >
        Ara
      </button>
      {query ? (
        <Link
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium text-[var(--muted)] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href="/treatments"
        >
          Temizle
        </Link>
      ) : null}
    </form>
  );
}
