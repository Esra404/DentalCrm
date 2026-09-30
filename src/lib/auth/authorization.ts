import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return user;
}

export async function requireRole(role: Role): Promise<CurrentUser> {
  return requireRoles(role);
}

export async function requireRoles(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireAuth();

  if (roles.length === 0 || !roles.includes(user.role)) {
    redirect("/forbidden");
  }

  return user;
}