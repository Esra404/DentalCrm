import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { PaymentForm } from "@/components/payments/payment-form";
import { formatMoney, sumPlanItems } from "@/lib/finance/decimal";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { patientSearchWhere } from "@/lib/search/patient-search";
import { PAYMENT_ID_PATTERN } from "@/lib/validations/payment";

export default async function EditPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF);
  const { id } = await params;
  const query = ((await searchParams).q ?? "").trim().slice(0, 120);
  if (!PAYMENT_ID_PATTERN.test(id)) notFound();

  const payment = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      treatmentPlanId: true,
      amount: true,
      method: true,
      paidAt: true,
      treatmentPlan: { select: { currency: true } },
    },
  });
  if (!payment) notFound();

  const plans = await prisma.treatmentPlan.findMany({
    where: query
      ? {
          patient: {
            is: patientSearchWhere(query),
          },
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      currency: true,
      patient: { select: { firstName: true, lastName: true } },
      items: { select: { quantity: true, unitPrice: true } },
    },
  });
  const options = plans.map((plan) => ({
    id: plan.id,
    label: `${plan.patient.firstName} ${plan.patient.lastName}`,
    total: formatMoney(sumPlanItems(plan.items), plan.currency),
    currency: plan.currency,
  }));
  if (!options.some((option) => option.id === payment.treatmentPlanId)) {
    const currentPlan = await prisma.treatmentPlan.findUnique({
      where: { id: payment.treatmentPlanId },
      select: {
        id: true,
        currency: true,
        patient: { select: { firstName: true, lastName: true } },
        items: { select: { quantity: true, unitPrice: true } },
      },
    });
    if (currentPlan) {
      options.push({
        id: currentPlan.id,
        label: `${currentPlan.patient.firstName} ${currentPlan.patient.lastName}`,
        total: formatMoney(sumPlanItems(currentPlan.items), currentPlan.currency),
        currency: currentPlan.currency,
      });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/payments/${payment.id}`}>
          <ArrowLeft aria-hidden="true" size={16} />
          Ödeme detayına dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Ödeme Yönetimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Ödemeyi Düzenle</h1>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <form className="mb-6 flex flex-col gap-3 sm:flex-row" method="get" role="search">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Hasta ara</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
            <input className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15" defaultValue={query} maxLength={120} name="q" placeholder="Planları hasta adına, telefonuna veya e-postasına göre ara..." type="search" />
          </label>
          <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" type="submit">Plan ara</button>
        </form>
        {options.length === 0 ? <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">{query ? "Aramanızla eşleşen tedavi planı bulunamadı." : "Ödeme için kullanılabilir tedavi planı bulunamadı."}</p> : null}
        <PaymentForm
          initialValues={{
            treatmentPlanId: payment.treatmentPlanId,
            amount: payment.amount.toString(),
            method: payment.method,
            paidAt: payment.paidAt.toISOString().slice(0, 10),
          }}
          mode="edit"
          paymentId={payment.id}
          plans={options}
        />
      </section>
    </div>
  );
}
