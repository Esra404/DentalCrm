import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { UserForm } from "@/components/users/user-form";

export default async function NewUserPage() {
  await requireRole(Role.ADMIN);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link
          className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href="/users"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Kullanıcılara dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Yönetim</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Yeni Kullanıcı</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Yalnızca doktor ve çalışan hesapları oluşturabilirsiniz.
        </p>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <UserForm />
      </section>
    </div>
  );
}
