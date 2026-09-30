import Link from "next/link";
import { ArrowRight, CircleCheck, type LucideIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { CRM_NAVIGATION } from "@/lib/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const modules = user
    ? CRM_NAVIGATION.filter(
        (item) => item.href !== "/dashboard" && item.roles.includes(user.role),
      ).slice(0, 4)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8">
      <header className="flex flex-col gap-2 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Genel Bakış
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Klinik çalışma alanınız</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Tekrar hoş geldiniz{user?.name ? `, ${user.name.split(/\s+/)[0]}` : ""}. Çalışma alanınız hazır.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#c7ded6] bg-[#e9f4ef] px-3 py-1.5 text-xs font-medium text-[#285d50]">
          <CircleCheck aria-hidden="true" size={14} />
          Güvenli çalışma alanı
        </span>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
        <div className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Başlangıç
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
                Klinik verileriniz burada görüntülenecek
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
                Hasta, randevu ve tedavi bilgileri ilgili CRM modülleri kullanıldıkça burada
                görüntülenecek. Gerçek kayıtlar oluşana kadar işletme verisi gösterilmez.
              </p>
            </div>
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-md bg-[#f0f5f3] text-[var(--accent)] sm:flex">
              <CircleCheck aria-hidden="true" size={20} strokeWidth={1.8} />
            </span>
          </div>
          <div className="mt-6 border-t border-[var(--line)] pt-4">
            <p className="text-sm font-medium text-[var(--ink)]">Henüz CRM kaydı bulunmuyor.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Bu sayfada örnek hasta, randevu veya finansal veri gösterilmez.
            </p>
          </div>
        </div>

        <section aria-labelledby="module-links-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Gezinme
              </p>
              <h2 className="mt-1 text-base font-semibold text-[var(--ink)]" id="module-links-title">
                Modülleriniz
              </h2>
            </div>
            <span className="text-xs text-[var(--muted)]">Rolünüze göre</span>
          </div>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {modules.map((item) => {
              const Icon: LucideIcon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    className="group flex min-h-12 items-center justify-between gap-3 rounded-sm py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    href={item.href}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon aria-hidden="true" className="shrink-0 text-[var(--accent)]" size={17} />
                      <span className="truncate text-sm font-medium text-[var(--ink)]">{item.label}</span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5"
                      size={15}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </section>

      <footer className="flex flex-col gap-1 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>Dental CRM</span>
        <span>Klinik içi çalışma alanı</span>
      </footer>
    </div>
  );
}