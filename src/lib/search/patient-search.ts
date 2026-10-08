import type { Prisma } from "@/generated/prisma/client";

const MAX_SEARCH_VARIANTS = 16;

export function insensitiveSearchVariants(value: string): string[] {
  const variants = new Set([value]);

  for (let index = 0; index < value.length && variants.size < MAX_SEARCH_VARIANTS; index += 1) {
    const character = value[index].toLocaleLowerCase("tr-TR");
    if (character !== "i" && character !== "ı") continue;

    const alternate = character === "i" ? "ı" : "i";
    variants.add(
      `${value.slice(0, index)}${alternate}${value.slice(index + 1)}`,
    );
  }

  return [...variants];
}

export function patientSearchWhere(query: string): Prisma.PatientWhereInput {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return {};

  const variants = insensitiveSearchVariants(normalizedQuery);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean).slice(0, 5);

  return {
    OR: [
      ...variants.flatMap((term) => [
        { firstName: { contains: term, mode: "insensitive" as const } },
        { lastName: { contains: term, mode: "insensitive" as const } },
        { email: { contains: term, mode: "insensitive" as const } },
      ]),
      { phone: { contains: normalizedQuery } },
      {
        AND: terms.map((term) => ({
          OR: insensitiveSearchVariants(term).flatMap((variant) => [
            { firstName: { contains: variant, mode: "insensitive" as const } },
            { lastName: { contains: variant, mode: "insensitive" as const } },
          ]),
        })),
      },
    ],
  };
}
