export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-8 pt-4" aria-busy="true">
      <p role="status" className="text-[14px] text-muted">
        Đang tải lịch khám…
      </p>
      <div className="h-8 w-48 animate-pulse bg-gray-200" />
      <div className="grid gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse border border-gray-300 bg-white" />
        ))}
      </div>
    </main>
  );
}
