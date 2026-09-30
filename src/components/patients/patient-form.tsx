"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import {
  createPatientAction,
  updatePatientAction,
} from "@/server/actions/patients";
import {
  PATIENT_PHONE_PATTERN,
  patientInputFromFormData,
  validatePatientInput,
  type PatientActionState,
  type PatientFieldErrors,
  type PatientFormInput,
} from "@/lib/validations/patient";

type PatientFormProps = {
  mode: "create" | "edit";
  patientId?: string;
  initialValues?: PatientFormInput;
};

const emptyValues: PatientFormInput = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  address: "",
  notes: "",
};

const initialState: PatientActionState = {};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="text-sm text-red-700" id={id} role="alert">
      {message}
    </p>
  );
}

export function PatientForm({ mode, patientId, initialValues }: PatientFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createPatientAction : updatePatientAction,
    initialState,
  );
  const [clientErrors, setClientErrors] = useState<PatientFieldErrors>({});
  const values = initialValues ?? emptyValues;
  const fieldErrors = { ...state.fieldErrors, ...clientErrors };
  const inputClassName =
    "min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none placeholder:text-[#91a19b] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

  function validateOnClient(event: FormEvent<HTMLFormElement>) {
    const validation = validatePatientInput(
      patientInputFromFormData(new FormData(event.currentTarget)),
    );

    if (!validation.success) {
      event.preventDefault();
      setClientErrors(validation.errors);
      return;
    }

    setClientErrors({});
  }

  return (
    <form action={formAction} className="flex flex-col gap-7" onSubmit={validateOnClient}>
      {mode === "edit" && patientId ? (
        <input name="patientId" type="hidden" value={patientId} />
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="firstName">
          Ad <span aria-hidden="true" className="text-red-700">*</span>
          <input
            aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
            aria-invalid={Boolean(fieldErrors.firstName)}
            autoComplete="given-name"
            className={inputClassName}
            defaultValue={values.firstName}
            id="firstName"
            maxLength={100}
            name="firstName"
            required
          />
          <FieldError id="firstName-error" message={fieldErrors.firstName} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="lastName">
          Soyad <span aria-hidden="true" className="text-red-700">*</span>
          <input
            aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
            aria-invalid={Boolean(fieldErrors.lastName)}
            autoComplete="family-name"
            className={inputClassName}
            defaultValue={values.lastName}
            id="lastName"
            maxLength={100}
            name="lastName"
            required
          />
          <FieldError id="lastName-error" message={fieldErrors.lastName} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="phone">
          Telefon
          <input
            aria-describedby={fieldErrors.phone ? "phone-error" : "phone-hint"}
            aria-invalid={Boolean(fieldErrors.phone)}
            autoComplete="tel"
            className={inputClassName}
            defaultValue={values.phone}
            id="phone"
            maxLength={32}
            name="phone"
            pattern={PATIENT_PHONE_PATTERN}
            title="7-15 rakam kullanın; boşluk, parantez ve tire yazabilirsiniz."
            type="tel"
          />
          <span className="text-xs font-normal text-[var(--muted)]" id="phone-hint">
            İsteğe bağlı. Ülke koduyla girebilirsiniz.
          </span>
          <FieldError id="phone-error" message={fieldErrors.phone} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="email">
          E-posta
          <input
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            className={inputClassName}
            defaultValue={values.email}
            id="email"
            maxLength={320}
            name="email"
            type="email"
          />
          <FieldError id="email-error" message={fieldErrors.email} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="dateOfBirth">
          Doğum Tarihi
          <input
            aria-describedby={fieldErrors.dateOfBirth ? "dateOfBirth-error" : undefined}
            aria-invalid={Boolean(fieldErrors.dateOfBirth)}
            className={inputClassName}
            defaultValue={values.dateOfBirth}
            id="dateOfBirth"
            max={new Date().toISOString().slice(0, 10)}
            name="dateOfBirth"
            type="date"
          />
          <FieldError id="dateOfBirth-error" message={fieldErrors.dateOfBirth} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)] md:col-span-2" htmlFor="address">
          Adres
          <textarea
            aria-describedby={fieldErrors.address ? "address-error" : undefined}
            aria-invalid={Boolean(fieldErrors.address)}
            className={`${inputClassName} min-h-24 resize-y`}
            defaultValue={values.address}
            id="address"
            maxLength={4000}
            name="address"
            rows={3}
          />
          <FieldError id="address-error" message={fieldErrors.address} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)] md:col-span-2" htmlFor="notes">
          Notlar
          <textarea
            aria-describedby={fieldErrors.notes ? "notes-error" : undefined}
            aria-invalid={Boolean(fieldErrors.notes)}
            className={`${inputClassName} min-h-28 resize-y`}
            defaultValue={values.notes}
            id="notes"
            maxLength={10000}
            name="notes"
            rows={4}
          />
          <FieldError id="notes-error" message={fieldErrors.notes} />
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
          href={mode === "edit" && patientId ? `/patients/${patientId}` : "/patients"}
        >
          İptal
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Kaydediliyor..." : mode === "create" ? "Hasta Oluştur" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}