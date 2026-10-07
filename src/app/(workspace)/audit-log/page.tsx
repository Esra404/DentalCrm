import Link from "next/link";
import { Prisma, Role } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { PATIENT_DOCUMENT_ID_PATTERN } from "@/lib/validations/patient-document";

const PAGE_SIZE = 50;
const ACTION_LABELS: Record<string, string> = {
  PATIENT_CREATED: "Hasta oluşturuldu",
  PATIENT_UPDATED: "Hasta güncellendi",
  PATIENT_STATUS_CHANGED: "Hasta durumu değiştirildi",
  DOCTOR_CREATED: "Doktor oluşturuldu",
  DOCTOR_UPDATED: "Doktor güncellendi",
  DOCTOR_STATUS_CHANGED: "Doktor durumu değiştirildi",
  TREATMENT_CREATED: "Tedavi oluşturuldu",
  TREATMENT_UPDATED: "Tedavi güncellendi",
  TREATMENT_STATUS_CHANGED: "Tedavi durumu değiştirildi",
  APPOINTMENT_CREATED: "Randevu oluşturuldu",
  APPOINTMENT_UPDATED: "Randevu güncellendi",
  APPOINTMENT_STATUS_CHANGED: "Randevu durumu değiştirildi",
  TREATMENT_PLAN_CREATED: "Tedavi planı oluşturuldu",
  TREATMENT_PLAN_UPDATED: "Tedavi planı güncellendi",
  PAYMENT_CREATED: "Ödeme oluşturuldu",
  PAYMENT_UPDATED: "Ödeme güncellendi",
  PATIENT_DOCUMENT_UPLOADED: "Hasta belgesi yüklendi",
  PATIENT_DOCUMENT_DELETED: "Hasta belgesi silindi",
};
const ENTITY_LABELS: Record<string, string> = {
  Patient: "Hasta",
  Doctor: "Doktor",
  Treatment: "Tedavi",
  Appointment: "Randevu",
  TreatmentPlan: "Tedavi Planı",
  Payment: "Ödeme",
  PatientDocument: "Hasta Belgesi",
  User: "Kullanıcı",
};
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type SearchValue = string | string[] | undefined;

function getValue(value: SearchValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readDate(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return null;
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value]);
  const parts = Object.fromEntries(dateParts);
  return `${parts.year}-${parts.month}-${parts.day}` === value ? date : null;
}

function paginationUrl(
  values: { action: string; entity: string; userId: string; from: string; to: string },
  cursor: string,
): string {
  const search = new URLSearchParams();
  if (values.action) search.set("action", values.action);
  if (values.entity) search.set("entity", values.entity);
  if (values.userId) search.set("userId", values.userId);
  if (values.from) search.set("from", values.from);
  if (values.to) search.set("to", values.to);
  search.set("cursor", cursor);
  return `/audit-log?${search.toString()}`;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: SearchValue;
    entity?: SearchValue;
    userId?: SearchValue;
    from?: SearchValue;
    to?: SearchValue;
    cursor?: SearchValue;
  }>;
}) {
  await requireRole(Role.ADMIN);
  const params = await searchParams;
  const action = getValue(params.action).trim().slice(0, 120);
  const entity = getValue(params.entity).trim().slice(0, 120);
  const userValue = getValue(params.userId);
  const userId =
    PATIENT_DOCUMENT_ID_PATTERN.test(userValue) ? userValue : "";
  const from = getValue(params.from);
  const to = getValue(params.to);
  const fromDate = readDate(from);
  const toDate = readDate(to);
  const cursorValue = getValue(params.cursor);
  const cursor = PATIENT_DOCUMENT_ID_PATTERN.test(cursorValue)
    ? cursorValue
    : "";

  const createdAt =
    fromDate || toDate
      ? {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lt: new Date(toDate.getTime() + 24 * 60 * 60 * 1000) } : {}),
        }
      : undefined;
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(entity ? { entity } : {}),
    ...(userId ? { userId } : {}),
    ...(createdAt ? { createdAt } : {}),
  };

  const [rows, users, actions, entities] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        userId: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, email: true },
    }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      orderBy: { action: "asc" },
      take: 100,
      select: { action: true },
    }),
    prisma.auditLog.findMany({
      where: { entity: { not: null } },
      distinct: ["entity"],
      orderBy: { entity: "asc" },
      take: 50,
      select: { entity: true },
    }),
  ]);
  const hasMore = rows.length > PAGE_SIZE;
  const logs = rows.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? logs.at(-1)?.id : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Yönetim</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">İşlem Kayıtları</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Sistemde gerçekleşen önemli işlemlerin değiştirilemez kayıtları.</p>
      </header>
      <form action="/audit-log" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          İşlem
          <select className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={action} name="action">
            <option value="">Tüm işlemler</option>
            {actions.map(({ action: value }) => (
              <option key={value} value={value}>{ACTION_LABELS[value] ?? value}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Kayıt Türü
          <select className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={entity} name="entity">
            <option value="">Tüm kayıt türleri</option>
            {entities.flatMap(({ entity: value }) => value ? [
              <option key={value} value={value}>{ENTITY_LABELS[value] ?? value}</option>,
            ] : [])}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Kullanıcı
          <select className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={userId} name="userId">
            <option value="">Tüm kullanıcılar</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name} · {user.email}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Başlangıç
          <input className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={fromDate ? from : ""} name="from" type="date" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Bitiş
          <input className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={toDate ? to : ""} name="to" type="date" />
        </label>
        <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:col-span-2 lg:col-span-5 lg:justify-self-end" type="submit">
          Filtrele
        </button>
      </form>
      {logs.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-[var(--ink)]">Henüz işlem kaydı bulunmuyor.</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Filtreleri değiştirebilir veya daha sonra tekrar kontrol edebilirsiniz.</p>
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <caption className="sr-only">İşlem kayıtları</caption>
                <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3.5" scope="col">Tarih</th>
                    <th className="px-4 py-3.5" scope="col">Kullanıcı</th>
                    <th className="px-4 py-3.5" scope="col">İşlem</th>
                    <th className="px-4 py-3.5" scope="col">Kayıt Türü</th>
                    <th className="px-4 py-3.5" scope="col">Kayıt Kimliği</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {logs.map((log) => (
                    <tr className="hover:bg-[#fbfcfb]" key={log.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-[var(--muted)]">
                        {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">
                        {log.user ? <><span className="block font-medium text-[var(--ink)]">{log.user.name}</span><span className="text-xs">{log.user.email}</span></> : "Kullanıcı kaydı yok"}
                      </td>
                      <td className="px-4 py-4 font-medium text-[var(--ink)]">{ACTION_LABELS[log.action] ?? log.action}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{ENTITY_LABELS[log.entity ?? ""] ?? log.entity ?? "—"}</td>
                      <td className="max-w-56 break-all px-4 py-4 font-mono text-xs text-[var(--muted)]">{log.entityId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {nextCursor ? (
            <div className="flex justify-center">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                href={paginationUrl({ action, entity, userId, from, to }, nextCursor)}
              >
                Daha fazla yükle
              </Link>
            </div>
          ) : null}
        </>
      )}
      {users.length === 500 ? <p className="text-center text-xs text-[var(--muted)]">Kullanıcı filtresinde ilk 500 kayıt gösteriliyor.</p> : null}
    </div>
  );
}
