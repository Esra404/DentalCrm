"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
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
  searchAppointmentPatients,
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
  const errors = { ...state.fieldErrors, ...clientErrors };
  const [selectedPatient, setSelectedPatient] = useState<AppointmentOption | null>(
    () => patients.find((patient) => patient.id === values.patientId) ?? null,
  );
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
        <PatientCombobox
          error={errors.patientId}
          initialPatient={selectedPatient}
          onSelect={setSelectedPatient}
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

function PatientCombobox({
  error,
  initialPatient,
  onSelect,
}: {
  error?: string;
  initialPatient: AppointmentOption | null;
  onSelect: (patient: AppointmentOption | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedPatient, setSelectedPatient] = useState(initialPatient);
  const [query, setQuery] = useState(initialPatient?.label ?? "");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<AppointmentOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const errorId = "patientId-error";

  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) return;

    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setFailed(false);
      void searchAppointmentPatients(term)
        .then((patients) => {
          if (active) setResults(patients);
        })
        .catch((error: unknown) => {
          console.error("Randevu hastaları aranamadı.", error);
          if (active) {
            setResults([]);
            setFailed(true);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  function selectPatient(patient: AppointmentOption) {
    setSelectedPatient(patient);
    setQuery(patient.label);
    setSearchTerm("");
    setResults([]);
    setOpen(false);
    setLoading(false);
    onSelect(patient);
  }

  function clearSelection() {
    setSelectedPatient(null);
    setQuery("");
    setSearchTerm("");
    setResults([]);
    setOpen(false);
    setLoading(false);
    onSelect(null);
    inputRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm font-medium text-[var(--ink)]">
      <label htmlFor="patientId">
        Hasta <span aria-hidden="true" className="text-red-700"> *</span>
      </label>
      <div className="relative min-w-0">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]"
          size={17}
        />
        <input
          aria-autocomplete="list"
          aria-controls="appointment-patient-options"
          aria-describedby={error ? errorId : undefined}
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          className={`${inputClass} min-w-0 pl-10 ${selectedPatient ? "pr-11" : ""}`}
          id="patientId"
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setSelectedPatient(null);
            setQuery(nextQuery);
            setSearchTerm(nextQuery);
            setOpen(Boolean(nextQuery.trim()));
            setResults([]);
            setLoading(Boolean(nextQuery.trim()));
            setFailed(false);
            onSelect(null);
          }}
          onFocus={() => {
            if (searchTerm.trim()) setOpen(true);
          }}
          placeholder="Hasta adı, soyadı, telefon veya e-posta..."
          ref={inputRef}
          role="combobox"
          type="search"
          value={query}
        />
        <input name="patientId" type="hidden" value={selectedPatient?.id ?? ""} />
        {selectedPatient ? (
          <button
            aria-label="Hasta seçimini temizle"
            className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            onClick={clearSelection}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        ) : null}
        {open ? (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-[var(--line)] bg-white py-1 shadow-lg"
            id="appointment-patient-options"
            role="listbox"
          >
            {loading ? (
              <p className="px-3 py-2 text-sm font-normal text-[var(--muted)]" role="status">Hastalar aranıyor...</p>
            ) : failed ? (
              <p className="px-3 py-2 text-sm font-normal text-red-700" role="alert">Hasta araması yapılamadı. Lütfen tekrar deneyin.</p>
            ) : results.length ? (
              results.map((patient) => (
                <button
                  aria-selected={false}
                  className="block w-full break-words px-3 py-2 text-left text-sm font-normal text-[var(--ink)] hover:bg-[var(--accent-soft)] focus:bg-[var(--accent-soft)] focus:outline-none"
                  key={patient.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectPatient(patient)}
                  role="option"
                  type="button"
                >
                  {patient.label}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm font-normal text-[var(--muted)]" role="status">Sonuç bulunamadı.</p>
            )}
          </div>
        ) : null}
      </div>
      {error ? <span className="text-sm font-normal text-red-700" id={errorId} role="alert">{error}</span> : null}
    </div>
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
