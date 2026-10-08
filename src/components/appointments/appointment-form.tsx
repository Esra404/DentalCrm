"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { AppointmentStatus } from "@/generated/prisma/enums";
import {
  APPOINTMENT_STATUS_LABELS,
  appointmentInputFromFormData,
  validateAppointmentInput,
  type AppointmentActionState,
  type AppointmentFieldErrors,
  type AppointmentFormInput,
} from "@/lib/validations/appointment";
import {
  createAppointmentAction,
  updateAppointmentAction,
} from "@/server/actions/appointments";

export type AppointmentOption = {
  id: string;
  label: string;
  isActive: boolean;
  doctorId?: string | null;
};

type AppointmentFormProps = {
  mode: "create" | "edit";
  appointmentId?: string;
  initialValues?: AppointmentFormInput;
  patients: AppointmentOption[];
  doctors: AppointmentOption[];
  treatments: AppointmentOption[];
};

const emptyValues: AppointmentFormInput = {
  patientId: "",
  doctorId: "",
  treatmentId: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  status: AppointmentStatus.SCHEDULED,
  note: "",
};

const initialState: AppointmentActionState = {};
const inputClass =
  "min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

export function AppointmentForm({
  mode,
  appointmentId,
  initialValues,
  patients,
  doctors,
  treatments,
}: AppointmentFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createAppointmentAction : updateAppointmentAction,
    initialState,
  );
  const values = initialValues ?? emptyValues;
  const [clientErrors, setClientErrors] = useState<AppointmentFieldErrors>({});
  const [selectedPatientId, setSelectedPatientId] = useState(values.patientId);
  const errors = { ...state.fieldErrors, ...clientErrors };
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
  const assignedDoctorId = selectedPatient?.doctorId ?? "";
  const assignedDoctor = doctors.find((doctor) => doctor.id === assignedDoctorId);

  function validateOnClient(event: FormEvent<HTMLFormElement>) {
    const result = validateAppointmentInput(
      appointmentInputFromFormData(new FormData(event.currentTarget)),
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
      {mode === "edit" && appointmentId ? (
        <input name="appointmentId" type="hidden" value={appointmentId} />
      ) : null}
      <input name="doctorId" type="hidden" value={assignedDoctorId} />
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField
          error={errors.patientId}
          id="patientId"
          label="Hasta"
          options={patients}
          onChange={setSelectedPatientId}
          required
          value={values.patientId}
        />
        <div className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]">
          <span>Sorumlu Doktor</span>
          <span className="flex min-h-11 items-center rounded-md border border-[var(--line)] bg-[#f6f8f7] px-3 text-sm font-normal text-[var(--ink)]">
            {assignedDoctor?.label ?? "Seçilen hastaya atanmış aktif doktor yok."}
          </span>
          {errors.doctorId ? <span className="text-sm font-normal text-red-700" role="alert">{errors.doctorId}</span> : null}
        </div>
        <SelectField
          error={errors.treatmentId}
          id="treatmentId"
          label="Tedavi"
          options={treatments}
          required
          value={values.treatmentId}
        />
        <SelectField
          error={errors.status}
          id="status"
          label="Durum"
          options={Object.values(AppointmentStatus).map((status) => ({
            id: status,
            label: APPOINTMENT_STATUS_LABELS[status],
            isActive: true,
          }))}
          required
          value={values.status}
        />
        <Field
          error={errors.startDate}
          id="startDate"
          label="Başlangıç Tarihi"
          required
          type="date"
          value={values.startDate}
        />
        <Field
          error={errors.startTime}
          id="startTime"
          label="Başlangıç Saati"
          required
          type="time"
          value={values.startTime}
        />
        <Field
          error={errors.endDate}
          id="endDate"
          label="Bitiş Tarihi"
          required
          type="date"
          value={values.endDate}
        />
        <Field
          error={errors.endTime}
          id="endTime"
          label="Bitiş Saati"
          required
          type="time"
          value={values.endTime}
        />
        <label
          className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)] md:col-span-2"
          htmlFor="note"
        >
          Not
          <textarea
            aria-describedby={errors.note ? "note-error" : undefined}
            aria-invalid={Boolean(errors.note)}
            className={`${inputClass} min-h-24 resize-y`}
            defaultValue={values.note}
            id="note"
            maxLength={10000}
            name="note"
            rows={3}
          />
          {errors.note ? (
            <span className="text-sm font-normal text-red-700" id="note-error" role="alert">
              {errors.note}
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
          href={mode === "edit" && appointmentId ? `/appointments/${appointmentId}` : "/appointments"}
        >
          İptal
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Kaydediliyor..." : mode === "create" ? "Randevu Oluştur" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}

function SelectField({
  error,
  id,
  label,
  options,
  required,
  value,
  onChange,
}: {
  error?: string;
  id: string;
  label: string;
  options: AppointmentOption[];
  required?: boolean;
  value: string;
  onChange?: (value: string) => void;
}) {
  const errorId = `${id}-error`;

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor={id}>
      {label}{required ? <span aria-hidden="true" className="text-red-700"> *</span> : null}
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={inputClass}
        defaultValue={value}
        id={id}
        name={id}
        onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
        required={required}
      >
        <option value="">Seçiniz</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}{option.isActive ? "" : " (Pasif - mevcut kayıt)"}
          </option>
        ))}
      </select>
      {error ? <span className="text-sm font-normal text-red-700" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}

function Field({
  error,
  id,
  label,
  required,
  type,
  value,
}: {
  error?: string;
  id: keyof AppointmentFormInput;
  label: string;
  required?: boolean;
  type: string;
  value: string;
}) {
  const errorId = `${id}-error`;

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor={id}>
      {label}{required ? <span aria-hidden="true" className="text-red-700"> *</span> : null}
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={inputClass}
        defaultValue={value}
        id={id}
        name={id}
        required={required}
        type={type}
      />
      {error ? <span className="text-sm font-normal text-red-700" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}
