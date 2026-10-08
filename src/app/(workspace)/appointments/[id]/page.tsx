import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Pencil } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import {
  APPOINTMENT_ID_PATTERN,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TIME_ZONE,
} from "@/lib/validations/appointment";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { getActiveDoctorId } from "@/lib/auth/doctor-access";

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: APPOINTMENT_TIME_ZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id } = await params;
  if (!APPOINTMENT_ID_PATTERN.test(id)) notFound();
  const doctorId =
    user.role === Role.DOCTOR ? await getActiveDoctorId(user.id) : null;

  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      ...(user.role === Role.DOCTOR
        ? {
            doctorId: doctorId ?? "00000000-0000-0000-0000-000000000000",
            patient: { doctorId: doctorId ?? "00000000-0000-0000-0000-000000000000" },
          }
        : {}),
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
      doctor: {
        select: { id: true, firstName: true, lastName: true },
      },
      treatment: {
        select: { id: true, name: true },
      },
    },
  });
  if (!appointment) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/appointments">
            <ArrowLeft aria-hidden="true" size={16} />
            Randevulara dön
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Randevu Kaydı</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">{formatDateTime(appointment.startsAt)}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{APPOINTMENT_STATUS_LABELS[appointment.status]}</p>
        </div>
        <Link className="inline-flex min-h-10 items-center gap-2 self-start rounded-md border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto" href={`/appointments/${appointment.id}/edit`}>
          <Pencil aria-hidden="true" size={16} />
          Düzenle
        </Link>
      </header>
      <section aria-labelledby="appointment-details-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
          <span className="flex size-10 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]"><CalendarDays aria-hidden="true" size={20} /></span>
          <h2 className="text-base font-semibold text-[var(--ink)]" id="appointment-details-title">Randevu Bilgileri</h2>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail label="Hasta" value={`${appointment.patient.firstName} ${appointment.patient.lastName}`} />
          <Detail label="Doktor" value={`${appointment.doctor.firstName} ${appointment.doctor.lastName}`} />
          <Detail label="Tedavi" value={appointment.treatment?.name ?? "Tedavi belirtilmemiş (eski kayıt)"} />
          <Detail label="Başlangıç" value={formatDateTime(appointment.startsAt)} />
          <Detail label="Bitiş" value={formatDateTime(appointment.endsAt)} />
          <Detail label="Durum" value={APPOINTMENT_STATUS_LABELS[appointment.status]} />
          <div className="sm:col-span-2"><Detail label="Not" value={appointment.note || "Not bulunmuyor."} /></div>
        </dl>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-medium text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[var(--ink)]">{value}</dd></div>;
}
