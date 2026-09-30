import { notFound } from "next/navigation";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { CRM_MODULES, type CrmModuleSlug } from "@/lib/navigation";
import { requireRoles } from "@/lib/auth/authorization";

export default async function ModulePlaceholderPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: slug } = await params;

  if (!Object.hasOwn(CRM_MODULES, slug)) notFound();

  const moduleConfig = CRM_MODULES[slug as CrmModuleSlug];
  await requireRoles(...moduleConfig.roles);

  return (
    <ModulePlaceholder
      description={moduleConfig.description}
      emptyState={moduleConfig.emptyState}
      icon={moduleConfig.icon}
      label={moduleConfig.label}
    />
  );
}