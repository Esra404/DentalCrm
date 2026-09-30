import Link from "next/link";
import { logoutAction } from "@/server/actions/auth";
import { requireAuth } from "@/lib/auth/authorization";

export default async function AuthCheckPage() {
  const user = await requireAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-950">
      <section className="flex w-full max-w-lg flex-col gap-6 rounded border border-zinc-200 bg-white p-8">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">
            Kimlik doğrulama kontrolü
          </p>
          <h1 className="text-2xl font-semibold">Oturum açıldı</h1>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-zinc-500">Ad Soyad</dt>
          <dd>{user.name}</dd>
          <dt className="text-zinc-500">E-posta</dt>
          <dd>{user.email}</dd>
          <dt className="text-zinc-500">Rol</dt>
          <dd>{user.role}</dd>
        </dl>
        <Link className="w-fit text-sm font-medium text-teal-800 underline" href="/auth-check/admin">
          Yönetici yetkisini kontrol et
        </Link>
        <form action={logoutAction}>
          <button
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            type="submit"
          >
            Çıkış Yap
          </button>
        </form>
      </section>
    </main>
  );
}