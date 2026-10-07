import Link from "next/link";
import { Eye, Plus, Search } from "lucide-react";
import { AppointmentStatus, Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  APPOINTMENT_ID_PATTERN,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TIME_ZONE,
  parseAppointmentLocalDateTime,
} from "@/lib/validations/appointment";
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

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: APPOINTMENT_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    date?: string | string[];
    doctorId?: string | string[];
    status?: string | string[];
    cursor?: string | string[];
    created?: string | string[];
  }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const params = await searchParams;
  const query = getValue(params.q).trim().slice(0, 120);
  const date = getValue(params.date);
  const doctorId = getValue(params.doctorId);
  const statusValue = getValue(params.status);
  const rawCursor = getValue(params.cursor);
  const cursor = APPOINTMENT_ID_PATTERN.test(rawCursor) ? rawCursor : "";
  const startOfDay =
    /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? parseAppointmentLocalDateTime(date, "00:00")
      : null;
  const startOfNextDay = startOfDay
    ? parseAppointmentLocalDateTime(nextDate(date), "00:00")
    : null;
  const validStatus = Object.values(AppointmentStatus).includes(
    statusValue as AppointmentStatus,
  )
    ? (statusValue as AppointmentStatus)
    : undefined;
  const validDoctorId = APPOINTMENT_ID_PATTERN.test(doctorId) ? doctorId : undefined;
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 5);
  const where: Prisma.AppointmentWhereInput = {
    ...(startOfDay && startOfNextDay
      ? { startsAt: { gte: startOfDay, lt: startOfNextDay } }
      : {}),
    ...(validDoctorId ? { doctorId: validDoctorId } : {}),
    ...(validStatus ? { status: validStatus } : {}),
    ...(query
      ? {
          patient: {
            is: {
              OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { phone: { contains: query } },
                { email: { contains: query, mode: "insensitive" } },
                {
                  AND: terms.map((term) => ({
                    OR: [
                      { firstName: { contains: term, mode: "insensitive" as const } },
                      { lastName: { contains: term, mode: "insensitive" as const } },
                    ],
                  })),
                },
              ],
            },
          },
        }
      : {}),
  };

  const doctors = await prisma.doctor.findMany({
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  let appointments: Prisma.AppointmentGetPayload<{
    include: {
      patient: { select: { firstName: true; lastName: true } };
      doctor: { select: { firstName: true; lastName: true } };
      treatment: { select: { name: true } };
    };
  }>[] = [];
  let hasMore = false;
  let loadError = false;
  try {
    const validCursor = cursor
      ? await prisma.appointment.findUnique({
          where: { id: cursor },
          select: { id: true },
        })
      : null;
    const results = await prisma.appointment.findMany({
      where,
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: PAGE_SIZE + 1,
      ...(validCursor ? { cursor: { id: validCursor.id }, skip: 1 } : {}),
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true } },
        treatment: { select: { name: true } },
      },
    });
    hasMore = results.length > PAGE_SIZE;
    appointments = results.slice(0, PAGE_SIZE);
  } catch (error) {
    console.error("Randevu listesi yüklenemedi.", error);
    loadError = true;
  }

  const nextCursor = hasMore ? appointments.at(-1)?.id : undefined;
  const nextParams = new URLSearchParams();
  if (query) nextParams.set("q", query);
  if (date) nextParams.set("date", date);
  if (validDoctorId) nextParams.set("doctorId", validDoctorId);
  if (validStatus) nextParams.set("status", validStatus);
  if (nextCursor) nextParams.set("cursor", nextCursor);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">İşlemler</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Randevular</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Randevu takvimini görüntüleyin ve yönetin.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto" href="/appointments/new">
          <Plus aria-hidden="true" size={17} />
          Yeni Randevu
        </Link>
      </header>
      {getValue(params.created) === "1" ? <p className="rounded-md border border-[#c7ded6] bg-[#e9f4ef] px-4 py-3 text-sm text-[#245b50]">Randevu kaydı oluşturuldu.</p> : null}
      <form action="/appointments" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get" role="search">
        <label className="relative block min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Hasta ara</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
          <input className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15" defaultValue={query} maxLength={120} name="q" placeholder="Hasta ara..." type="search" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">Tarih<input className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={date} name="date" type="date" /></label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">Doktor<select className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={validDoctorId ?? ""} name="doctorId"><option value="">Tüm doktorlar</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.firstName} {doctor.lastName}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">Durum<select className="min-h-11 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" defaultValue={validStatus ?? ""} name="status"><option value="">Tüm durumlar</option>{Object.values(AppointmentStatus).map((status) => <option key={status} value={status}>{APPOINTMENT_STATUS_LABELS[status]}</option>)}</select></label>
        <button className="inline-flex min-h-11 items-center justify-center self-end rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" type="submit">Filtrele</button>
      </form>
      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800" role="alert">Randevular yüklenirken bir hata oluştu.</p>
      ) : appointments.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-[var(--ink)]">{query || date || validDoctorId || validStatus ? "Filtrelerle eşleşen randevu bulunamadı." : "Henüz kayıtlı randevu bulunmuyor."}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Randevu oluşturarak başlayabilirsiniz.</p>
          <Link className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/appointments/new"><Plus aria-hidden="true" size={16} />Yeni Randevu</Link>
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <caption className="sr-only">Kayıtlı randevular</caption>
                <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]"><tr><th className="px-4 py-3.5" scope="col">Tarih ve Saat</th><th className="px-4 py-3.5" scope="col">Hasta</th><th className="px-4 py-3.5" scope="col">Doktor</th><th className="px-4 py-3.5" scope="col">Tedavi</th><th className="px-4 py-3.5" scope="col">Durum</th><th className="px-4 py-3.5 text-right" scope="col">Detay</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">{appointments.map((appointment) => <tr className="hover:bg-[#fbfcfb]" key={appointment.id}>
                  <td className="px-4 py-4 text-[var(--muted)]">{formatDateTime(appointment.startsAt)}</td>
                  <td className="px-4 py-4 font-medium text-[var(--ink)]">{appointment.patient.firstName} {appointment.patient.lastName}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{appointment.doctor.firstName} {appointment.doctor.lastName}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{appointment.treatment?.name ?? "Belirtilmemiş"}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{APPOINTMENT_STATUS_LABELS[appointment.status]}</td>
                  <td className="px-4 py-4 text-right"><Link aria-label="Randevu detayını görüntüle" className="inline-flex size-9 items-center justify-center rounded-md text-[var(--muted)] outline-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/appointments/${appointment.id}`}><Eye aria-hidden="true" size={17} /></Link></td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>
          {hasMore && nextCursor ? <div className="flex justify-center"><Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/appointments?${nextParams.toString()}`}>Daha fazla yükle</Link></div> : null}
        </>
      )}
    </div>
  );
}
