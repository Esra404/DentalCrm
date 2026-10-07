import Link from "next/link";
import { Eye, FileText, Search } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { softDeletePatientDocumentAction } from "@/server/actions/patient-documents";
import { requireRoles } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

function getValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatSize(size: bigint): string {
  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function typeLabel(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "PDF";
    case "image/jpeg":
      return "JPEG";
    case "image/png":
      return "PNG";
    default:
      return "Bilinmeyen";
  }
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const user = await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const params = await searchParams;
  const query = getValue(params.q).trim().slice(0, 120);
  const documents = await prisma.patientDocument.findMany({
    where: query
      ? {
          OR: [
            { fileName: { contains: query, mode: "insensitive" } },
            { patient: { is: { firstName: { contains: query, mode: "insensitive" } } } },
            { patient: { is: { lastName: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : {},
    orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      patientId: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
      deletedAt: true,
      patient: { select: { firstName: true, lastName: true } },
      uploadedBy: { select: { name: true } },
    },
  });
  const canDelete = user.role === Role.ADMIN || user.role === Role.STAFF;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">İşlemler</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Hasta Belgeleri</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Hasta kayıtlarına bağlı belgeleri görüntüleyin ve yönetin.</p>
        </div>
      </header>
      <form action="/documents" className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" method="get" role="search">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Belge veya Hasta Ara
          <span className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
            <input className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15" defaultValue={query} maxLength={120} name="q" placeholder="Belge adı veya hasta adı..." type="search" />
          </span>
        </label>
        <button className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:w-auto" type="submit">Ara</button>
      </form>
      {documents.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
          <FileText aria-hidden="true" className="text-[var(--accent)]" size={26} />
          <h2 className="mt-4 text-base font-semibold text-[var(--ink)]">
            {query ? "Aramanızla eşleşen belge bulunamadı." : "Henüz hasta belgesi bulunmuyor."}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Belge yüklemek için hasta kaydını açın.</p>
          <Link className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-[var(--accent-strong)] outline-none hover:bg-[var(--accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/patients">
            Hastalara git
          </Link>
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <caption className="sr-only">Hasta belgeleri</caption>
                <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3.5" scope="col">Belge</th>
                    <th className="px-4 py-3.5" scope="col">Hasta</th>
                    <th className="px-4 py-3.5" scope="col">Tür / Boyut</th>
                    <th className="px-4 py-3.5" scope="col">Yüklenme</th>
                    <th className="px-4 py-3.5" scope="col">Yükleyen</th>
                    <th className="px-4 py-3.5" scope="col">Durum</th>
                    <th className="px-4 py-3.5 text-right" scope="col">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {documents.map((document) => (
                    <tr className="hover:bg-[#fbfcfb]" key={document.id}>
                      <th className="max-w-56 px-4 py-4 font-medium text-[var(--ink)]" scope="row">
                        <span className="block truncate">{document.fileName}</span>
                      </th>
                      <td className="px-4 py-4 text-[var(--muted)]">
                        <Link className="hover:text-[var(--accent-strong)]" href={`/patients/${document.patientId}`}>
                          {document.patient.firstName} {document.patient.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">{typeLabel(document.mimeType)} · {formatSize(document.sizeBytes)}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{formatDate(document.uploadedAt)}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{document.uploadedBy?.name ?? "Bilinmiyor"}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${document.deletedAt ? "bg-[#edf0ef] text-[#5f6e68]" : "bg-[#e8f3ed] text-[#28634f]"}`}>
                          {document.deletedAt ? "Silindi" : "Aktif"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {!document.deletedAt ? (
                            <>
                              <Link
                                aria-label={`${document.fileName} belgesini görüntüle`}
                                className="inline-flex size-9 items-center justify-center rounded-md text-[var(--accent-strong)] outline-none hover:bg-[var(--accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                href={`/patients/${document.patientId}/documents/${document.id}/file`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <Eye aria-hidden="true" size={17} />
                              </Link>
                              {canDelete ? (
                                <form action={softDeletePatientDocumentAction}>
                                  <input name="patientId" type="hidden" value={document.patientId} />
                                  <input name="documentId" type="hidden" value={document.id} />
                                  <button className="rounded-md px-2.5 py-2 text-xs font-semibold text-red-700 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500" type="submit">
                                    Sil
                                  </button>
                                </form>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {documents.length === 100 ? <p className="text-center text-xs text-[var(--muted)]">En son 100 belge gösteriliyor.</p> : null}
        </>
      )}
    </div>
  );
}
