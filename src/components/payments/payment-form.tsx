"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { PaymentMethod } from "@/generated/prisma/enums";
import {
  createPaymentAction,
  updatePaymentAction,
} from "@/server/actions/payments";
import {
  PAYMENT_METHOD_LABELS,
  paymentInputFromFormData,
  paymentDateInputValue,
  validatePaymentInput,
  type PaymentActionState,
  type PaymentFieldErrors,
  type PaymentFormInput,
} from "@/lib/validations/payment";

export type PaymentPlanOption = {
  id: string;
  label: string;
  total: string;
  currency: string;
};

type PaymentFormProps = {
  mode: "create" | "edit";
  paymentId?: string;
  initialValues?: PaymentFormInput;
  plans: PaymentPlanOption[];
};

const initialState: PaymentActionState = {};
const inputClass =
  "min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

export function PaymentForm({
  mode,
  paymentId,
  initialValues,
  plans,
}: PaymentFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createPaymentAction : updatePaymentAction,
    initialState,
  );
  const [clientErrors, setClientErrors] = useState<PaymentFieldErrors>({});
  const errors = { ...state.fieldErrors, ...clientErrors };
  const values = initialValues ?? {
    treatmentPlanId: "",
    amount: "",
    method: PaymentMethod.CASH,
    paidAt: paymentDateInputValue(new Date()),
  };

  function validateOnClient(event: FormEvent<HTMLFormElement>) {
    const result = validatePaymentInput(
      paymentInputFromFormData(new FormData(event.currentTarget)),
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
      {mode === "edit" && paymentId ? (
        <input name="paymentId" type="hidden" value={paymentId} />
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="treatmentPlanId">
          Hasta / Tedavi Planı <span aria-hidden="true" className="text-red-700">*</span>
          <select
            aria-describedby={errors.treatmentPlanId ? "treatmentPlanId-error" : undefined}
            aria-invalid={Boolean(errors.treatmentPlanId)}
            className={inputClass}
            defaultValue={values.treatmentPlanId}
            id="treatmentPlanId"
            name="treatmentPlanId"
            required
          >
            <option value="">Plan seçin</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.label} · {plan.total} {plan.currency}
              </option>
            ))}
          </select>
          {errors.treatmentPlanId ? <FieldError id="treatmentPlanId-error" message={errors.treatmentPlanId} /> : null}
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="amount">
          Ödeme Tutarı <span aria-hidden="true" className="text-red-700">*</span>
          <input
            aria-describedby={errors.amount ? "amount-error" : "amount-hint"}
            aria-invalid={Boolean(errors.amount)}
            className={inputClass}
            defaultValue={values.amount}
            id="amount"
            max="9999999999.99"
            min="0.01"
            name="amount"
            required
            step="0.01"
            type="number"
          />
          <span className="text-xs font-normal text-[var(--muted)]" id="amount-hint">Kalan borç sunucuda yeniden doğrulanır.</span>
          {errors.amount ? <FieldError id="amount-error" message={errors.amount} /> : null}
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="method">
          Ödeme Yöntemi <span aria-hidden="true" className="text-red-700">*</span>
          <select
            aria-describedby={errors.method ? "method-error" : undefined}
            aria-invalid={Boolean(errors.method)}
            className={inputClass}
            defaultValue={values.method}
            id="method"
            name="method"
            required
          >
            {Object.values(PaymentMethod).map((method) => (
              <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>
            ))}
          </select>
          {errors.method ? <FieldError id="method-error" message={errors.method} /> : null}
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="paidAt">
          Ödeme Tarihi <span aria-hidden="true" className="text-red-700">*</span>
          <input
            aria-describedby={errors.paidAt ? "paidAt-error" : undefined}
            aria-invalid={Boolean(errors.paidAt)}
            className={inputClass}
            defaultValue={values.paidAt}
            id="paidAt"
            name="paidAt"
            required
            type="date"
          />
          {errors.paidAt ? <FieldError id="paidAt-error" message={errors.paidAt} /> : null}
        </label>
      </div>
      {state.message ? <p aria-live="polite" className="text-sm text-red-700" role="alert">{state.message}</p> : null}
      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          href={mode === "edit" && paymentId ? `/payments/${paymentId}` : "/payments"}
        >
          İptal
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Kaydediliyor..." : mode === "create" ? "Ödeme Oluştur" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <span className="text-sm font-normal text-red-700" id={id} role="alert">{message}</span>;
}
