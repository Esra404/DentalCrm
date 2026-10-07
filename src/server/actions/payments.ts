"use server";

import { Prisma } from "@/generated/prisma/client";
import { PaymentMethod, Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { sumPlanItems } from "@/lib/finance/decimal";
import { getChangedFields } from "@/lib/audit/changed-fields";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import {
  PAYMENT_ID_PATTERN,
  paymentInputFromFormData,
  validatePaymentInput,
  type PaymentActionState,
  type ValidatedPaymentInput,
} from "@/lib/validations/payment";

const paymentRoles = [Role.ADMIN, Role.STAFF] as const;

function readPaymentId(formData: FormData): string | null {
  const value = formData.get("paymentId");
  return typeof value === "string" && PAYMENT_ID_PATTERN.test(value)
    ? value
    : null;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

class PaymentRuleError extends Error {}

async function savePayment(
  data: ValidatedPaymentInput,
  paymentId: string | null,
  userId: string,
): Promise<void> {
  const amount = new Prisma.Decimal(data.amount);
  await prisma.$transaction(
    async (tx) => {
      const current = paymentId
        ? await tx.payment.findUnique({
            where: { id: paymentId },
            select: {
              id: true,
              treatmentPlanId: true,
              amount: true,
              method: true,
              paidAt: true,
            },
          })
        : null;
      if (paymentId && !current) {
        throw new PaymentRuleError("Ödeme kaydı bulunamadı.");
      }

      const planIds = [
        ...new Set(
          [current?.treatmentPlanId, data.treatmentPlanId].filter(
            (id): id is string => Boolean(id),
          ),
        ),
      ].sort();
      for (const treatmentPlanId of planIds) {
        const locked = await tx.treatmentPlan.updateMany({
          where: { id: treatmentPlanId },
          data: { updatedAt: new Date() },
        });
        if (locked.count !== 1) {
          throw new PaymentRuleError("Tedavi planı bulunamadı.");
        }
      }

      const plan = await tx.treatmentPlan.findUnique({
        where: { id: data.treatmentPlanId },
        select: {
          id: true,
          currency: true,
          items: { select: { quantity: true, unitPrice: true } },
        },
      });
      if (!plan) throw new PaymentRuleError("Tedavi planı bulunamadı.");

      const planTotal = sumPlanItems(plan.items);
      const otherPayments = await tx.payment.aggregate({
        where: {
          treatmentPlanId: plan.id,
          ...(paymentId ? { id: { not: paymentId } } : {}),
        },
        _sum: { amount: true },
      });
      const paidWithoutThisPayment =
        otherPayments._sum.amount ?? new Prisma.Decimal(0);
      const remaining = planTotal.minus(paidWithoutThisPayment);
      if (amount.gt(remaining)) {
        throw new PaymentRuleError(
          `Ödeme tutarı kalan ${new Intl.NumberFormat("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(remaining.toNumber())} ${plan.currency} tutarını aşamaz.`,
        );
      }

      if (paymentId) {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            treatmentPlanId: plan.id,
            amount,
            method: data.method,
            paidAt: data.paidAt,
          },
          select: { id: true },
        });
        if (current) {
          const changed = getChangedFields(current, {
            treatmentPlanId: plan.id,
            amount,
            method: data.method,
            paidAt: data.paidAt,
          });
          if (changed.length > 0) {
            await writeAuditLog(tx, {
              userId,
              action: "PAYMENT_UPDATED",
              entity: "Payment",
              entityId: current.id,
              metadata: { changedFields: changed },
            });
          }
        }
      } else {
        const payment = await tx.payment.create({
          data: {
            treatmentPlanId: plan.id,
            amount,
            method: data.method,
            paidAt: data.paidAt,
          },
          select: { id: true },
        });
        await writeAuditLog(tx, {
          userId,
          action: "PAYMENT_CREATED",
          entity: "Payment",
          entityId: payment.id,
          metadata: { treatmentPlanId: plan.id },
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function mutatePayment(
  formData: FormData,
  paymentId: string | null,
): Promise<PaymentActionState> {
  const user = await requireRoles(...paymentRoles);
  const validation = validatePaymentInput(paymentInputFromFormData(formData));
  if (!validation.success) {
    return {
      message: "Lütfen ödeme bilgilerini kontrol edin.",
      fieldErrors: validation.errors,
    };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await savePayment(validation.data, paymentId, user.id);
      break;
    } catch (error) {
      if (error instanceof PaymentRuleError) return { message: error.message };
      if (isPrismaError(error, "P2034") && attempt < 2) continue;
      if (isPrismaError(error, "P2034")) {
        return { message: "Ödeme aynı anda değiştirildi. Lütfen yeniden deneyin." };
      }
      if (isPrismaError(error, "P2025") && paymentId) {
        return { message: "Ödeme kaydı bulunamadı." };
      }
      if (!Object.values(PaymentMethod).includes(validation.data.method)) {
        return { message: "Geçerli bir ödeme yöntemi seçin." };
      }
      console.error("Ödeme kaydedilemedi.", error);
      return { message: "Ödeme kaydedilirken bir hata oluştu." };
    }
  }

  revalidatePath("/payments");
  revalidatePath("/treatment-plans");
  if (paymentId) {
    revalidatePath(`/payments/${paymentId}`);
    redirect(`/payments/${paymentId}`);
  }
  redirect("/payments?created=1");
}

export async function createPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  return mutatePayment(formData, null);
}

export async function updatePaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const paymentId = readPaymentId(formData);
  if (!paymentId) return { message: "Ödeme kaydı bulunamadı." };
  return mutatePayment(formData, paymentId);
}
