"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getHistoricalEncounter } from "@/client/clinic/api";
import { ClinicDialog } from "@/client/clinic/ClinicDialog";
import { openHref } from "@/client/clinic/open-appointment";
import { historyNavigation } from "@/shared/clinic/history";
import type { HistoricalEncounterViewModel, HistorySummary } from "@/shared/clinic/types";
import { HistoricalEncounterView } from "./HistoricalEncounterView";
import { createHistoryLoader } from "./history-controller";

type State =
  | { id: string; status: "loading" }
  | { id: string; status: "error"; message: string }
  | { id: string; status: "ready"; value: HistoricalEncounterViewModel };

const NAV_BTN =
  "rounded-sm border border-gray-300 bg-white px-3 py-1 text-[13px] hover:bg-soft disabled:cursor-not-allowed disabled:text-muted";

/**
 * Xem toàn bộ phiếu cũ, có Trước/Sau theo danh sách đã chụp lúc mở. Chỉ GET; chuyển nhanh thì kết quả muộn bị bỏ
 * (history-controller), và nội dung chỉ hiện khi mã khớp phiếu đang chọn.
 */
export function EncounterHistoryDialog({
  patientId,
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  patientId: string;
  items: HistorySummary[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  // Danh sách chụp lúc mở: phiếu mới phát sinh khi đang xem không làm lệch thứ tự Trước/Sau.
  const [frozen] = useState(items);
  const nav = useMemo(() => historyNavigation(frozen, selectedId), [frozen, selectedId]);
  const [state, setState] = useState<State>({ id: selectedId, status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [note, setNote] = useState<{ id: string; text: string } | null>(null);
  const detailNote = note?.id === selectedId ? note.text : "";

  // Mở phiếu ở eForm nếu hồ sơ có trong kho phiếu thật; bản lưu cũ chỉ để xem thì báo rõ, không điều hướng.
  async function openDetail() {
    setNote(null);
    try {
      const response = await fetch(`/api/clinical/encounters/${encodeURIComponent(selectedId)}`, { cache: "no-store" });
      if (response.ok) return router.push(openHref(selectedId));
    } catch {
      /* rơi xuống thông báo bên dưới */
    }
    setNote({ id: selectedId, text: "Phiếu này là bản lưu cũ, chưa mở được trên eForm." });
  }

  useEffect(() => {
    let live = true;
    // Mỗi lần chọn một bộ tải riêng: dọn effect hủy request đang bay, nên kết quả muộn không bao giờ lộ ra.
    const loader = createHistoryLoader(getHistoricalEncounter);
    loader
      .load(patientId, selectedId)
      .then((result) => {
        if (live && result) setState({ id: result.id, status: "ready", value: result.value });
      })
      .catch((error: unknown) => {
        if (live) setState({ id: selectedId, status: "error", message: error instanceof Error ? error.message : "Không tải được phiếu khám." });
      });
    bodyRef.current?.parentElement?.scrollTo({ top: 0 });
    return () => {
      live = false;
      loader.dispose();
    };
  }, [patientId, selectedId, attempt]);

  // Không hiển thị nội dung của phiếu khác phiếu đang chọn (kể cả khi state còn của lần chọn trước).
  const current = state.id === selectedId ? state : null;
  const position = nav.index >= 0 ? `${nav.index + 1}/${frozen.length}` : "";

  return (
    <ClinicDialog open title={`Phiếu khám ${position}`.trim()} onClose={onClose}>
      <div ref={bodyRef} className="space-y-3">
        <div className="flex items-center gap-2">
          <button type="button" className={NAV_BTN} disabled={nav.previousId === null} onClick={() => nav.previousId && onSelect(nav.previousId)}>
            ‹ Mới hơn
          </button>
          <button type="button" className={NAV_BTN} disabled={nav.nextId === null} onClick={() => nav.nextId && onSelect(nav.nextId)}>
            Cũ hơn ›
          </button>
          <button
            type="button"
            onClick={() => void openDetail()}
            className="ml-auto rounded-sm border border-emr-blue bg-white px-3 py-1 text-[13px] font-medium text-emr-blue hover:bg-soft"
          >
            Chi tiết phiếu khám
          </button>
        </div>
        {detailNote !== "" && <p role="status" className="text-[13px] text-[#a02622]">{detailNote}</p>}
        {(current === null || current.status === "loading") && (
          <p role="status" className="py-6 text-center text-[13px] text-muted">
            Đang tải phiếu khám…
          </p>
        )}
        {current?.status === "error" && (
          <div role="alert" className="space-y-2 border border-[#c9302c]/50 bg-[#fdeceb] p-3 text-[13px] text-[#a02622]">
            <p>{current.message}</p>
            <button type="button" className={NAV_BTN} onClick={() => { setState({ id: selectedId, status: "loading" }); setAttempt((n) => n + 1); }}>
              Thử lại
            </button>
          </div>
        )}
        {current?.status === "ready" && <HistoricalEncounterView value={current.value} />}
      </div>
    </ClinicDialog>
  );
}
