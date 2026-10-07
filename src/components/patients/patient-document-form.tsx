"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createPatientDocumentAction,
  type PatientDocumentActionState,
} from "@/server/actions/patient-documents";

const initialState: PatientDocumentActionState = {};
const inputClass =
  "min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

export function PatientDocumentForm({ patientId }: { patientId: string }) {
  const [state, formAction, pending] = useActionState(
    createPatientDocumentAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input name="patientId" type="hidden" value={patientId} />
      <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]">
        Belge Adı
        <input
          aria-describedby={state.fieldErrors?.documentName ? "document-name-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.documentName)}
          autoComplete="off"
          className={inputClass}
          maxLength={160}
          name="documentName"
          required
        />
        {state.fieldErrors?.documentName ? (
          <span className="text-sm font-normal text-red-700" id="document-name-error" role="alert">
            {state.fieldErrors.documentName}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]">
        Dosya
        <input
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          aria-describedby={state.fieldErrors?.file ? "document-file-error" : "document-file-help"}
          aria-invalid={Boolean(state.fieldErrors?.file)}
          className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] file:mr-3 file:rounded file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--accent-strong)]"
          name="file"
          required
          type="file"
        />
        <span className="text-xs font-normal text-[var(--muted)]" id="document-file-help">
          PDF, JPG/JPEG veya PNG; en fazla 10 MB.
        </span>
        {state.fieldErrors?.file ? (
          <span className="text-sm font-normal text-red-700" id="document-file-error" role="alert">
            {state.fieldErrors.file}
          </span>
        ) : null}
      </label>
      {state.message ? (
        <p aria-live="polite" className="text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href={`/patients/${patientId}/documents`}
        >
          İptal
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Yükleniyor..." : "Belgeyi Yükle"}
        </button>
      </div>
    </form>
  );
}
