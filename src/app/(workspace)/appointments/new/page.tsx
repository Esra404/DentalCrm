import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import {
  doctorPatientWhere,
  getActiveDoctorId,
} from "@/lib/auth/doctor-access";

export default async function NewAppointmentPage() {
  const user = await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const doctorId =
    user.role === Role.DOCTOR ? await getActiveDoctorId(user.id) : null;
  const [patients, doctors, treatments] = await Promise.all([
    prisma.patient.findMany({
      where: {
        isActive: true,
        ...(user.role === Role.DOCTOR
          ? doctorPatientWhere(doctorId)
          : {}),
      },
      select: { id: true, firstName: true, lastName: true, doctorId: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.doctor.findMany({
      where: {
        isActive: true,
        ...(user.role === Role.DOCTOR
          ? { id: doctorId ?? "00000000-0000-0000-0000-000000000000" }
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/appointments">
          <ArrowLeft aria-hidden="true" size={16} />
          Randevulara dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Randevu Yönetimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Yeni Randevu</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Aktif hasta, doktor ve tedavi seçerek randevu oluşturun.</p>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        {patients.length === 0 || doctors.length === 0 || treatments.length === 0 ? (
          <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            Randevu oluşturmak için en az bir aktif hasta, doktor ve tedavi kaydı bulunmalıdır.
          </p>
        ) : null}
        <AppointmentForm
          doctors={doctors.map((doctor) => ({
            id: doctor.id,
            label: `${doctor.firstName} ${doctor.lastName}`,
            isActive: true,
          }))}
          mode="create"
          patients={patients.map((patient) => ({
            id: patient.id,
            label: `${patient.firstName} ${patient.lastName}`,
            isActive: true,
            doctorId: patient.doctorId,
          }))}
          treatments={treatments.map((treatment) => ({
            id: treatment.id,
            label: treatment.name,
            isActive: true,
          }))}
        />
      </section>
    </div>
  );
}
