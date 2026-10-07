import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { DoctorForm } from "@/components/doctors/doctor-form";
import { requireRoles } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { DOCTOR_ID_PATTERN } from "@/lib/validations/doctor";

export default async function EditDoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF);
  const { id } = await params;
  if (!DOCTOR_ID_PATTERN.test(id)) notFound();
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      phone: true,
      email: true,
      licenseNumber: true,
    },
  });
  if (!doctor) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/doctors/${doctor.id}`}>
          <ArrowLeft aria-hidden="true" size={16} />
          Doktor detayına dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Doktor Yönetimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Doktor Bilgilerini Düzenle</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{doctor.firstName} {doctor.lastName}</p>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <DoctorForm
          initialValues={{
            firstName: doctor.firstName,
            lastName: doctor.lastName,
            specialty: doctor.specialty ?? "",
            phone: doctor.phone ?? "",
            email: doctor.email ?? "",
            licenseNumber: doctor.licenseNumber ?? "",
          }}
          mode="edit"
          doctorId={doctor.id}
        />
      </section>
    </div>
  );
}
