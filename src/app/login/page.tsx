import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/auth-check");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-950">
      <section className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">
            Dental CRM
          </p>
          <h1 className="text-2xl font-semibold">Giriş Yap</h1>
        </header>
        <LoginForm />
      </section>
    </main>
  );
}