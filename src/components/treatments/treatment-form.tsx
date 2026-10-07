"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import {
  createTreatmentAction,
  updateTreatmentAction,
} from "@/server/actions/treatments";
import {
  treatmentInputFromFormData,
  validateTreatmentInput,
  type TreatmentActionState,
  type TreatmentFieldErrors,
  type TreatmentFormInput,
} from "@/lib/validations/treatment";

type TreatmentFormProps = {
  mode: "create" | "edit";
  treatmentId?: string;
  initialValues?: TreatmentFormInput;
};

const emptyValues: TreatmentFormInput = {
  name: "",
  description: "",
  defaultPrice: "",
  currency: "TRY",
};

const initialState: TreatmentActionState = {};

export function TreatmentForm({
  mode,
  treatmentId,
  initialValues,
}: TreatmentFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createTreatmentAction : updateTreatmentAction,
    initialState,
  );
  const [clientErrors, setClientErrors] = useState<TreatmentFieldErrors>({});
  const errors = { ...state.fieldErrors, ...clientErrors };
  const values = initialValues ?? emptyValues;
  const inputClass =
    "min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

  function validateOnClient(event: FormEvent<HTMLFormElement>) {
    const result = validateTreatmentInput(
      treatmentInputFromFormData(new FormData(event.currentTarget)),
    );
    if (!result.success) {
      event.preventDefault();
      setClientErrors(result.errors);
      return;
    }
    setClientErrors({});
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" onSubmit={validateOnClient}>
      {mode === "edit" && treatmentId ? (
        <input name="treatmentId" type="hidden" value={treatmentId} />
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          errors={errors}
          id="name"
          inputClass={inputClass}
          label="Tedavi Adı"
          maxLength={160}
          name="name"
          required
          value={values.name}
        />
        <Field
          errors={errors}
          id="defaultPrice"
          inputClass={inputClass}
          label="Birim Fiyat"
          maxLength={13}
          name="defaultPrice"
          required
          step="0.01"
          type="number"
          value={values.defaultPrice}
        />
        <Field
          errors={errors}
          id="currency"
          inputClass={inputClass}
          label="Para Birimi"
          maxLength={3}
          name="currency"
          required
          value={values.currency}
        />
        <label
          className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)] md:col-span-2"
          htmlFor="description"
        >
          Açıklama
          <textarea
            aria-describedby={errors.description ? "description-error" : undefined}
            aria-invalid={Boolean(errors.description)}
            className={`${inputClass} min-h-28 resize-y`}
            defaultValue={values.description}
            id="description"
            maxLength={10000}
            name="description"
            rows={4}
          />
          {errors.description ? (
            <span className="text-sm font-normal text-red-700" id="description-error" role="alert">
              {errors.description}
            </span>
          ) : null}
        </label>
      </div>
      {state.message ? (
        <p aria-live="polite" className="text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href={mode === "edit" && treatmentId ? `/treatments/${treatmentId}` : "/treatments"}
        >
          İptal
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Kaydediliyor..." : mode === "create" ? "Tedavi Oluştur" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}

function Field({
  errors,
  id,
  inputClass,
  label,
  maxLength,
  name,
  required,
  step,
  type = "text",
  value,
}: {
  errors: TreatmentFieldErrors;
  id: keyof TreatmentFormInput;
  inputClass: string;
  label: string;
  maxLength: number;
  name: string;
  required?: boolean;
  step?: string;
  type?: string;
  value: string;
}) {
  const errorId = `${id}-error`;

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor={id}>
      {label}{required ? <span aria-hidden="true" className="text-red-700"> *</span> : null}
      <input
        aria-describedby={errors[id] ? errorId : undefined}
        aria-invalid={Boolean(errors[id])}
        className={inputClass}
        defaultValue={value}
        id={id}
        max={id === "defaultPrice" ? "9999999999.99" : undefined}
        maxLength={maxLength}
        min={id === "defaultPrice" ? "0" : undefined}
        name={name}
        required={required}
        step={step}
        type={type}
      />
      {errors[id] ? (
        <span className="text-sm font-normal text-red-700" id={errorId} role="alert">
          {errors[id]}
        </span>
      ) : null}
    </label>
  );
}
