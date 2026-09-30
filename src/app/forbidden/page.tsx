export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-zinc-950">
      <section className="flex max-w-md flex-col gap-3">
        <h1 className="text-2xl font-semibold">Erişim reddedildi</h1>
        <p className="text-sm text-zinc-600">
          Bu sayfaya erişim yetkiniz bulunmuyor.
        </p>
      </section>
    </main>
  );
}