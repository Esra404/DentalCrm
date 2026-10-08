"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createUserAction } from "@/server/actions/users";
import type {
  CreateUserActionState,
  CreateUserFieldErrors,
} from "@/lib/validations/user";

const initialState: CreateUserActionState = {};
const inputClass =
  "min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);
  const [role, setRole] = useState("STAFF");
  const errors: CreateUserFieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field errors={errors} id="firstName" label="Ad" maxLength={100} required />
        <Field errors={errors} id="lastName" label="Soyad" maxLength={100} required />
        <Field errors={errors} id="email" label="E-posta" maxLength={320} required type="email" />
        <Field
          errors={errors}
          id="password"
          label="Geçici şifre"
          minLength={12}
          required
          type="password"
        />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--ink)]">
          Rol
          <select
            className={inputClass}
            name="role"
            onChange={(event) => setRole(event.target.value)}
            value={role}
          >
            <option value="DOCTOR">Doktor</option>
            <option value="STAFF">Çalışan</option>
          </select>
          {errors.role ? <FieldError>{errors.role}</FieldError> : null}
        </label>
        {role === "DOCTOR" ? (
          <Field
            errors={errors}
            id="specialty"
            label="Uzmanlık (isteğe bağlı)"
            maxLength={120}
          />
        ) : null}
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">
        Şifre en az 12 bayt olmalıdır. Yeni kullanıcı ilk girişinde bu şifreyi kullanır.
      </p>
      {state.message ? (
        <p aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href="/users"
        >
          İptal
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
        </button>
      </div>
    </form>
  );
}

function Field({
  errors,
  id,
  label,
  maxLength,
  minLength,
  required,
  type = "text",
}: {
  errors: CreateUserFieldErrors;
  id: keyof CreateUserFieldErrors;
  label: string;
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--ink)]" htmlFor={id}>
      {label}
      <input
        autoComplete={id === "password" ? "new-password" : id === "email" ? "email" : "off"}
        className={inputClass}
        id={id}
        maxLength={maxLength}
        minLength={minLength}
        name={id}
        required={required}
        type={type}
      />
      {errors[id] ? <FieldError>{errors[id]}</FieldError> : null}
    </label>
  );
}

function FieldError({ children }: { children: string }) {
  return <span className="text-xs font-normal text-red-700">{children}</span>;
}
