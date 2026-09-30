"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import type { LoginActionState } from "@/lib/validations/auth";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium">
        E-posta
        <input
          autoComplete="username"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Şifre
        <input
          autoComplete="current-password"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          name="password"
          required
          type="password"
        />
      </label>
      {state.error ? (
        <p aria-live="polite" className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        className="rounded bg-teal-800 px-4 py-2.5 font-medium text-white hover:bg-teal-900 disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}