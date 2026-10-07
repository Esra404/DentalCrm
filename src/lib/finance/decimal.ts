import { Prisma } from "@/generated/prisma/client";

export const MONEY_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export function decimalFromMoney(value: string): Prisma.Decimal | null {
  if (!MONEY_PATTERN.test(value)) return null;
  return new Prisma.Decimal(value);
}

export function sumPlanItems(
  items: readonly { quantity: number; unitPrice: Prisma.Decimal }[],
): Prisma.Decimal {
  return items.reduce(
    (total, item) =>
      total.plus(item.unitPrice.mul(new Prisma.Decimal(item.quantity))),
    new Prisma.Decimal(0),
  );
}

export function formatMoney(value: Prisma.Decimal, currency: string): string {
  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())} ${currency}`;
}
