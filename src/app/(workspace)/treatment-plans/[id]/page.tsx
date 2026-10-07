import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Role, TreatmentPlanStatus } from "@/generated/prisma/enums";
import { formatMoney, sumPlanItems } from "@/lib/finance/decimal";
import { prisma } from "@/lib/prisma";
import {
  TREATMENT_PLAN_ID_PATTERN,
} from "@/lib/validations/treatment-plan";
import { requireRoles } from "@/lib/auth/authorization";

const STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  DRAFT: "Taslak",
  APPROVED: "Onaylandı",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

function formatDate(value: Date | null): string {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(value);
}

export default async function TreatmentPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id } = await params;
  if (!TREATMENT_PLAN_ID_PATTERN.test(id)) notFound();

  const plan = await prisma.treatmentPlan.findUnique({
    where: { id },
    include: {
      patient: {
        select: { firstName: true, lastName: true, phone: true, email: true },
      },
      items: {
        select: {
          id: true,
          treatmentName: true,
          quantity: true,
          unitPrice: true,
        },
        orderBy: { createdAt: "asc" },
      },
      payments: { select: { amount: true } },
    },
  });
  if (!plan) notFound();

  const total = sumPlanItems(plan.items);
  const paid = plan.payments.reduce(
    (sum, payment) => sum.plus(payment.amount),
    total.minus(total),
  );
  const remaining = total.minus(paid);
  const createdAt = formatDate(plan.createdAt);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/treatment-plans">
            <ArrowLeft aria-hidden="true" size={16} />
            Tedavi planlarına dön
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Tedavi Planı</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">{plan.patient.firstName} {plan.patient.lastName}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{STATUS_LABELS[plan.status]}</p>
        </div>
        <Link className="inline-flex min-h-10 items-center gap-2 self-start rounded-md border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto" href={`/treatment-plans/${plan.id}/edit`}>
          <Pencil aria-hidden="true" size={16} />
          Düzenle
        </Link>
      </header>

      <section aria-labelledby="plan-patient-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <h2 className="border-b border-[var(--line)] pb-4 text-base font-semibold text-[var(--ink)]" id="plan-patient-title">Hasta Bilgileri</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <Detail label="Ad Soyad" value={`${plan.patient.firstName} ${plan.patient.lastName}`} />
          <Detail label="Telefon" value={plan.patient.phone || "Belirtilmedi"} />
          <Detail label="E-posta" value={plan.patient.email || "Belirtilmedi"} />
        </dl>
      </section>

      <section aria-labelledby="plan-summary-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <h2 className="border-b border-[var(--line)] pb-4 text-base font-semibold text-[var(--ink)]" id="plan-summary-title">Plan Bilgileri</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Durum" value={STATUS_LABELS[plan.status]} />
          <Detail label="Başlangıç" value={formatDate(plan.startsAt)} />
          <Detail label="Bitiş" value={formatDate(plan.endsAt)} />
          <Detail label="Oluşturulma Tarihi" value={createdAt} />
        </dl>
      </section>

      <section aria-labelledby="plan-items-title" className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
        <h2 className="px-5 pt-5 text-base font-semibold text-[var(--ink)]" id="plan-items-title">Tedavi Kalemleri</h2>
        {plan.items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--muted)]">Bu planda henüz tedavi kalemi bulunmuyor.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <caption className="sr-only">Tedavi planı kalemleri</caption>
              <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]"><tr><th className="px-5 py-3" scope="col">Tedavi</th><th className="px-5 py-3 text-right" scope="col">Adet</th><th className="px-5 py-3 text-right" scope="col">Birim Fiyat</th><th className="px-5 py-3 text-right" scope="col">Satır Toplamı</th></tr></thead>
              <tbody className="divide-y divide-[var(--line)]">{plan.items.map((item) => {
                const lineTotal = item.unitPrice.mul(item.quantity);
                return <tr key={item.id}><th className="px-5 py-4 font-medium text-[var(--ink)]" scope="row">{item.treatmentName}</th><td className="px-5 py-4 text-right text-[var(--muted)]">{item.quantity}</td><td className="px-5 py-4 text-right text-[var(--muted)]">{formatMoney(item.unitPrice, plan.currency)}</td><td className="px-5 py-4 text-right font-medium text-[var(--ink)]">{formatMoney(lineTotal, plan.currency)}</td></tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="plan-finance-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <h2 className="text-base font-semibold text-[var(--ink)]" id="plan-finance-title">Finans Özeti</h2>
          <Link className="inline-flex min-h-9 items-center justify-center rounded-md bg-[var(--accent-strong)] px-3 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/payments/new?planId=${plan.id}`}>Ödeme Ekle</Link>
        </div>
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <Detail label="Plan Toplamı" value={formatMoney(total, plan.currency)} />
          <Detail label="Ödenen" value={formatMoney(paid, plan.currency)} />
          <Detail label="Kalan" value={formatMoney(remaining, plan.currency)} />
        </dl>
        <Link className="mt-4 inline-flex min-h-9 items-center rounded-md px-2 text-sm font-medium text-[var(--accent-strong)] outline-none hover:bg-[var(--accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/payments?planId=${plan.id}`}>Bu plana ait ödemeleri görüntüle</Link>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-medium text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[var(--ink)]">{value}</dd></div>;
}
