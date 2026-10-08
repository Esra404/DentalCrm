"use client";

import { useActionState } from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import type { LoginActionState } from "@/lib/validations/auth";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium">
        E-posta
        <input
          autoComplete="email"
          className="min-h-12 rounded-md border border-[var(--line)] bg-white px-3.5 py-2.5 text-base text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Şifre
        <span className="relative block">
          <input
            autoComplete="current-password"
            className="min-h-12 w-full rounded-md border border-[var(--line)] bg-white px-3.5 py-2.5 pr-12 text-base text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </button>
        </span>
      </label>
      {state.error ? (
        <p aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        className="min-h-12 rounded-md bg-[var(--accent-strong)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
      <div className="text-center">
        <button
          aria-controls="password-help"
          aria-expanded={showPasswordHelp}
          className="text-sm font-medium text-[var(--accent-strong)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          onClick={() => setShowPasswordHelp((visible) => !visible)}
          type="button"
        >
          Şifremi unuttum
        </button>
        {showPasswordHelp ? (
          <p className="mt-2 text-sm leading-5 text-[var(--muted)]" id="password-help">
            Şifrenizi yenilemek için klinik yöneticinizle iletişime geçin.
          </p>
        ) : null}
      </div>
    </form>
  );
}