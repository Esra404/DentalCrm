import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { PaymentForm } from "@/components/payments/payment-form";
import { formatMoney, sumPlanItems } from "@/lib/finance/decimal";
import { prisma } from "@/lib/prisma";
import {
  PAYMENT_ID_PATTERN,
  paymentDateInputValue,
} from "@/lib/validations/payment";
import { requireRoles } from "@/lib/auth/authorization";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string; q?: string }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF);
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 120);
  const requestedPlanId =
    params.planId && PAYMENT_ID_PATTERN.test(params.planId)
      ? params.planId
      : "";
  const plans = await prisma.treatmentPlan.findMany({
    where: query
      ? {
          patient: {
            is: {
              OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { phone: { contains: query } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            },
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
  if (
    requestedPlanId &&
    !options.some((option) => option.id === requestedPlanId)
  ) {
    const selectedPlan = await prisma.treatmentPlan.findUnique({
      where: { id: requestedPlanId },
      select: {
        id: true,
        currency: true,
        patient: { select: { firstName: true, lastName: true } },
        items: { select: { quantity: true, unitPrice: true } },
      },
    });
    if (selectedPlan) {
      options.unshift({
        id: selectedPlan.id,
        label: `${selectedPlan.patient.firstName} ${selectedPlan.patient.lastName}`,
        total: formatMoney(sumPlanItems(selectedPlan.items), selectedPlan.currency),
        currency: selectedPlan.currency,
      });
    }
  }
  const selectedPlanId = options.some((option) => option.id === requestedPlanId)
    ? requestedPlanId
    : "";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/payments">
          <ArrowLeft aria-hidden="true" size={16} />
          Ödemelere dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Ödeme Yönetimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Yeni Ödeme</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Tedavi planı için tahsilat bilgilerini girin.</p>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <form action="/payments/new" className="mb-6 flex flex-col gap-3 sm:flex-row" method="get" role="search">
          {requestedPlanId ? <input name="planId" type="hidden" value={requestedPlanId} /> : null}
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Hasta ara</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
            <input className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15" defaultValue={query} maxLength={120} name="q" placeholder="Planları hasta adına, telefonuna veya e-postasına göre ara..." type="search" />
          </label>
          <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" type="submit">Plan ara</button>
        </form>
        {options.length === 0 ? <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">{query ? "Aramanızla eşleşen tedavi planı bulunamadı." : "Ödeme eklemek için önce tedavi planı oluşturun."}</p> : null}
        <PaymentForm
          initialValues={{
            treatmentPlanId: selectedPlanId,
            amount: "",
            method: "CASH",
            paidAt: paymentDateInputValue(new Date()),
          }}
          mode="create"
          plans={options}
        />
      </section>
    </div>
  );
}
