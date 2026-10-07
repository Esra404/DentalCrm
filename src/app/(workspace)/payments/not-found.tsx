import Link from "next/link";

export default function PaymentNotFound() {
  return (
    <section className="mx-auto flex min-h-64 w-full max-w-3xl flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
      <h1 className="text-lg font-semibold text-[var(--ink)]">Ödeme bulunamadı</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Bu ödeme kaydı mevcut değil veya artık erişilemiyor.</p>
      <Link className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2" href="/payments">Ödemelere dön</Link>
    </section>
  );
}
