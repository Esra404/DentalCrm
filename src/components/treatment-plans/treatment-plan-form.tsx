"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { TreatmentPlanStatus } from "@/generated/prisma/enums";
import {
  createTreatmentPlanAction,
  updateTreatmentPlanAction,
} from "@/server/actions/treatment-plans";
import {
  parseTreatmentPlanItems,
  treatmentPlanInputFromFormData,
  validateTreatmentPlanInput,
  type TreatmentPlanActionState,
  type TreatmentPlanFieldErrors,
} from "@/lib/validations/treatment-plan";

export type PlanTreatmentOption = {
  id: string;
  name: string;
  price: string;
  currency: string;
  isActive: boolean;
};

export type PlanPatientOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type PlanItemFormValue = {
  itemId?: string;
  treatmentId: string;
  quantity: number;
  toothNumber: number | null;
  treatmentName: string;
  unitPrice: string;
  currency: string;
};

type TreatmentPlanFormProps = {
  mode: "create" | "edit";
  planId?: string;
  patientId?: string;
  startsAt?: string;
  endsAt?: string;
  status?: string;
  items?: PlanItemFormValue[];
  patients: PlanPatientOption[];
  treatments: PlanTreatmentOption[];
};

const STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  DRAFT: "Taslak",
  APPROVED: "Onaylandı",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

const initialState: TreatmentPlanActionState = {};
const inputClass =
  "min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

export function TreatmentPlanForm({
  mode,
  planId,
  patientId = "",
  startsAt = "",
  endsAt = "",
  status = TreatmentPlanStatus.DRAFT,
  items = [],
  patients,
  treatments,
}: TreatmentPlanFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createTreatmentPlanAction : updateTreatmentPlanAction,
    initialState,
  );
  const [clientErrors, setClientErrors] = useState<TreatmentPlanFieldErrors>({});
  const [rows, setRows] = useState(
    items.map((item, index) => ({ ...item, key: item.itemId ?? `initial-${index}` })),
  );
  const [nextKey, setNextKey] = useState(0);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId);
  const errors = { ...state.fieldErrors, ...clientErrors };
  const itemsJson = JSON.stringify(
    rows.map(({ itemId, treatmentId, quantity, toothNumber }) => ({
      ...(itemId ? { itemId } : {}),
      treatmentId,
      quantity,
      toothNumber,
    })),
  );

  function validateOnClient(event: FormEvent<HTMLFormElement>) {
    const result = validateTreatmentPlanInput(
      treatmentPlanInputFromFormData(new FormData(event.currentTarget)),
    );
    if (!result.success) {
      event.preventDefault();
      setClientErrors(result.errors);
      return;
    }
    const parsed = parseTreatmentPlanItems(itemsJson);
    if (!parsed.success) {
      event.preventDefault();
      setClientErrors({ items: parsed.message });
      return;
    }
    setClientErrors({});
  }

  function addItem() {
    setRows((current) => [
      ...current,
      {
        key: `new-${nextKey}`,
        treatmentId: "",
        quantity: 1,
        toothNumber: null,
        treatmentName: "",
        unitPrice: "",
        currency: "",
      },
    ]);
    setNextKey((current) => current + 1);
  }

  function updateRow(
    key: string,
    update: Partial<PlanItemFormValue>,
  ) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...update } : row)),
    );
  }

  function changeTreatment(key: string, treatmentId: string) {
    const row = rows.find((item) => item.key === key);
    const selected = treatments.find((item) => item.id === treatmentId);
    updateRow(key, {
      ...(row?.treatmentId !== treatmentId ? { itemId: undefined } : {}),
      treatmentId,
      treatmentName: selected?.name ?? "",
      unitPrice: selected?.price ?? "",
      currency: selected?.currency ?? "",
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" onSubmit={validateOnClient}>
      {mode === "edit" && planId ? (
        <input name="treatmentPlanId" type="hidden" value={planId} />
      ) : null}
      <input name="itemsJson" type="hidden" value={itemsJson} />
      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="patientId">
          <span>Hasta <span aria-hidden="true" className="text-red-700">*</span></span>
          <select
            aria-describedby={errors.patientId ? "patientId-error" : undefined}
            aria-invalid={Boolean(errors.patientId)}
            className={inputClass}
            disabled={mode === "edit"}
            id="patientId"
            onChange={(event) => setSelectedPatientId(event.currentTarget.value)}
            required
            value={selectedPatientId}
          >
            <option value="">Hasta seçin</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}{patient.isActive ? "" : " (Pasif - mevcut kayıt)"}
              </option>
            ))}
          </select>
          <input name="patientId" type="hidden" value={selectedPatientId} />
          {errors.patientId ? <FieldError id="patientId-error" message={errors.patientId} /> : null}
        </label>
        <SelectField
          error={errors.status}
          id="status"
          label="Plan Durumu"
          name="status"
          options={Object.values(TreatmentPlanStatus).map((value) => ({
            id: value,
            name: STATUS_LABELS[value],
          }))}
          value={status}
        />
        <DateField error={errors.startsAt} id="startsAt" label="Başlangıç Tarihi" value={startsAt} />
        <DateField error={errors.endsAt} id="endsAt" label="Bitiş Tarihi" value={endsAt} />
      </div>

      <section aria-labelledby="plan-items-title" className="rounded-md border border-[var(--line)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--ink)]" id="plan-items-title">Tedavi Kalemleri</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Kaydedilen birim fiyatlar plan üzerinde sabit kalır.</p>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            onClick={addItem}
            type="button"
          >
            Tedavi Ekle
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {rows.map((row, index) => (
            <div className="grid min-w-0 grid-cols-1 gap-3 rounded-md border border-[var(--line)] p-3 sm:grid-cols-2 xl:grid-cols-12" key={row.key}>
              <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-[var(--ink)] sm:col-span-2 xl:col-span-5" htmlFor={`treatment-${row.key}`}>
                Tedavi
                <select
                  className={`${inputClass} max-w-full`}
                  id={`treatment-${row.key}`}
                  onChange={(event) => changeTreatment(row.key, event.currentTarget.value)}
                  required
                  value={row.treatmentId}
                >
                  <option value="">Tedavi seçin</option>
                  {treatments.map((treatment) => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.name} · {treatment.price} {treatment.currency}{treatment.isActive ? "" : " (Pasif - mevcut kayıt)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-[var(--ink)] xl:col-span-2" htmlFor={`tooth-${row.key}`}>
                Diş (FDI)
                <select
                  className={inputClass}
                  id={`tooth-${row.key}`}
                  onChange={(event) => updateRow(row.key, {
                    toothNumber: event.currentTarget.value ? Number(event.currentTarget.value) : null,
                  })}
                  value={row.toothNumber ?? ""}
                >
                  <option value="">Belirtilmedi</option>
                  {Array.from({ length: 32 }, (_, index) => {
                    const quadrant = Math.floor(index / 8) + 1;
                    const position = (index % 8) + 1;
                    const number = quadrant * 10 + position;
                    return <option key={number} value={number}>{number}</option>;
                  })}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-[var(--ink)] xl:col-span-1" htmlFor={`quantity-${row.key}`}>
                Adet
                <input
                  className={inputClass}
                  id={`quantity-${row.key}`}
                  max={999}
                  min={1}
                  onChange={(event) => updateRow(row.key, { quantity: Number(event.currentTarget.value) })}
                  required
                  type="number"
                  value={row.quantity}
                />
              </label>
              <div className="flex min-w-0 flex-col gap-2 text-sm font-medium text-[var(--ink)] xl:col-span-2">
                <span>Fiyat Özeti</span>
                <span className="flex min-h-11 flex-col justify-center rounded-md border border-[var(--line)] bg-[#f6f8f7] px-3 py-2 text-xs font-normal text-[var(--muted)]">
                  <span>Birim: {row.unitPrice ? `${row.unitPrice} ${row.currency}` : "Tedavi seçin"}</span>
                  <span className="font-semibold text-[var(--ink)]">
                    Satır: {row.unitPrice
                      ? `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(row.unitPrice) * row.quantity)} ${row.currency}`
                      : "—"}
                  </span>
                </span>
              </div>
              <button
                aria-label={`${index + 1}. tedavi kalemini çıkar`}
                className="inline-flex min-h-11 w-full items-center justify-center self-end rounded-md px-3 text-sm font-medium text-red-700 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 xl:col-span-2"
                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                type="button"
              >
                Çıkar
              </button>
              <p className="text-xs leading-5 text-[var(--muted)] sm:col-span-2 xl:col-span-12">
                Diş numarası seçmek için önce hastanın diş kaydında bu dişin durumunu kaydedin.
              </p>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-[var(--muted)]">Henüz tedavi kalemi eklenmedi.</p> : null}
        </div>
        {errors.items ? <FieldError id="items-error" message={errors.items} /> : null}
      </section>

      {state.message ? (
        <p aria-live="polite" className="text-sm text-red-700" role="alert">{state.message}</p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href={mode === "edit" && planId ? `/treatment-plans/${planId}` : "/treatment-plans"}
        >
          İptal
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Kaydediliyor..." : mode === "create" ? "Plan Oluştur" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}

function SelectField({
  error,
  id,
  label,
  name,
  options,
  value,
}: {
  error?: string;
  id: string;
  label: string;
  name: string;
  options: { id: string; name: string }[];
  value: string;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor={id}>
      {label}
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={inputClass}
        defaultValue={value}
        id={id}
        name={name}
        required
      >
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      {error ? <FieldError id={errorId} message={error} /> : null}
    </label>
  );
}

function DateField({
  error,
  id,
  label,
  value,
}: {
  error?: string;
  id: string;
  label: string;
  value: string;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor={id}>
      <span>{label} <span aria-hidden="true" className="text-red-700">*</span></span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={inputClass}
        defaultValue={value}
        id={id}
        name={id}
        required
        type="date"
      />
      {error ? <FieldError id={errorId} message={error} /> : null}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <span className="text-sm font-normal text-red-700" id={id} role="alert">{message}</span>;
}
