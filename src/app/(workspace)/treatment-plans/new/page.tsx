import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { TreatmentPlanForm } from "@/components/treatment-plans/treatment-plan-form";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";

export default async function NewTreatmentPlanPage() {
  await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const [patients, treatments] = await Promise.all([
    prisma.patient.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.treatment.findMany({
      where: { isActive: true },
      select: { id: true, name: true, defaultPrice: true, currency: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/treatment-plans">
          <ArrowLeft aria-hidden="true" size={16} />
          Tedavi planlarına dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Plan Yönetimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Yeni Tedavi Planı</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Hasta, plan tarihleri ve tedavi kalemlerini belirleyin.</p>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        {patients.length === 0 || treatments.length === 0 ? (
          <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            Plan oluşturmak için en az bir aktif hasta ve aktif tedavi kaydı bulunmalıdır.
          </p>
        ) : null}
        <TreatmentPlanForm
          mode="create"
          patients={patients.map((patient) => ({
            id: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
            isActive: true,
          }))}
          treatments={treatments.map((treatment) => ({
            id: treatment.id,
            name: treatment.name,
            price: treatment.defaultPrice.toString(),
            currency: treatment.currency.trim(),
            isActive: true,
          }))}
        />
      </section>
    </div>
  );
}
