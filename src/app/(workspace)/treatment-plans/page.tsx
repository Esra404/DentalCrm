import Link from "next/link";
import { Eye, Plus, Search } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { Role, TreatmentPlanStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { TREATMENT_PLAN_ID_PATTERN } from "@/lib/validations/treatment-plan";
import { formatMoney, sumPlanItems } from "@/lib/finance/decimal";
import { requireRoles } from "@/lib/auth/authorization";
import { getActiveDoctorId } from "@/lib/auth/doctor-access";

const PAGE_SIZE = 25;
const STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  DRAFT: "Taslak",
  APPROVED: "Onaylandı",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

function getValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: Date | null): string {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(value);
}

export default async function TreatmentPlansPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    cursor?: string | string[];
    created?: string | string[];
  }>;
}) {
  const user = await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const params = await searchParams;
  const query = getValue(params.q).trim().slice(0, 120);
  const statusValue = getValue(params.status);
  const rawCursor = getValue(params.cursor);
  const cursor = TREATMENT_PLAN_ID_PATTERN.test(rawCursor) ? rawCursor : "";
  const status = Object.values(TreatmentPlanStatus).find(
    (item) => item === statusValue,
  );
  const doctorId =
    user.role === Role.DOCTOR ? await getActiveDoctorId(user.id) : null;
  const where: Prisma.TreatmentPlanWhereInput = {
    AND: [
      ...(user.role === Role.DOCTOR
        ? [{
            patient: {
              doctorId: doctorId ?? "00000000-0000-0000-0000-000000000000",
            },
          }]
        : []),
      ...(query
        ? [{
            patient: {
              is: {
                OR: [
                  { firstName: { contains: query, mode: "insensitive" as const } },
                  { lastName: { contains: query, mode: "insensitive" as const } },
                  { phone: { contains: query } },
                  { email: { contains: query, mode: "insensitive" as const } },
                ],
              },
            },
          }]
        : []),
    ],
    ...(status ? { status } : {}),
  };

  let plans: {
    id: string;
    status: TreatmentPlanStatus;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    currency: string;
    patient: { firstName: string; lastName: string };
    items: { quantity: number; unitPrice: Prisma.Decimal }[];
  }[] = [];
  let hasMore = false;
  let loadError = false;
  try {
    const validCursor = cursor
      ? await prisma.treatmentPlan.findUnique({
          where: { id: cursor },
          select: { id: true },
        })
      : null;
    const results = await prisma.treatmentPlan.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(validCursor ? { cursor: { id: validCursor.id }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        currency: true,
        patient: { select: { firstName: true, lastName: true } },
        items: { select: { quantity: true, unitPrice: true } },
      },
    });
    hasMore = results.length > PAGE_SIZE;
    plans = results.slice(0, PAGE_SIZE);
  } catch (error) {
    console.error("Tedavi planları yüklenemedi.", error);
    loadError = true;
  }

  const nextCursor = hasMore ? plans.at(-1)?.id : undefined;
  const nextParams = new URLSearchParams();
  if (query) nextParams.set("q", query);
  if (status) nextParams.set("status", status);
  if (nextCursor) nextParams.set("cursor", nextCursor);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">İşlemler</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Tedavi Planları</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Hastalara ait planları ve tedavi kalemlerini yönetin.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto" href="/treatment-plans/new"><Plus aria-hidden="true" size={17} />Yeni Tedavi Planı</Link>
      </header>
      {getValue(params.created) === "1" ? <p className="rounded-md border border-[#c7ded6] bg-[#e9f4ef] px-4 py-3 text-sm text-[#245b50]">Tedavi planı oluşturuldu.</p> : null}
      <form action="/treatment-plans" className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_16rem_auto]" method="get" role="search">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Hasta Ara
          <span className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
            <input className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15" defaultValue={query} maxLength={120} name="q" placeholder="Ad, telefon veya e-posta..." type="search" />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]" htmlFor="plan-status">
          Plan Durumu
          <select className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15" defaultValue={status ?? ""} id="plan-status" name="status">
            <option value="">Tüm durumlar</option>
            {Object.values(TreatmentPlanStatus).map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}
          </select>
        </label>
        <button className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:w-auto" type="submit">Filtrele</button>
      </form>
      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800" role="alert">Tedavi planları yüklenirken bir hata oluştu.</p>
      ) : plans.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-[var(--ink)]">{query || status ? "Filtrelerle eşleşen tedavi planı bulunamadı." : "Henüz kayıtlı tedavi planı bulunmuyor."}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Tedavi planı oluşturarak başlayabilirsiniz.</p>
          <Link className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/treatment-plans/new"><Plus aria-hidden="true" size={16} />Yeni Tedavi Planı</Link>
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <caption className="sr-only">Tedavi planları</caption>
                <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]"><tr><th className="px-4 py-3.5" scope="col">Hasta</th><th className="px-4 py-3.5" scope="col">Durum</th><th className="px-4 py-3.5" scope="col">Başlangıç</th><th className="px-4 py-3.5" scope="col">Bitiş</th><th className="px-4 py-3.5" scope="col">Oluşturulma</th><th className="px-4 py-3.5" scope="col">Toplam</th><th className="px-4 py-3.5 text-right" scope="col">Detay</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">{plans.map((plan) => (
                  <tr className="hover:bg-[#fbfcfb]" key={plan.id}>
                    <th className="px-4 py-4 font-medium text-[var(--ink)]" scope="row"><Link className="rounded-sm outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatment-plans/${plan.id}`}>{plan.patient.firstName} {plan.patient.lastName}</Link></th>
                    <td className="px-4 py-4 text-[var(--muted)]">{STATUS_LABELS[plan.status]}</td>
                    <td className="px-4 py-4 text-[var(--muted)]">{formatDate(plan.startsAt)}</td>
                    <td className="px-4 py-4 text-[var(--muted)]">{formatDate(plan.endsAt)}</td>
                    <td className="px-4 py-4 text-[var(--muted)]">{formatDate(plan.createdAt)}</td>
                    <td className="px-4 py-4 text-[var(--muted)]">{formatMoney(sumPlanItems(plan.items), plan.currency)}</td>
                    <td className="px-4 py-4 text-right"><Link aria-label="Tedavi planı detayını görüntüle" className="inline-flex size-9 items-center justify-center rounded-md text-[var(--muted)] outline-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatment-plans/${plan.id}`}><Eye aria-hidden="true" size={17} /></Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          {hasMore && nextCursor ? <div className="flex justify-center"><Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatment-plans?${nextParams.toString()}`}>Daha fazla yükle</Link></div> : null}
        </>
      )}
    </div>
  );
}
