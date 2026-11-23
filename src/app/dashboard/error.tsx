"use client";

import { useEffect } from "react";

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <div role="alert" className="border border-[#c9302c]/50 bg-[#fdeceb] p-4 text-[#a02622]">
        <h1 className="text-lg font-bold">Không tải được lịch khám</h1>
        <p className="mt-1 text-[13px]">Dữ liệu lịch khám không đọc được. Số liệu không được hiển thị để tránh nhầm với ngày không có ca.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-3 rounded-sm border border-gray-300 bg-white px-3 py-1 text-[13px] text-ink hover:bg-soft"
        >
          Thử lại
        </button>
      </div>
    </main>
  );
}
