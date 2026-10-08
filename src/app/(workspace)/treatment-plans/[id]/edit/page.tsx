import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { TreatmentPlanForm } from "@/components/treatment-plans/treatment-plan-form";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { getActiveDoctorId } from "@/lib/auth/doctor-access";
import { TREATMENT_PLAN_ID_PATTERN } from "@/lib/validations/treatment-plan";

function formatDate(value: Date | null): string {
  return value?.toISOString().slice(0, 10) ?? "";
}

export default async function EditTreatmentPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id } = await params;
  if (!TREATMENT_PLAN_ID_PATTERN.test(id)) notFound();

  const doctorId =
    user.role === Role.DOCTOR ? await getActiveDoctorId(user.id) : null;
  const plan = await prisma.treatmentPlan.findFirst({
    where: {
      id,
      ...(user.role === Role.DOCTOR
        ? {
            patient: {
              doctorId: doctorId ?? "00000000-0000-0000-0000-000000000000",
            },
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, isActive: true } },
      items: {
        include: {
          treatment: { select: { id: true, isActive: true } },
          patientTooth: { select: { toothNumber: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!plan) notFound();

  const [activePatients, activeTreatments] = await Promise.all([
    prisma.patient.findMany({
      where: {
        isActive: true,
        ...(user.role === Role.DOCTOR
          ? {
              doctorId: doctorId ?? "00000000-0000-0000-0000-000000000000",
            }
          : {}),
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.treatment.findMany({
      where: { isActive: true },
      select: { id: true, name: true, defaultPrice: true, currency: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const patients = activePatients.map((patient) => ({
    id: patient.id,
    name: `${patient.firstName} ${patient.lastName}`,
    isActive: true,
  }));
  if (!plan.patient.isActive) {
    patients.push({
      id: plan.patient.id,
      name: `${plan.patient.firstName} ${plan.patient.lastName}`,
      isActive: false,
    });
  }

  const treatments = activeTreatments.map((treatment) => ({
    id: treatment.id,
    name: treatment.name,
    price: treatment.defaultPrice.toString(),
    currency: treatment.currency.trim(),
    isActive: true,
  }));
  for (const item of plan.items) {
    if (
      !item.treatment.isActive &&
      !treatments.some((treatment) => treatment.id === item.treatmentId)
    ) {
      treatments.push({
        id: item.treatmentId,
        name: item.treatmentName,
        price: item.unitPrice.toString(),
        currency: plan.currency,
        isActive: false,
      });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatment-plans/${plan.id}`}>
          <ArrowLeft aria-hidden="true" size={16} />
          Plan detayına dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Plan Yönetimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Tedavi Planını Düzenle</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{plan.patient.firstName} {plan.patient.lastName}</p>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <TreatmentPlanForm
          endsAt={formatDate(plan.endsAt)}
          items={plan.items.map((item) => ({
            itemId: item.id,
            treatmentId: item.treatmentId,
            quantity: item.quantity,
            toothNumber: item.patientTooth?.toothNumber ?? null,
            treatmentName: item.treatmentName,
            unitPrice: item.unitPrice.toString(),
            currency: plan.currency,
          }))}
          mode="edit"
          patientId={plan.patientId}
          patients={patients}
          planId={plan.id}
          startsAt={formatDate(plan.startsAt)}
          status={plan.status}
          treatments={treatments}
        />
      </section>
    </div>
  );
}
