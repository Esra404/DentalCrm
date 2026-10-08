import Link from "next/link";
import { Eye, Plus, Trash2, UserRoundPen } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { TREATMENT_ID_PATTERN } from "@/lib/validations/treatment";
import { requireRoles } from "@/lib/auth/authorization";
import { deleteTreatmentAction, setTreatmentActiveAction } from "@/server/actions/treatments";
import { TreatmentSearchForm } from "@/components/treatments/treatment-search-form";
import { insensitiveSearchVariants } from "@/lib/search/patient-search";

const PAGE_SIZE = 25;
const TREATMENT_SELECT = {
  id: true,
  name: true,
  description: true,
  defaultPrice: true,
  currency: true,
  isActive: true,
} satisfies Prisma.TreatmentSelect;

function getValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    cursor?: string | string[];
    created?: string | string[];
    deleted?: string | string[];
    error?: string | string[];
  }>;
}) {
  await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const params = await searchParams;
  const query = getValue(params.q).trim().slice(0, 120);
  const rawCursor = getValue(params.cursor);
  const cursor = TREATMENT_ID_PATTERN.test(rawCursor) ? rawCursor : "";
  const where: Prisma.TreatmentWhereInput = query
    ? {
        OR: [
          ...insensitiveSearchVariants(query).flatMap((term) => [
            { name: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
          ]),
        ],
      }
    : {};

  let treatments: Prisma.TreatmentGetPayload<{ select: typeof TREATMENT_SELECT }>[] = [];
  let hasMore = false;
  let loadError = false;
  try {
    const validCursor = cursor
      ? await prisma.treatment.findUnique({ where: { id: cursor }, select: { id: true } })
      : null;
    const results = await prisma.treatment.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: PAGE_SIZE + 1,
      ...(validCursor ? { cursor: { id: validCursor.id }, skip: 1 } : {}),
      select: TREATMENT_SELECT,
    });
    hasMore = results.length > PAGE_SIZE;
    treatments = results.slice(0, PAGE_SIZE);
  } catch (error) {
    console.error("Tedavi listesi yüklenemedi.", error);
    loadError = true;
  }

  const nextCursor = hasMore ? treatments.at(-1)?.id : undefined;
  const nextParams = new URLSearchParams();
  if (query) nextParams.set("q", query);
  if (nextCursor) nextParams.set("cursor", nextCursor);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Klinik</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Tedaviler</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Klinikte sunulan tedavileri görüntüleyin ve yönetin.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto" href="/treatments/new">
          <Plus aria-hidden="true" size={17} />
          Yeni Tedavi
        </Link>
      </header>

      {getValue(params.created) === "1" ? <p className="rounded-md border border-[#c7ded6] bg-[#e9f4ef] px-4 py-3 text-sm text-[#245b50]">Tedavi kaydı oluşturuldu.</p> : null}
      {getValue(params.deleted) === "1" ? <p className="rounded-md border border-[#c7ded6] bg-[#e9f4ef] px-4 py-3 text-sm text-[#245b50]">Tedavi kaydı silindi.</p> : null}
      {getValue(params.error) === "invalid" ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">Tedavi işlemi tamamlanamadı. Lütfen tekrar deneyin.</p> : null}
      {getValue(params.error) === "used" ? <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">Randevularda veya tedavi planlarında kullanılan tedavi silinemez; kullanımını kapatmak için pasifleştirin.</p> : null}
      {getValue(params.error) === "delete" ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">Tedavi silinirken bir hata oluştu.</p> : null}

      <TreatmentSearchForm key={query} query={query} />

      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800" role="alert">Tedaviler yüklenirken bir hata oluştu.</p>
      ) : treatments.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-[var(--ink)]">{query ? "Aramanızla eşleşen tedavi bulunamadı." : "Henüz kayıtlı tedavi bulunmuyor."}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{query ? "Arama bilgilerini değiştirebilir veya temizleyebilirsiniz." : "İlk tedavi kaydını oluşturarak başlayın."}</p>
          {!query ? <Link className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/treatments/new"><Plus aria-hidden="true" size={16} />Yeni Tedavi</Link> : null}
        </section>
      ) : (
        <>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {treatments.map((treatment) => (
              <article className="flex min-w-0 flex-col rounded-md border border-[var(--line)] bg-white p-5" key={treatment.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link className="min-w-0 break-words text-base font-semibold text-[var(--ink)] underline-offset-4 hover:text-[var(--accent-strong)] hover:underline" href={`/treatments/${treatment.id}`}>
                    {treatment.name}
                  </Link>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${treatment.isActive ? "bg-[#e8f3ed] text-[#28634f]" : "bg-[#edf0ef] text-[#5f6e68]"}`}>
                    {treatment.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
                <p className="mt-3 min-h-10 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted)]">
                  {treatment.description || "Açıklama bulunmuyor."}
                </p>
                <p className="mt-4 break-words text-sm font-semibold text-[var(--ink)]">
                  Birim fiyat: {new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(treatment.defaultPrice))} {treatment.currency}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                  <Link className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatments/${treatment.id}`}>
                    <Eye aria-hidden="true" size={16} />Detay
                  </Link>
                  <Link className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatments/${treatment.id}/edit`}>
                    <UserRoundPen aria-hidden="true" size={16} />Düzenle
                  </Link>
                  <form action={setTreatmentActiveAction} className="flex min-w-0 flex-1">
                    <input name="treatmentId" type="hidden" value={treatment.id} />
                    <input name="active" type="hidden" value={String(!treatment.isActive)} />
                    <button className="min-h-9 w-full rounded-md border border-[var(--line)] px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" type="submit">
                      {treatment.isActive ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  </form>
                  <details className="relative min-w-0 flex-1">
                    <summary className="flex min-h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 [&::-webkit-details-marker]:hidden">
                      <Trash2 aria-hidden="true" size={15} />Sil
                    </summary>
                    <form action={deleteTreatmentAction} className="absolute right-0 top-full z-20 mt-2 w-48 rounded-md border border-red-200 bg-white p-3 shadow-lg">
                      <input name="treatmentId" type="hidden" value={treatment.id} />
                      <p className="mb-2 text-xs leading-5 text-[var(--muted)]">Kullanılmayan tedavi kalıcı olarak silinir.</p>
                      <button className="min-h-9 w-full rounded-md bg-red-700 px-2 text-xs font-semibold text-white outline-none hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-500" type="submit">
                        Silmeyi onayla
                      </button>
                    </form>
                  </details>
                </div>
              </article>
            ))}
          </div>
          {hasMore && nextCursor ? <div className="flex justify-center"><Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatments?${nextParams.toString()}`}>Daha fazla yükle</Link></div> : null}
        </>
      )}
    </div>
  );
}
