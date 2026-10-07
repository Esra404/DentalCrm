import Link from "next/link";
import { Eye, Plus, Search, UserRoundPen } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { TREATMENT_ID_PATTERN } from "@/lib/validations/treatment";
import { requireRoles } from "@/lib/auth/authorization";

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
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
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
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
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
      {getValue(params.error) === "invalid" ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">Tedavi işlemi tamamlanamadı. Lütfen tekrar deneyin.</p> : null}

      <form action="/treatments" className="flex flex-col gap-3 sm:flex-row" method="get" role="search">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Tedavi ara</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
          <input className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-[var(--ink)] outline-none placeholder:text-[#83928d] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15" defaultValue={query} maxLength={120} name="q" placeholder="Tedavi adı veya açıklama ile ara..." type="search" />
        </label>
        <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" type="submit">Ara</button>
        {query ? <Link className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium text-[var(--muted)] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/treatments">Temizle</Link> : null}
      </form>

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
          <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <caption className="sr-only">Kayıtlı tedaviler</caption>
                <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]"><tr><th className="px-4 py-3.5" scope="col">Tedavi Adı</th><th className="px-4 py-3.5" scope="col">Açıklama</th><th className="px-4 py-3.5" scope="col">Birim Fiyat</th><th className="px-4 py-3.5" scope="col">Durum</th><th className="px-4 py-3.5 text-right" scope="col">İşlemler</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {treatments.map((treatment) => (
                    <tr className="hover:bg-[#fbfcfb]" key={treatment.id}>
                      <th className="px-4 py-4 font-medium text-[var(--ink)]" scope="row"><Link className="rounded-sm outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatments/${treatment.id}`}>{treatment.name}</Link></th>
                      <td className="max-w-80 truncate px-4 py-4 text-[var(--muted)]">{treatment.description || "—"}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(treatment.defaultPrice))} {treatment.currency}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${treatment.isActive ? "bg-[#e8f3ed] text-[#28634f]" : "bg-[#edf0ef] text-[#5f6e68]"}`}>{treatment.isActive ? "Aktif" : "Pasif"}</span></td>
                      <td className="px-4 py-4"><div className="flex justify-end gap-1">
                        <Link aria-label={`${treatment.name} detayını görüntüle`} className="inline-flex size-9 items-center justify-center rounded-md text-[var(--muted)] outline-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatments/${treatment.id}`}><Eye aria-hidden="true" size={17} /></Link>
                        <Link aria-label={`${treatment.name} bilgilerini düzenle`} className="inline-flex size-9 items-center justify-center rounded-md text-[var(--muted)] outline-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatments/${treatment.id}/edit`}><UserRoundPen aria-hidden="true" size={17} /></Link>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {hasMore && nextCursor ? <div className="flex justify-center"><Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href={`/treatments?${nextParams.toString()}`}>Daha fazla yükle</Link></div> : null}
        </>
      )}
    </div>
  );
}
