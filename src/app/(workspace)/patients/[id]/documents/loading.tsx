export default function PatientDocumentsLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <span className="sr-only">Hasta belgeleri yükleniyor...</span>
      <div className="h-24 animate-pulse rounded-md border border-[var(--line)] bg-white" />
      <div className="h-72 animate-pulse rounded-md border border-[var(--line)] bg-white" />
    </div>
  );
}
