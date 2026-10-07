import "server-only";

import type { Prisma } from "@/generated/prisma/client";

export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
    select: { id: true },
  });
}
