"use client";

import { useActionState } from "react";
import { ToothStatus } from "@/generated/prisma/enums";
import {
  savePatientToothAction,
  type PatientToothActionState,
} from "@/server/actions/patient-teeth";

const STATUS_LABELS: Record<ToothStatus, string> = {
  HEALTHY: "Sağlıklı",
  CARIES: "Çürük",
  FILLED: "Dolgulu",
  ROOT_CANAL: "Kanal tedavili",
  CROWN: "Kaplama",
  MISSING: "Eksik",
  IMPLANT: "İmplant",
  EXTRACTION_RECOMMENDED: "Çekim önerildi",
};

const initialState: PatientToothActionState = {};
const fieldClass =
  "min-h-9 w-full rounded-md border border-[var(--line)] bg-white px-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

export function PatientToothForm({
  patientId,
  toothNumber,
  status,
  notes,
}: {
  patientId: string;
  toothNumber: number;
  status: ToothStatus;
  notes: string;
}) {
  const [state, formAction, pending] = useActionState(
    savePatientToothAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input name="patientId" type="hidden" value={patientId} />
      <input name="toothNumber" type="hidden" value={toothNumber} />
      <label className="sr-only" htmlFor={`tooth-status-${patientId}-${toothNumber}`}>
        {toothNumber} numaralı dişin durumu
      </label>
      <select
        className={fieldClass}
        defaultValue={status}
        id={`tooth-status-${patientId}-${toothNumber}`}
        name="status"
      >
        {Object.values(ToothStatus).map((value) => (
          <option key={value} value={value}>{STATUS_LABELS[value]}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`tooth-notes-${patientId}-${toothNumber}`}>
        {toothNumber} numaralı diş için not
      </label>
      <input
        className={fieldClass}
        defaultValue={notes}
        id={`tooth-notes-${patientId}-${toothNumber}`}
        maxLength={2000}
        name="notes"
        placeholder="Not (isteğe bağlı)"
      />
      <button
        className="min-h-9 rounded-md bg-[var(--accent-strong)] px-2 text-xs font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Kaydediliyor..." : state.saved ? "Kaydedildi" : "Kaydet"}
      </button>
      {state.message && !state.saved ? (
        <p className="text-xs text-red-700" role="alert">{state.message}</p>
      ) : null}
    </form>
  );
}
