"use client";

import Link from "next/link";

// Lỗi đọc dữ liệu (không phải 404): báo rõ, cho thử lại, không hiện dữ liệu giả.
export default function PatientError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-3 px-4 py-8">
      <h1 className="text-lg font-semibold">Không tải được hồ sơ bệnh nhân</h1>
      <p role="alert" className="text-[13px] text-muted">
        Không đọc được dữ liệu lịch khám. Bạn có thể thử lại hoặc quay về dashboard.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
        >
          Thử lại
        </button>
        <Link href="/dashboard" className="rounded border border-gray-300 bg-white px-4 py-2 text-[13px] hover:bg-gray-50">
          Về dashboard
        </Link>
      </div>
    </main>
  );
}
