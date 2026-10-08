import Link from "next/link";
import { Plus } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Yönetici",
  DOCTOR: "Doktor",
  STAFF: "Çalışan",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string | string[] }>;
}) {
  await requireRole(Role.ADMIN);
  const params = await searchParams;
  const created = Array.isArray(params.created)
    ? params.created[0] === "1"
    : params.created === "1";

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Yönetim
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Kullanıcılar</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Klinik kullanıcı hesaplarını ve rollerini görüntüleyin.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto"
          href="/users/new"
        >
          <Plus aria-hidden="true" size={17} />
          Yeni Kullanıcı
        </Link>
      </header>

      {created ? (
        <p className="rounded-md border border-[#c7ded6] bg-[#e9f4ef] px-4 py-3 text-sm text-[#245b50]" role="status">
          Kullanıcı hesabı oluşturuldu.
        </p>
      ) : null}

      {users.length === 0 ? (
        <section className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-[var(--ink)]">Henüz kullanıcı bulunmuyor.</h2>
        </section>
      ) : (
        <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">Kayıtlı kullanıcılar</caption>
              <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3.5" scope="col">Ad Soyad</th>
                  <th className="px-4 py-3.5" scope="col">E-posta</th>
                  <th className="px-4 py-3.5" scope="col">Rol</th>
                  <th className="px-4 py-3.5" scope="col">Durum</th>
                  <th className="px-4 py-3.5" scope="col">Oluşturulma Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {users.map((user) => (
                  <tr className="hover:bg-[#fbfcfb]" key={user.id}>
                    <th className="px-4 py-4 font-medium text-[var(--ink)]" scope="row">{user.name}</th>
                    <td className="px-4 py-4 text-[var(--muted)]">{user.email}</td>
                    <td className="px-4 py-4 text-[var(--ink)]">{ROLE_LABELS[user.role]}</td>
                    <td className="px-4 py-4">
                      <span className={user.isActive ? "rounded-full bg-[#e9f4ef] px-2.5 py-1 text-xs font-medium text-[#285d50]" : "rounded-full bg-[#f2efec] px-2.5 py-1 text-xs font-medium text-[#756c63]"}>
                        {user.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[var(--muted)]">
                      {new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                        timeZone: "Europe/Istanbul",
                      }).format(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
