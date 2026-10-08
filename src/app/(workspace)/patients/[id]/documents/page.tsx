import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { PatientDocumentList } from "@/components/patients/patient-document-list";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { PATIENT_DOCUMENT_ID_PATTERN } from "@/lib/validations/patient-document";
import { canDoctorAccessPatient } from "@/lib/auth/doctor-access";

function getValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PatientDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    uploaded?: string | string[];
    deleted?: string | string[];
    cleanup?: string | string[];
    error?: string | string[];
  }>;
}) {
  const user = await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id } = await params;
  if (!PATIENT_DOCUMENT_ID_PATTERN.test(id)) notFound();
  if (
    user.role === Role.DOCTOR &&
    !(await canDoctorAccessPatient(user.id, id))
  ) {
    notFound();
  }

  const [patient, documents, query] = await Promise.all([
    prisma.patient.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.patientDocument.findMany({
      where: { patientId: id },
      orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
        deletedAt: true,
        uploadedBy: { select: { name: true } },
      },
    }),
    searchParams,
  ]);
  if (!patient) notFound();

  const showDelete = user.role === Role.ADMIN || user.role === Role.STAFF;
  const error = getValue(query.error);
  const deleted = getValue(query.deleted) === "1";
  const cleanupPending = getValue(query.cleanup) === "pending";

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            href={`/patients/${patient.id}`}
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Hasta detayına dön
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Hasta Belgeleri</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">{patient.firstName} {patient.lastName}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Bu hastaya ait yüklenen belgeler ve dosya durumları.</p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto"
          href={`/patients/${patient.id}/documents/new`}
        >
          <Plus aria-hidden="true" size={17} />
          Belge Yükle
        </Link>
      </header>
      {getValue(query.uploaded) === "1" ? (
        <p className="rounded-md border border-[#c7ded6] bg-[#e9f4ef] px-4 py-3 text-sm text-[#245b50]" role="status">
          Belge başarıyla yüklendi.
        </p>
      ) : null}
      {deleted ? (
        <p className="rounded-md border border-[#c7ded6] bg-[#e9f4ef] px-4 py-3 text-sm text-[#245b50]" role="status">
          Belge erişime kapatıldı{cleanupPending ? "; depolama temizliği için yönetici desteği gerekiyor." : " ve depolama dosyası temizlendi."}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error === "not-found" ? "Belge bulunamadı veya zaten silinmiş." : error === "invalid" ? "Belge bilgisi geçersiz." : "Belge işlemi tamamlanamadı."}
        </p>
      ) : null}
      <section aria-label="Belgeler" className="flex flex-col gap-4">
        <PatientDocumentList
          canDelete={showDelete}
          documents={documents}
          patientId={patient.id}
        />
        {documents.length === 100 ? (
          <p className="text-center text-xs text-[var(--muted)]">En son 100 belge gösteriliyor.</p>
        ) : null}
      </section>
    </div>
  );
}
