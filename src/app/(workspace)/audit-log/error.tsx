"use client";

export default function AuditLogError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-64 w-full max-w-3xl flex-col items-center justify-center rounded-md border border-red-200 bg-white px-6 py-10 text-center" role="alert">
      <h1 className="text-lg font-semibold text-[var(--ink)]">İşlem kayıtları yüklenemedi</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Bir hata oluştu. Lütfen tekrar deneyin.</p>
      <button className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2" onClick={retry} type="button">
        Tekrar dene
      </button>
    </section>
  );
}
