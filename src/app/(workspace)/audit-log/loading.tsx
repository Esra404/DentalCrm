export default function AuditLogLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <span className="sr-only">İşlem kayıtları yükleniyor...</span>
      <div className="h-24 animate-pulse rounded-md border border-[var(--line)] bg-white" />
      <div className="h-20 animate-pulse rounded-md border border-[var(--line)] bg-white" />
      <div className="h-72 animate-pulse rounded-md border border-[var(--line)] bg-white" />
    </div>
  );
}
