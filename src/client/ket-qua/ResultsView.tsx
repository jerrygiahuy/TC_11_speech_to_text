"use client";

import { useMemo, useState } from "react";
import { aggregate, toCsv, type SessionRecord } from "@/shared/metrics";

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "–";
  const rounded = Math.round(seconds);
  return rounded < 60 ? `${rounded} giây` : `${Math.floor(rounded / 60)} phút ${rounded % 60} giây`;
}

function formatPercent(ratio: number | null): string {
  return ratio === null ? "–" : `${Math.round(ratio * 100)}%`;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

const HEADERS = ["Thời điểm", "Kiểu nhập", "Nguồn", "AI", "Thời gian", "AI điền", "Đã sửa", "Bổ sung", "Khớp danh mục", "Cảnh báo"];

export function ResultsView({ sessions }: { sessions: SessionRecord[] }) {
  const [includeSamples, setIncludeSamples] = useState(false);
  const [showCsv, setShowCsv] = useState(false);

  const counted = useMemo(
    () => (includeSamples ? sessions : sessions.filter((session) => !session.tu_ca_mau)),
    [sessions, includeSamples],
  );
  const stats = useMemo(() => aggregate(counted), [counted]);
  const csv = useMemo(() => toCsv(sessions), [sessions]);

  function download() {
    // BOM giúp Excel đọc đúng tiếng Việt
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ket-qua-thu-nghiem.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-semibold text-navy">Kết quả thử nghiệm</h2>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={includeSamples}
            onChange={(event) => setIncludeSamples(event.target.checked)}
          />
          Tính cả lượt nạp từ ca mẫu
        </label>
        <button
          type="button"
          onClick={() => setShowCsv((value) => !value)}
          aria-expanded={showCsv}
          disabled={sessions.length === 0}
          className="ml-auto rounded border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-soft disabled:opacity-50"
        >
          Xuất CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Số lượt được tính"
          value={String(stats.so_luot)}
          note={`Tổng ${sessions.length} lượt đã lưu`}
        />
        <Stat
          label="Thời gian trung bình"
          value={formatSeconds(stats.thoi_gian_tb)}
          note="Từ lúc bắt đầu nhập đến lúc xác nhận"
        />
        <Stat
          label="Trường giữ nguyên"
          value={formatPercent(stats.ty_le_giu_nguyen)}
          note="Trên số trường AI điền, bác sĩ không sửa"
        />
        <Stat
          label="Khớp danh mục"
          value={formatPercent(stats.ty_le_khop)}
          note="Trên số dịch vụ và thuốc AI nhận ra"
        />
      </div>

      {showCsv && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <textarea
            readOnly
            aria-label="Nội dung CSV"
            rows={8}
            value={csv}
            onFocus={(event) => event.target.select()}
            className="w-full rounded border border-gray-300 p-2 font-mono text-xs"
          />
          <button
            type="button"
            onClick={download}
            className="mt-2 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent hover:brightness-95"
          >
            Tải file CSV
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-navy">
            <tr>
              {HEADERS.map((header) => (
                <th key={header} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 tabular-nums">
            {sessions.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length} className="px-3 py-6 text-center text-muted">
                  Chưa có lượt thử nào. Trên trang eForm, để AI điền phiếu rồi bấm &quot;Lưu&quot; để ghi lượt đầu tiên.
                </td>
              </tr>
            )}
            {sessions.map((session) => (
              <tr key={session.id}>
                <td className="px-3 py-2 whitespace-nowrap" suppressHydrationWarning>
                  {new Date(session.thoi_diem).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2">{session.kieu_nhap === "noi" ? "Nói" : "Gõ"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {session.tu_ca_mau ? `Ca mẫu ${session.ca_mau_id ?? ""}` : "Nhập thật"}
                  {session.mau_id ? ` · Mẫu ${session.mau_id}` : ""}
                </td>
                <td className="px-3 py-2">{session.provider}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatSeconds(session.thoi_gian_giay)}</td>
                <td className="px-3 py-2">{session.so_truong_ai_dien}</td>
                <td className="px-3 py-2">{session.so_truong_sua}</td>
                <td className="px-3 py-2">{session.so_truong_bo_sung}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {session.so_muc_khop}/{session.so_muc_danh_muc}
                </td>
                <td className="px-3 py-2">{session.so_canh_bao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
