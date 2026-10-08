import { redirect } from "next/navigation";
import { Activity, CalendarDays, ShieldCheck, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="grid min-h-screen bg-white text-[var(--ink)] lg:grid-cols-2">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,#123f39_0%,#1d6255_52%,#b7d8c8_140%)] p-10 text-white lg:flex xl:p-16">
        <div aria-hidden="true" className="absolute -right-28 -top-24 size-[28rem] rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-48 -left-32 size-[34rem] rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10">
            <Activity aria-hidden="true" size={22} />
          </span>
          <span className="text-sm font-semibold tracking-[0.18em]">DENTAL CRM</span>
        </div>

        <div className="relative max-w-xl py-16">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
            <Sparkles aria-hidden="true" size={14} />
            Kliniğiniz için tek çalışma alanı
          </p>
          <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
            Kliniğinizin tüm süreçlerini tek yerden yönetin.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/75">
            Hasta kayıtlarından randevu ve tedavi planlarına kadar günlük iş akışınızı sade ve düzenli tutun.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <CalendarDays aria-hidden="true" className="mb-6 text-white/80" size={20} />
              <p className="text-sm font-semibold">Günlük planlama</p>
              <p className="mt-1 text-xs leading-5 text-white/70">Randevular ve klinik akışı bir arada.</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <ShieldCheck aria-hidden="true" className="mb-6 text-white/80" size={20} />
              <p className="text-sm font-semibold">Yetkili çalışma alanı</p>
              <p className="mt-1 text-xs leading-5 text-white/70">Rolünüze göre düzenlenmiş erişim.</p>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-white/60">Dental CRM · Klinik çalışma alanı</p>
      </aside>

      <section className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-5 py-10 sm:px-8 lg:bg-white">
        <div className="w-full max-w-md rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-9 lg:border-0 lg:p-4 lg:shadow-none">
          <header className="mb-8 flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)] lg:hidden">
              DENTAL CRM
            </p>
            <p className="text-sm font-medium text-[var(--accent-strong)]">Hoş geldiniz</p>
            <h2 className="text-2xl font-semibold">Hesabınıza giriş yapın</h2>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Klinik çalışma alanınıza devam etmek için bilgilerinizi girin.
            </p>
          </header>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}