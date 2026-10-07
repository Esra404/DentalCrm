import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PatientDocumentForm } from "@/components/patients/patient-document-form";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { PATIENT_DOCUMENT_ID_PATTERN } from "@/lib/validations/patient-document";

export default async function NewPatientDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id } = await params;
  if (!PATIENT_DOCUMENT_ID_PATTERN.test(id)) notFound();

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link
          className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href={`/patients/${patient.id}/documents`}
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Belgelere dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Hasta Belgeleri</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Yeni Belge Yükle</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{patient.firstName} {patient.lastName}</p>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <PatientDocumentForm patientId={patient.id} />
      </section>
    </div>
  );
}
