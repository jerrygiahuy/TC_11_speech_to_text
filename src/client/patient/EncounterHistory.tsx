import { StatusBadge } from "@/client/clinic/status";
import { formatClinicDateTimeLenient } from "@/shared/clinic/format";
import type { HistorySummary } from "@/shared/clinic/types";

const NOTE_ID = "history-view-note";

/** Danh sách lịch sử khám (đã sắp giảm dần từ server). Đợt này chưa xem được toàn phiếu: nút "Xem phiếu" tắt. */
export function EncounterHistory({ items }: { items: HistorySummary[] }) {
  return (
    <section aria-labelledby="history-title" className="space-y-2">
      <h2 id="history-title" className="text-lg font-semibold">
        Lịch sử khám
      </h2>
      {items.length === 0 ? (
        <p className="rounded border border-gray-300 bg-white p-4 text-[13px] text-muted">Chưa có lịch sử khám</p>
      ) : (
        <>
          <p id={NOTE_ID} className="text-xs text-muted">
            Chờ dữ liệu phiếu từ ưu tiên 1: chưa xem được toàn bộ phiếu cũ.
          </p>
          <ul className="space-y-2">
            {items.map((item) => (
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
                  disabled
                  aria-describedby={NOTE_ID}
                  title="Chờ dữ liệu phiếu từ ưu tiên 1"
                  className="cursor-not-allowed rounded border border-gray-300 bg-gray-100 px-3 py-1 text-xs text-muted"
                >
                  Xem phiếu
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
