import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PatientForm } from "@/components/patients/patient-form";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      address: true,
      notes: true,
    },
  });

  if (!patient) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link
          className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href={`/patients/${patient.id}`}
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Hasta detayına dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Hasta Yönetimi
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Hasta Bilgilerini Düzenle</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {patient.firstName} {patient.lastName}
        </p>
      </header>

      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <PatientForm
          initialValues={{
            firstName: patient.firstName,
            lastName: patient.lastName,
            phone: patient.phone ?? "",
            email: patient.email ?? "",
            dateOfBirth: patient.dateOfBirth?.toISOString().slice(0, 10) ?? "",
            address: patient.address ?? "",
            notes: patient.notes ?? "",
          }}
          mode="edit"
          patientId={patient.id}
        />
      </section>
    </div>
  );
}