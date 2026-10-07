import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { TreatmentForm } from "@/components/treatments/treatment-form";
import { requireRoles } from "@/lib/auth/authorization";

export default async function NewTreatmentPage() {
  await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/treatments">
          <ArrowLeft aria-hidden="true" size={16} />
          Tedavilere dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Tedavi Yönetimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Yeni Tedavi</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Tedavi adı, açıklaması ve ücret bilgilerini girin.</p>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <TreatmentForm mode="create" />
      </section>
    </div>
  );
}
