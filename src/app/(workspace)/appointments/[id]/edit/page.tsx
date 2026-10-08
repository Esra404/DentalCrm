import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { AppointmentForm, type AppointmentOption } from "@/components/appointments/appointment-form";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import {
  doctorPatientWhere,
  getActiveDoctorId,
} from "@/lib/auth/doctor-access";
import {
  APPOINTMENT_ID_PATTERN,
  appointmentDateTimeValues,
} from "@/lib/validations/appointment";

function addExistingOption<T extends { id: string; label: string }>(
  options: AppointmentOption[],
  current: T | null,
): AppointmentOption[] {
  if (!current || options.some((option) => option.id === current.id)) return options;
  return [...options, { ...current, isActive: false }];
}

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id } = await params;
  if (!APPOINTMENT_ID_PATTERN.test(id)) notFound();
  const assignedDoctorId =
    user.role === Role.DOCTOR ? await getActiveDoctorId(user.id) : null;

  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      ...(user.role === Role.DOCTOR
        ? {
            patient: {
              doctorId:
              assignedDoctorId ?? "00000000-0000-0000-0000-000000000000",
            },
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, isActive: true, doctorId: true } },
      doctor: { select: { id: true, firstName: true, lastName: true, isActive: true } },
      treatment: { select: { id: true, name: true, isActive: true } },
    },
  });
  if (!appointment) notFound();

  const [activePatients, activeDoctors, activeTreatments] = await Promise.all([
    prisma.patient.findMany({
      where: {
        isActive: true,
        ...(user.role === Role.DOCTOR
          ? doctorPatientWhere(assignedDoctorId)
          : {}),
      },
      select: { id: true, firstName: true, lastName: true, doctorId: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.doctor.findMany({
      where: {
        isActive: true,
        ...(user.role === Role.DOCTOR
          ? {
              id:
                assignedDoctorId ?? "00000000-0000-0000-0000-000000000000",
            }
          : {}),
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.treatment.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const start = appointmentDateTimeValues(appointment.startsAt);
  const end = appointmentDateTimeValues(appointment.endsAt);
  const patientOptions = addExistingOption(
    activePatients.map((patient) => ({
      id: patient.id,
      label: `${patient.firstName} ${patient.lastName}`,
      isActive: true,
      doctorId: patient.doctorId,
    })),
    appointment.patient.isActive
      ? null
      : {
          id: appointment.patient.id,
          label: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          doctorId: appointment.patient.doctorId,
        },
  );
  const doctorOptions = addExistingOption(
    activeDoctors.map((doctor) => ({
      id: doctor.id,
      label: `${doctor.firstName} ${doctor.lastName}`,
      isActive: true,
    })),
    appointment.doctor.isActive
      ? null
      : {
          id: appointment.doctor.id,
          label: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        },
  );
  const treatmentOptions = addExistingOption(
    activeTreatments.map((treatment) => ({
      id: treatment.id,
      label: treatment.name,
      isActive: true,
    })),
    appointment.treatment && !appointment.treatment.isActive
      ? {
          id: appointment.treatment.id,
          label: appointment.treatment.name,
        }
      : null,
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/appointments/${appointment.id}`}>
          <ArrowLeft aria-hidden="true" size={16} />
          Randevu detayına dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Randevu Yönetimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Randevuyu Düzenle</h1>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <AppointmentForm
          appointmentId={appointment.id}
          doctors={doctorOptions}
          initialValues={{
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            treatmentId: appointment.treatmentId ?? "",
            startDate: start.date,
            startTime: start.time,
            endDate: end.date,
            endTime: end.time,
            status: appointment.status,
            note: appointment.note ?? "",
          }}
          mode="edit"
          patients={patientOptions}
          treatments={treatmentOptions}
        />
      </section>
    </div>
  );
}
