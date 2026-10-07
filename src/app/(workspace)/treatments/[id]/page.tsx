import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Activity, Pencil } from "lucide-react";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { TREATMENT_ID_PATTERN } from "@/lib/validations/treatment";
import { setTreatmentActiveAction } from "@/server/actions/treatments";
import { requireRoles } from "@/lib/auth/authorization";

export default async function TreatmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id } = await params;
  const query = await searchParams;
  if (!TREATMENT_ID_PATTERN.test(id)) notFound();

  const treatment = await prisma.treatment.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      defaultPrice: true,
      currency: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!treatment) notFound();

  const price = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(treatment.defaultPrice));
  const createdAt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(treatment.createdAt);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/treatments">
            <ArrowLeft aria-hidden="true" size={16} />
            Tedavilere dön
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Tedavi Kaydı</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--ink)]">{treatment.name}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${treatment.isActive ? "bg-[#e8f3ed] text-[#28634f]" : "bg-[#edf0ef] text-[#5f6e68]"}`}>{treatment.isActive ? "Aktif" : "Pasif"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatments/${treatment.id}/edit`}><Pencil aria-hidden="true" size={16} />Düzenle</Link>
          <form action={setTreatmentActiveAction}>
            <input name="treatmentId" type="hidden" value={treatment.id} />
            <input name="active" type="hidden" value={String(!treatment.isActive)} />
            <button className="inline-flex min-h-10 items-center rounded-md border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" type="submit">{treatment.isActive ? "Pasifleştir" : "Aktifleştir"}</button>
          </form>
        </div>
      </header>
      {query.error === "update" ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">Tedavi durumu güncellenirken bir hata oluştu.</p> : null}
      <section aria-labelledby="treatment-details-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
          <span className="flex size-10 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Activity aria-hidden="true" size={20} /></span>
          <div><h2 className="text-base font-semibold text-[var(--ink)]" id="treatment-details-title">Tedavi Bilgileri</h2><p className="text-xs text-[var(--muted)]">Kayıt tarihi: {createdAt}</p></div>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail label="Tedavi Adı" value={treatment.name} />
          <Detail label="Birim Fiyat" value={`${price} ${treatment.currency}`} />
          <Detail label="Durum" value={treatment.isActive ? "Aktif" : "Pasif"} />
          <Detail label="Kayıt Tarihi" value={createdAt} />
          <div className="sm:col-span-2"><Detail label="Açıklama" value={treatment.description || "Açıklama bulunmuyor."} /></div>
        </dl>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-medium text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[var(--ink)]">{value}</dd></div>;
}
