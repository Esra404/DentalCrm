import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { TreatmentForm } from "@/components/treatments/treatment-form";
import { requireRoles } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { TREATMENT_ID_PATTERN } from "@/lib/validations/treatment";

export default async function EditTreatmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id } = await params;
  if (!TREATMENT_ID_PATTERN.test(id)) notFound();
  const treatment = await prisma.treatment.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      defaultPrice: true,
      currency: true,
    },
  });
  if (!treatment) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[var(--line)] pb-5">
        <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatments/${treatment.id}`}>
          <ArrowLeft aria-hidden="true" size={16} />
          Tedavi detayına dön
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Tedavi Yönetimi</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Tedavi Bilgilerini Düzenle</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{treatment.name}</p>
      </header>
      <section className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <TreatmentForm
          initialValues={{
            name: treatment.name,
            description: treatment.description ?? "",
            defaultPrice: treatment.defaultPrice.toString(),
            currency: treatment.currency,
          }}
          mode="edit"
          treatmentId={treatment.id}
        />
      </section>
    </div>
  );
}
