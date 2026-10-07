"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import {
  createDoctorAction,
  updateDoctorAction,
} from "@/server/actions/doctors";
import {
  doctorInputFromFormData,
  validateDoctorInput,
  type DoctorActionState,
  type DoctorFieldErrors,
  type DoctorFormInput,
} from "@/lib/validations/doctor";

type DoctorFormProps = {
  mode: "create" | "edit";
  doctorId?: string;
  initialValues?: DoctorFormInput;
};

const emptyValues: DoctorFormInput = {
  firstName: "",
  lastName: "",
  specialty: "",
  phone: "",
  email: "",
  licenseNumber: "",
};

const initialState: DoctorActionState = {};

export function DoctorForm({ mode, doctorId, initialValues }: DoctorFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createDoctorAction : updateDoctorAction,
    initialState,
  );
  const [clientErrors, setClientErrors] = useState<DoctorFieldErrors>({});
  const errors = { ...state.fieldErrors, ...clientErrors };
  const values = initialValues ?? emptyValues;
  const inputClass =
    "min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

  function validateOnClient(event: FormEvent<HTMLFormElement>) {
    const result = validateDoctorInput(
      doctorInputFromFormData(new FormData(event.currentTarget)),
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
      {mode === "edit" && doctorId ? (
        <input name="doctorId" type="hidden" value={doctorId} />
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          errors={errors}
          id="firstName"
          inputClass={inputClass}
          label="Ad"
          maxLength={100}
          name="firstName"
          required
          value={values.firstName}
        />
        <Field
          errors={errors}
          id="lastName"
          inputClass={inputClass}
          label="Soyad"
          maxLength={100}
          name="lastName"
          required
          value={values.lastName}
        />
        <Field
          errors={errors}
          id="specialty"
          inputClass={inputClass}
          label="Uzmanlık"
          maxLength={120}
          name="specialty"
          value={values.specialty}
        />
        <Field
          errors={errors}
          id="phone"
          inputClass={inputClass}
          label="Telefon"
          maxLength={32}
          name="phone"
          type="tel"
          value={values.phone}
        />
        <Field
          errors={errors}
          id="email"
          inputClass={inputClass}
          label="E-posta"
          maxLength={320}
          name="email"
          type="email"
          value={values.email}
        />
        <Field
          errors={errors}
          id="licenseNumber"
          inputClass={inputClass}
          label="Lisans Numarası"
          maxLength={64}
          name="licenseNumber"
          value={values.licenseNumber}
        />
      </div>
      {state.message ? (
        <p aria-live="polite" className="text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href={mode === "edit" && doctorId ? `/doctors/${doctorId}` : "/doctors"}
        >
          İptal
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Kaydediliyor..." : mode === "create" ? "Doktor Oluştur" : "Kaydet"}
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
  type = "text",
  value,
}: {
  errors: DoctorFieldErrors;
  id: keyof DoctorFormInput;
  inputClass: string;
  label: string;
  maxLength: number;
  name: string;
  required?: boolean;
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
        autoComplete={id === "firstName" ? "given-name" : id === "lastName" ? "family-name" : undefined}
        className={inputClass}
        defaultValue={value}
        id={id}
        maxLength={maxLength}
        name={name}
        required={required}
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
