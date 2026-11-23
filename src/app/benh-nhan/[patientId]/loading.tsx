export default function Loading() {
  return (
    <main role="status" aria-busy="true" aria-label="Đang tải hồ sơ bệnh nhân" className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
      <div className="h-28 animate-pulse rounded border border-gray-300 bg-white" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded border border-gray-300 bg-white" />
        <div className="h-24 animate-pulse rounded border border-gray-300 bg-white" />
      </div>
      <div className="h-40 animate-pulse rounded border border-gray-300 bg-white" />
      <span className="sr-only">Đang tải hồ sơ bệnh nhân…</span>
    </main>
  );
}
