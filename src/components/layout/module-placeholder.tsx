import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

type ModulePlaceholderProps = {
  label: string;
  description: string;
  emptyState: string;
  icon: LucideIcon;
};

export function ModulePlaceholder({
  label,
  description,
  emptyState,
  icon: Icon,
}: ModulePlaceholderProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7">
      <header className="border-b border-[var(--line)] pb-6">
        <div className="mb-3 flex size-11 items-center justify-center rounded-md bg-white text-[var(--accent)] ring-1 ring-[var(--line)]">
          <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          CRM modülü
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">{label}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
      </header>

      <section
        aria-label={`${label} empty state`}
        className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <Icon aria-hidden="true" size={22} strokeWidth={1.7} />
        </span>
        <h2 className="mt-4 text-base font-semibold text-[var(--ink)]">Henüz kayıt yok</h2>
        <p className="mt-1 max-w-md text-sm leading-6 text-[var(--muted)]">{emptyState}</p>
        <Link
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-[var(--accent-strong)] outline-none hover:bg-[var(--accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href="/dashboard"
        >
          Ana sayfaya dön
          <ArrowUpRight aria-hidden="true" size={15} />
        </Link>
      </section>
    </div>
  );
}