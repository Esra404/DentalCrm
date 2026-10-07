import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, WalletCards } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { formatMoney } from "@/lib/finance/decimal";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import {
  PAYMENT_ID_PATTERN,
  PAYMENT_METHOD_LABELS,
} from "@/lib/validations/payment";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(value);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF);
  const { id } = await params;
  if (!PAYMENT_ID_PATTERN.test(id)) notFound();

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      treatmentPlan: {
        select: {
          id: true,
          currency: true,
          patient: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!payment) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/payments">
            <ArrowLeft aria-hidden="true" size={16} />
            Ödemelere dön
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Ödeme Kaydı</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">{formatMoney(payment.amount, payment.treatmentPlan.currency)}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{payment.treatmentPlan.patient.firstName} {payment.treatmentPlan.patient.lastName}</p>
        </div>
        <Link className="inline-flex min-h-10 items-center gap-2 self-start rounded-md border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto" href={`/payments/${payment.id}/edit`}>
          <Pencil aria-hidden="true" size={16} />
          Düzenle
        </Link>
      </header>
      <section aria-labelledby="payment-details-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
          <span className="flex size-10 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]"><WalletCards aria-hidden="true" size={20} /></span>
          <h2 className="text-base font-semibold text-[var(--ink)]" id="payment-details-title">Ödeme Bilgileri</h2>
        </div>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <Detail label="Hasta" value={`${payment.treatmentPlan.patient.firstName} ${payment.treatmentPlan.patient.lastName}`} />
          <Detail label="Tedavi Planı" value={payment.treatmentPlan.id} href={`/treatment-plans/${payment.treatmentPlan.id}`} />
          <Detail label="Tutar" value={formatMoney(payment.amount, payment.treatmentPlan.currency)} />
          <Detail label="Ödeme Yöntemi" value={PAYMENT_METHOD_LABELS[payment.method]} />
          <Detail label="Ödeme Tarihi" value={formatDate(payment.paidAt)} />
          <Detail label="Kayıt Tarihi" value={formatDateTime(payment.createdAt)} />
        </dl>
      </section>
    </div>
  );
}

function Detail({
  href,
  label,
  value,
}: {
  href?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-[var(--ink)]">
        {href ? <Link className="text-[var(--accent-strong)] hover:underline" href={href}>{value}</Link> : value}
      </dd>
    </div>
  );
}
