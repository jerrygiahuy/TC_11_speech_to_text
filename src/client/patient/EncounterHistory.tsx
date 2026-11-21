"use client";

import { useState } from "react";
import { StatusBadge } from "@/client/clinic/status";
import { formatClinicDateTimeLenient } from "@/shared/clinic/format";
import type { HistorySummary } from "@/shared/clinic/types";
import { EncounterHistoryDialog } from "./EncounterHistoryDialog";

export const HISTORY_PAGE_SIZE = 10;
const PAGE_BTN = "rounded-sm border border-gray-300 bg-white px-3 py-1 hover:bg-soft disabled:cursor-not-allowed disabled:text-muted";

/** Danh sách lịch sử khám (đã sắp giảm dần từ server). "Xem phiếu" mở toàn bộ phiếu cũ ở chế độ chỉ đọc. */
export function EncounterHistory({ patientId, items }: { patientId: string; items: HistorySummary[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requestedPage, setRequestedPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / HISTORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const pageItems = items.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);
  return (
    <section aria-labelledby="history-title" className="space-y-2">
      <h2 id="history-title" className="text-lg font-semibold">
        Lịch sử khám
      </h2>
      {items.length === 0 ? (
        <p className="rounded border border-gray-300 bg-white p-4 text-[13px] text-muted">Chưa có lịch sử khám</p>
      ) : (
        <ul className="space-y-2">
          {pageItems.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded border border-gray-300 bg-white p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{item.summary}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatClinicDateTimeLenient(item.encounter_at)}
                  {item.appointment_id !== null && <> · Mã lượt {item.appointment_id}</>} · {item.doctor_name}
                </p>
              </div>
              {/* Lịch sử không có encounter_id nên nhãn luôn là "Hủy khám" khi hủy, không hiện "Không khám". */}
              <StatusBadge item={{ status: item.status, encounter_id: null }} />
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="rounded border border-emr-blue bg-white px-3 py-1 text-xs text-emr-blue hover:bg-soft"
              >
                Xem phiếu
              </button>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <nav aria-label="Phân trang lịch sử khám" className="flex items-center justify-between gap-2 pt-1 text-[13px]">
          <button type="button" disabled={page === 1} onClick={() => setRequestedPage(page - 1)} className={PAGE_BTN}>
            ‹ Trước
          </button>
          <span className="tabular-nums text-muted" aria-live="polite">
            Trang {page}/{pageCount} · {items.length} phiếu
          </span>
          <button type="button" disabled={page === pageCount} onClick={() => setRequestedPage(page + 1)} className={PAGE_BTN}>
            Sau ›
          </button>
        </nav>
      )}
      {selectedId !== null && (
        <EncounterHistoryDialog
          key={patientId}
          patientId={patientId}
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
}
