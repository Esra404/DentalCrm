import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8">
      <section className="w-full max-w-md rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm sm:p-9">
        <header className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            DENTAL CRM
          </p>
          <h1 className="text-2xl font-semibold">Hesabınıza giriş yapın</h1>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Klinik çalışma alanınıza devam etmek için bilgilerinizi girin.
          </p>
        </header>
        <LoginForm />
      </section>
    </main>
  );
}