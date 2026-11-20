"use client";

import type { DemoPhieu } from "@/shared/demo-luong/types";
import { BTN_CHINH } from "@/client/eform/fields";
import { FOCUS, gioVN, tongDaChe } from "./hien-thi";

/** Thanh phiên: `Phiên 1 ✓ · Phiên 2 ✓ · [▶ Ghi phiên mới]`. Bấm một phiên để xem lại bản thô/bản đã che của phiên đó. */
export function SessionBar({ sessions, dangXem, coBanTho, onChon, onGhi, dangChay, khoaGhi, lyDoKhoa }: {
  sessions: DemoPhieu["sessions"];
  /** Phiên đang hiện ở hai cột; null = lượt vừa chạy. */
  dangXem: number | null;
  coBanTho: (sequence: number) => boolean;
  onChon: (sequence: number | null) => void;
  onGhi: () => void;
  dangChay: boolean;
  khoaGhi: boolean;
  lyDoKhoa?: string | null;
}) {
  return (
    <div className="rounded-lg border border-ef-vien bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-ef-phu">Phiên ghi âm trong phiếu:</span>
        {sessions.length === 0 && <span className="text-[13px] text-ef-phu">chưa có phiên nào</span>}
        {sessions.map((s, i) => {
          const chon = dangXem === s.sequence;
          return (
            <span key={s.sequence} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="text-ef-phu">·</span>}
              <button
                type="button"
                aria-pressed={chon}
                onClick={() => onChon(chon ? null : s.sequence)}
                title={`Lưu lúc ${gioVN(s.at)} · đã che ${tongDaChe(s.counts)} mục${coBanTho(s.sequence) ? "" : " · bản thô không còn trong bộ nhớ"}`}
                className={`rounded-full border px-3 py-1 text-[13px] font-semibold ${FOCUS} ${chon ? "border-ef-xanh bg-ef-xanh text-white" : "border-accent/60 bg-accent/10 text-ef-dam hover:bg-accent/20"}`}
              >
                Phiên {s.sequence} ✓
              </button>
            </span>
          );
        })}
        <span aria-hidden className="text-ef-phu">·</span>
        <button type="button" onClick={onGhi} disabled={dangChay || khoaGhi} className={BTN_CHINH}>
          {dangChay ? "Đang chạy luồng…" : "▶ Ghi phiên mới"}
        </button>
        {dangXem !== null && (
          <button type="button" onClick={() => onChon(null)} className={`text-[13px] font-medium text-ef-xanh underline-offset-2 hover:underline ${FOCUS}`}>
            Về lượt vừa chạy
          </button>
        )}
      </div>
      {lyDoKhoa && <p className="mt-1.5 text-[13px] text-xem">{lyDoKhoa}</p>}
      <p className="mt-1.5 text-xs text-ef-phu">
        Bản thô của từng phiên chỉ nằm trong bộ nhớ trình duyệt lúc đang mở trang, tải lại trang là mất. Bản đã che luôn đọc lại từ kho.
      </p>
    </div>
  );
}
