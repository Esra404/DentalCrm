import Link from "next/link";
import { Eye, Plus, Search } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { PaymentMethod, Role } from "@/generated/prisma/enums";
import { PAYMENT_ID_PATTERN, PAYMENT_METHOD_LABELS } from "@/lib/validations/payment";
import { APPOINTMENT_TIME_ZONE, parseAppointmentLocalDateTime } from "@/lib/validations/appointment";
import { formatMoney } from "@/lib/finance/decimal";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";

const PAGE_SIZE = 25;

function getValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function nextDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: APPOINTMENT_TIME_ZONE,
  }).format(value);
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    date?: string | string[];
    method?: string | string[];
    planId?: string | string[];
    cursor?: string | string[];
    created?: string | string[];
  }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF);
  const params = await searchParams;
  const query = getValue(params.q).trim().slice(0, 120);
  const date = getValue(params.date);
  const methodValue = getValue(params.method);
  const planId = getValue(params.planId);
  const rawCursor = getValue(params.cursor);
  const cursor = PAYMENT_ID_PATTERN.test(rawCursor) ? rawCursor : "";
  const method = Object.values(PaymentMethod).find((item) => item === methodValue);
  const paidAtStart =
    /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? parseAppointmentLocalDateTime(date, "00:00")
      : null;
  const paidAtEnd = paidAtStart
    ? parseAppointmentLocalDateTime(nextDate(date), "00:00")
    : null;
  const validPlanId = PAYMENT_ID_PATTERN.test(planId) ? planId : undefined;
  const where: Prisma.PaymentWhereInput = {
    ...(method ? { method } : {}),
    ...(validPlanId ? { treatmentPlanId: validPlanId } : {}),
    ...(paidAtStart && paidAtEnd
      ? { paidAt: { gte: paidAtStart, lt: paidAtEnd } }
      : {}),
    ...(query
      ? {
          treatmentPlan: {
            is: {
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
            },
          },
        }
      : {}),
  };

  let payments: {
    id: string;
    amount: Prisma.Decimal;
    method: PaymentMethod;
    paidAt: Date;
    treatmentPlan: {
      id: string;
      currency: string;
      patient: { firstName: string; lastName: string };
    };
  }[] = [];
  let hasMore = false;
  let loadError = false;
  try {
    const validCursor = cursor
      ? await prisma.payment.findUnique({ where: { id: cursor }, select: { id: true } })
      : null;
    const results = await prisma.payment.findMany({
      where,
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(validCursor ? { cursor: { id: validCursor.id }, skip: 1 } : {}),
      select: {
        id: true,
        amount: true,
        method: true,
        paidAt: true,
        treatmentPlan: {
          select: {
            id: true,
            currency: true,
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    hasMore = results.length > PAGE_SIZE;
    payments = results.slice(0, PAGE_SIZE);
  } catch (error) {
    console.error("Ödemeler yüklenemedi.", error);
    loadError = true;
  }

  const nextCursor = hasMore ? payments.at(-1)?.id : undefined;
  const nextParams = new URLSearchParams();
  if (query) nextParams.set("q", query);
  if (date) nextParams.set("date", date);
  if (method) nextParams.set("method", method);
  if (validPlanId) nextParams.set("planId", validPlanId);
  if (nextCursor) nextParams.set("cursor", nextCursor);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">İşlemler</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Ödemeler</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Tedavi planlarına ait tahsilatları görüntüleyin ve yönetin.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto" href="/payments/new"><Plus aria-hidden="true" size={17} />Yeni Ödeme</Link>
      </header>
      {getValue(params.created) === "1" ? <p className="rounded-md border border-[#c7ded6] bg-[#e9f4ef] px-4 py-3 text-sm text-[#245b50]">Ödeme kaydı oluşturuldu.</p> : null}
      <form action="/payments" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]" method="get" role="search">
        <label className="relative block min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Hasta ara</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
          <input className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15" defaultValue={query} maxLength={120} name="q" placeholder="Hasta adı, telefon veya e-posta ara..." type="search" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">Ödeme Tarihi<input className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={date} name="date" type="date" /></label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">Yöntem<select className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={method ?? ""} name="method"><option value="">Tüm yöntemler</option>{Object.values(PaymentMethod).map((item) => <option key={item} value={item}>{PAYMENT_METHOD_LABELS[item]}</option>)}</select></label>
        {validPlanId ? <input name="planId" type="hidden" value={validPlanId} /> : null}
        <button className="inline-flex min-h-11 items-center justify-center self-end rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" type="submit">Filtrele</button>
      </form>
      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800" role="alert">Ödemeler yüklenirken bir hata oluştu.</p>
      ) : payments.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-[var(--ink)]">{query || date || method || validPlanId ? "Filtrelerle eşleşen ödeme bulunamadı." : "Henüz kayıtlı ödeme bulunmuyor."}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Ödeme kaydı oluşturarak başlayabilirsiniz.</p>
          <Link className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/payments/new"><Plus aria-hidden="true" size={16} />Yeni Ödeme</Link>
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <caption className="sr-only">Ödeme kayıtları</caption>
                <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]"><tr><th className="px-4 py-3.5" scope="col">Hasta</th><th className="px-4 py-3.5" scope="col">Tedavi Planı</th><th className="px-4 py-3.5" scope="col">Tutar</th><th className="px-4 py-3.5" scope="col">Yöntem</th><th className="px-4 py-3.5" scope="col">Ödeme Tarihi</th><th className="px-4 py-3.5 text-right" scope="col">Detay</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">{payments.map((payment) => <tr className="hover:bg-[#fbfcfb]" key={payment.id}>
                  <th className="px-4 py-4 font-medium text-[var(--ink)]" scope="row">{payment.treatmentPlan.patient.firstName} {payment.treatmentPlan.patient.lastName}</th>
                  <td className="px-4 py-4 text-[var(--muted)]"><Link className="hover:text-[var(--accent-strong)]" href={`/treatment-plans/${payment.treatmentPlan.id}`}>Planı görüntüle</Link></td>
                  <td className="px-4 py-4 text-[var(--muted)]">{formatMoney(payment.amount, payment.treatmentPlan.currency)}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{PAYMENT_METHOD_LABELS[payment.method]}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{formatDate(payment.paidAt)}</td>
                  <td className="px-4 py-4 text-right"><Link aria-label="Ödeme detayını görüntüle" className="inline-flex size-9 items-center justify-center rounded-md text-[var(--muted)] outline-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/payments/${payment.id}`}><Eye aria-hidden="true" size={17} /></Link></td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>
          {hasMore && nextCursor ? <div className="flex justify-center"><Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/payments?${nextParams.toString()}`}>Daha fazla yükle</Link></div> : null}
        </>
      )}
    </div>
  );
}
