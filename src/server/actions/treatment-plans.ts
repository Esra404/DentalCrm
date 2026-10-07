"use server";


import { Prisma, Role } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { sumPlanItems } from "@/lib/finance/decimal";
import { getChangedFields } from "@/lib/audit/changed-fields";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import {
  TREATMENT_PLAN_ID_PATTERN,
  treatmentPlanInputFromFormData,
  validateTreatmentPlanInput,
  type TreatmentPlanActionState,
  type ValidatedTreatmentPlanInput,
} from "@/lib/validations/treatment-plan";

const treatmentPlanRoles = [Role.ADMIN, Role.STAFF, Role.DOCTOR] as const;

function readTreatmentPlanId(formData: FormData): string | null {
  const value = formData.get("treatmentPlanId");
  return typeof value === "string" && TREATMENT_PLAN_ID_PATTERN.test(value)
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

class PlanRuleError extends Error {
  constructor(message: string) {
    super(message);
  }
}

async function writePlan(
  data: ValidatedTreatmentPlanInput,
  planId: string | null,
  userId: string,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const current = planId
        ? await tx.treatmentPlan.findUnique({
            where: { id: planId },
            include: { items: true },
          })
        : null;
      if (planId && !current) throw new PlanRuleError("Tedavi planı bulunamadı.");

      const patient = await tx.patient.findUnique({
        where: { id: data.patientId },
        select: { id: true, isActive: true },
      });
      if (!patient) throw new PlanRuleError("Hasta kaydı bulunamadı.");
      if (!patient.isActive && patient.id !== current?.patientId) {
        throw new PlanRuleError("Yeni planda yalnızca aktif hasta seçilebilir.");
      }
      if (current && patient.id !== current.patientId) {
        throw new PlanRuleError("Tedavi planı başka bir hastaya aktarılamaz.");
      }

      const existingById = new Map(
        (current?.items ?? []).map((item) => [item.id, item]),
      );
      const submittedItemIds = new Set<string>();
      const resolvedItems: {
        itemId?: string;
        treatmentId: string;
        treatmentName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        currency: string;
      }[] = [];

      for (const item of data.items) {
        if (item.itemId) {
          const existing = existingById.get(item.itemId);
          if (!existing || existing.treatmentId !== item.treatmentId) {
            throw new PlanRuleError("Plan kalemi artık geçerli değil. Yenileyip tekrar deneyin.");
          }
          submittedItemIds.add(existing.id);
          resolvedItems.push({
            itemId: existing.id,
            treatmentId: existing.treatmentId,
            treatmentName: existing.treatmentName,
            quantity: item.quantity,
            unitPrice: existing.unitPrice,
            currency: current?.currency ?? "TRY",
          });
          continue;
        }

        const treatment = await tx.treatment.findUnique({
          where: { id: item.treatmentId },
          select: {
            id: true,
            name: true,
            defaultPrice: true,
            currency: true,
            isActive: true,
          },
        });
        if (!treatment) throw new PlanRuleError("Seçilen tedavi bulunamadı.");
        if (!treatment.isActive) {
          throw new PlanRuleError("Yeni plan kalemlerinde yalnızca aktif tedavi seçilebilir.");
        }
        resolvedItems.push({
          treatmentId: treatment.id,
          treatmentName: treatment.name,
          quantity: item.quantity,
          unitPrice: treatment.defaultPrice,
          currency: treatment.currency.trim(),
        });
      }

      const currency = current?.currency ?? resolvedItems[0]?.currency;
      if (!currency || resolvedItems.some((item) => item.currency !== currency)) {
        throw new PlanRuleError("Bir tedavi planındaki kalemlerin para birimi aynı olmalıdır.");
      }
      const total = sumPlanItems(resolvedItems);

      if (current) {
        const changed = getChangedFields(
          {
            startsAt: current.startsAt,
            endsAt: current.endsAt,
            status: current.status,
          },
          {
            startsAt: data.startsAt,
            endsAt: data.endsAt,
            status: data.status,
          },
        );
        const currentItems = current.items
          .map((item) => `${item.id}:${item.quantity}`)
          .sort();
        const nextItems = resolvedItems
          .map((item) => `${item.itemId ?? `new:${item.treatmentId}`}:${item.quantity}`)
          .sort();
        if (
          currentItems.length !== nextItems.length ||
          currentItems.some((item, index) => item !== nextItems[index])
        ) {
          changed.push("items");
        }
        await tx.treatmentPlan.updateMany({
          where: { id: current.id },
          data: {
            startsAt: data.startsAt,
            endsAt: data.endsAt,
            status: data.status,
            updatedAt: new Date(),
          },
        });
        const paid = await tx.payment.aggregate({
          where: { treatmentPlanId: current.id },
          _sum: { amount: true },
        });
        const paidTotal = paid._sum.amount ?? new Prisma.Decimal(0);
        if (total.lt(paidTotal)) {
          throw new PlanRuleError(
            "Plan toplamı mevcut ödemelerin toplamından düşük olamaz.",
          );
        }

        const removedIds = current.items
          .filter((item) => !submittedItemIds.has(item.id))
          .map((item) => item.id);
        if (removedIds.length > 0) {
          await tx.treatmentPlanItem.deleteMany({
            where: { treatmentPlanId: current.id, id: { in: removedIds } },
          });
        }
        for (const item of resolvedItems) {
          if (item.itemId) {
            await tx.treatmentPlanItem.update({
              where: { id: item.itemId },
              data: { quantity: item.quantity },
            });
          } else {
            await tx.treatmentPlanItem.create({
              data: {
                treatmentPlanId: current.id,
                treatmentId: item.treatmentId,
                treatmentName: item.treatmentName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              },
            });
          }
        }
        if (changed.length > 0) {
          await writeAuditLog(tx, {
            userId,
            action: "TREATMENT_PLAN_UPDATED",
            entity: "TreatmentPlan",
            entityId: current.id,
            metadata: { changedFields: changed },
          });
        }
        return;
      }

      const plan = await tx.treatmentPlan.create({
        data: {
          patientId: patient.id,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          status: data.status,
          currency,
          items: {
            create: resolvedItems.map((item) => ({
              treatmentId: item.treatmentId,
              treatmentName: item.treatmentName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        select: { id: true },
      });
      await writeAuditLog(tx, {
        userId,
        action: "TREATMENT_PLAN_CREATED",
        entity: "TreatmentPlan",
        entityId: plan.id,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function mutateTreatmentPlan(
  formData: FormData,
  planId: string | null,
): Promise<TreatmentPlanActionState> {
  const user = await requireRoles(...treatmentPlanRoles);
  const validation = validateTreatmentPlanInput(
    treatmentPlanInputFromFormData(formData),
  );
  if (!validation.success) {
    return {
      message: "Lütfen plan bilgilerini kontrol edin.",
      fieldErrors: validation.errors,
    };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await writePlan(validation.data, planId, user.id);
      break;
    } catch (error) {
      if (error instanceof PlanRuleError) return { message: error.message };
      if (isPrismaError(error, "P2034") && attempt < 2) continue;
      if (isPrismaError(error, "P2034")) {
        return { message: "Plan aynı anda değiştirildi. Lütfen yeniden deneyin." };
      }
      if (isPrismaError(error, "P2025") && planId) {
        return { message: "Tedavi planı bulunamadı." };
      }
      console.error("Tedavi planı kaydedilemedi.", error);
      return { message: "Tedavi planı kaydedilirken bir hata oluştu." };
    }
  }

  revalidatePath("/treatment-plans");
  if (planId) {
    revalidatePath(`/treatment-plans/${planId}`);
    redirect(`/treatment-plans/${planId}`);
  }
  redirect("/treatment-plans?created=1");
}

export async function createTreatmentPlanAction(
  _previousState: TreatmentPlanActionState,
  formData: FormData,
): Promise<TreatmentPlanActionState> {
  return mutateTreatmentPlan(formData, null);
}

export async function updateTreatmentPlanAction(
  _previousState: TreatmentPlanActionState,
  formData: FormData,
): Promise<TreatmentPlanActionState> {
  const planId = readTreatmentPlanId(formData);
  if (!planId) return { message: "Tedavi planı bulunamadı." };
  return mutateTreatmentPlan(formData, planId);
}
