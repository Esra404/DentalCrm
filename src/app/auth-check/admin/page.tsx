import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";

export default async function AdminAuthCheckPage() {
  const user = await requireRole(Role.ADMIN);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 px-6 py-12 text-zinc-950">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">
        Yetki kontrolü
      </p>
      <h1 className="text-2xl font-semibold">Yönetici erişimi verildi</h1>
      <p className="text-sm text-zinc-600">Oturum açan: {user.email}.</p>
    </main>
  );
}