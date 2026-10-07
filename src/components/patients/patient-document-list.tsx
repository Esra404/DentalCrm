import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import { softDeletePatientDocumentAction } from "@/server/actions/patient-documents";

export type PatientDocumentListItem = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  uploadedAt: Date;
  deletedAt: Date | null;
  uploadedBy: { name: string } | null;
};

function formatFileSize(size: bigint): string {
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

function documentType(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "image/jpeg") return "JPEG";
  if (mimeType === "image/png") return "PNG";
  return "Bilinmeyen tür";
}

export function PatientDocumentList({
  patientId,
  documents,
  canDelete = false,
}: {
  patientId: string;
  documents: PatientDocumentListItem[];
  canDelete?: boolean;
}) {
  if (documents.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
        <FileText aria-hidden="true" className="mx-auto text-[var(--muted)]" size={24} />
        <p className="mt-3 text-sm font-medium text-[var(--ink)]">Bu hastaya ait henüz belge bulunmuyor.</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Hasta belgeleri yüklendiğinde burada listelenir.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <caption className="sr-only">Hasta belgeleri</caption>
          <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3.5" scope="col">Belge Adı</th>
              <th className="px-4 py-3.5" scope="col">Tür</th>
              <th className="px-4 py-3.5" scope="col">Boyut</th>
              <th className="px-4 py-3.5" scope="col">Yüklenme Tarihi</th>
              <th className="px-4 py-3.5" scope="col">Yükleyen</th>
              <th className="px-4 py-3.5" scope="col">Durum / İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {documents.map((document) => (
              <tr className="align-middle" key={document.id}>
                <th className="max-w-64 px-4 py-4 font-medium text-[var(--ink)]" scope="row">
                  <span className="block truncate">{document.fileName}</span>
                </th>
                <td className="px-4 py-4 text-[var(--muted)]">{documentType(document.mimeType)}</td>
                <td className="px-4 py-4 text-[var(--muted)]">{formatFileSize(document.sizeBytes)}</td>
                <td className="px-4 py-4 text-[var(--muted)]">{formatDate(document.uploadedAt)}</td>
                <td className="px-4 py-4 text-[var(--muted)]">{document.uploadedBy?.name ?? "Bilinmiyor"}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {document.deletedAt ? (
                      <span className="rounded-full bg-[#edf0ef] px-2.5 py-1 text-xs font-medium text-[#5f6e68]">Silindi</span>
                    ) : (
                      <>
                        <span className="rounded-full bg-[#e8f3ed] px-2.5 py-1 text-xs font-medium text-[#28634f]">Aktif</span>
                        <Link
                          aria-label={`${document.fileName} belgesini görüntüle`}
                          className="inline-flex size-9 items-center justify-center rounded-md text-[var(--accent-strong)] outline-none hover:bg-[var(--accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          href={`/patients/${patientId}/documents/${document.id}/file`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Eye aria-hidden="true" size={17} />
                        </Link>
                        {canDelete ? (
                          <form action={softDeletePatientDocumentAction}>
                            <input name="patientId" type="hidden" value={patientId} />
                            <input name="documentId" type="hidden" value={document.id} />
                            <button
                              className="rounded-md px-2.5 py-2 text-xs font-semibold text-red-700 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"
                              type="submit"
                            >
                              Sil
                            </button>
                          </form>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
