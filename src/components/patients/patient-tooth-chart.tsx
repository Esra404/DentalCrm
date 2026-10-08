"use client";

import { useState } from "react";
import { ToothStatus } from "@/generated/prisma/enums";
import { PatientToothForm } from "@/components/patients/patient-tooth-form";

type ToothChartRecord = {
  toothNumber: number;
  status: ToothStatus;
  notes: string | null;
  planItems: { id: string; treatmentName: string }[];
};

const QUADRANTS = [
  { label: "Üst sağ", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
  { label: "Üst sol", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
  { label: "Alt sağ", teeth: [48, 47, 46, 45, 44, 43, 42, 41] },
  { label: "Alt sol", teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
] as const;

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

export function PatientToothChart({
  patientId,
  canEdit,
  teeth,
}: {
  patientId: string;
  canEdit: boolean;
  teeth: ToothChartRecord[];
}) {
  const [selectedToothNumber, setSelectedToothNumber] = useState<number | null>(null);
  const selectedTooth = teeth.find(
    (tooth) => tooth.toothNumber === selectedToothNumber,
  );

  return (
    <div className="mt-4">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {QUADRANTS.map((quadrant) => (
          <section
            aria-label={`${quadrant.label} dişleri`}
            className="min-w-0 rounded-md bg-[var(--canvas)] p-3"
            key={quadrant.label}
          >
            <h3 className="mb-2 text-center text-xs font-medium text-[var(--muted)]">
              {quadrant.label}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {quadrant.teeth.map((toothNumber) => {
                const tooth = teeth.find((entry) => entry.toothNumber === toothNumber);
                const selected = selectedToothNumber === toothNumber;
                const status = tooth ? STATUS_LABELS[tooth.status] : "Kayıt yok";

                return (
                  <button
                    aria-label={`${toothNumber} numaralı diş, ${status}${canEdit ? ", düzenle" : ""}`}
                    aria-pressed={selected}
                    className={`flex min-h-10 min-w-0 items-center justify-center rounded-md border px-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      selected
                        ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-white"
                        : tooth
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                          : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--accent)]"
                    }`}
                    key={toothNumber}
                    onClick={() =>
                      setSelectedToothNumber((current) =>
                        current === toothNumber ? null : toothNumber,
                      )
                    }
                    type="button"
                  >
                    {toothNumber}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {selectedToothNumber !== null ? (
        <section
          aria-label={`${selectedToothNumber} numaralı diş bilgileri`}
          className="mt-4 grid min-w-0 gap-4 rounded-md border border-[var(--line)] bg-white p-4 sm:grid-cols-2 sm:items-start"
        >
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              FDI {selectedToothNumber} · {selectedTooth ? STATUS_LABELS[selectedTooth.status] : "Kayıt yok"}
            </h3>
            {selectedTooth?.notes ? (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--muted)]">
                {selectedTooth.notes}
              </p>
            ) : null}
            {selectedTooth?.planItems.length ? (
              <div className="mt-3">
                <p className="text-xs font-medium text-[var(--muted)]">İlişkili tedaviler</p>
                <ul className="mt-1 list-inside list-disc text-sm text-[var(--ink)]">
                  {selectedTooth.planItems.map((item) => (
                    <li className="break-words" key={item.id}>{item.treatmentName}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {canEdit ? (
            <div className="min-w-0">
              <PatientToothForm
                key={`${patientId}-${selectedToothNumber}-${selectedTooth?.status ?? "new"}-${selectedTooth?.notes ?? ""}`}
                notes={selectedTooth?.notes ?? ""}
                patientId={patientId}
                status={selectedTooth?.status ?? ToothStatus.HEALTHY}
                toothNumber={selectedToothNumber}
              />
            </div>
          ) : null}
        </section>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">
          {canEdit
            ? "Durumunu görüntülemek veya düzenlemek için bir diş numarası seçin."
            : "Bir diş numarası seçerek kayıtlı durum ve tedavi bilgilerini görüntüleyin."}
        </p>
      )}
    </div>
  );
}
