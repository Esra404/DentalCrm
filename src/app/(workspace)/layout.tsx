import type { ReactNode } from "react";
import { Role } from "@/generated/prisma/enums";
import { AppShell } from "@/components/layout/app-shell";
import { requireRoles } from "@/lib/auth/authorization";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);

  return <AppShell user={user}>{children}</AppShell>;
}