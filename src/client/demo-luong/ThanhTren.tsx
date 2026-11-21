"use client";

import { BTN_OUTLINE } from "@/client/eform/fields";
import { FOCUS, gioVN, type CheDo } from "./hien-thi";

export interface BenhNhanGia { id: string; ten: string; dong_y: { trang_thai: boolean; luc: string | null } | null }

const CHE_DO: { id: CheDo; nhan: string }[] = [
  { id: "bac_si", nhan: "Bác sĩ / Lãnh đạo" },
  { id: "ky_thuat", nhan: "Kỹ thuật" },
];

/** Thanh trên: công tắc chế độ, chọn bệnh nhân giả, dòng đồng ý AI, "+ Phiếu khám mới", "Xóa dữ liệu demo". */
export function ThanhTren({ cheDo, onCheDo, benhNhan, benhNhanId, onBenhNhan, dongY, khoa, onPhieuMoi, onXoa }: {
  cheDo: CheDo; onCheDo: (c: CheDo) => void;
  benhNhan: BenhNhanGia[]; benhNhanId: string | null; onBenhNhan: (id: string) => void;
  dongY: BenhNhanGia["dong_y"]; khoa: boolean;
  onPhieuMoi: () => void; onXoa: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-ef-vien bg-white px-4 py-3">
      <div role="group" aria-label="Chế độ xem" className="inline-flex items-center gap-2">
        <span className="text-[13px] font-semibold text-ef-phu">Chế độ:</span>
        <span className="inline-flex rounded-md border border-ef-vien p-0.5">
          {CHE_DO.map(c => (
            <button key={c.id} type="button" aria-pressed={cheDo === c.id} onClick={() => onCheDo(c.id)}
              className={`rounded px-3 py-1 text-[13px] font-semibold ${FOCUS} ${cheDo === c.id ? "bg-ef-dam text-white" : "text-ef-chu hover:bg-ef-nen"}`}>
              {c.nhan}
            </button>
          ))}
        </span>
      </div>
      <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-ef-phu">
        Bệnh nhân giả
        <select value={benhNhanId ?? ""} disabled={khoa || benhNhan.length === 0} onChange={e => onBenhNhan(e.target.value)}
          className={`rounded-md border border-ef-vien bg-white px-2 py-1 text-[13px] font-medium text-ef-chu ${FOCUS}`}>
          {!benhNhanId && <option value="">…</option>}
          {benhNhan.map(b => <option key={b.id} value={b.id}>{b.ten} · {b.id}</option>)}
        </select>
      </label>
      <span className="text-[13px]">
        {dongY ? (
          <>
            <span className={`font-semibold ${dongY.trang_thai ? "text-on-accent" : "text-ef-do"}`}>
              Đồng ý AI: {dongY.trang_thai ? "✓" : "✗"} (lúc tiếp đón, {gioVN(dongY.luc)})
            </span>
            {!dongY.trang_thai && (
              <span className="ml-2 rounded-full bg-xem-nhat px-2 py-px text-[11px] font-semibold text-xem ring-1 ring-xem/40">
                Không được gửi AI ngoài — chạy bộ tách local
              </span>
            )}
          </>
        ) : (
          <span className="text-ef-phu">Đồng ý AI: đang đọc hồ sơ…</span>
        )}
      </span>
      <span className="ml-auto inline-flex flex-wrap gap-2">
        <button type="button" className={BTN_OUTLINE} disabled={khoa || !benhNhanId} onClick={onPhieuMoi}>+ Phiếu khám mới</button>
        <button type="button" className={`${BTN_OUTLINE} text-ef-do`} disabled={khoa} onClick={onXoa}>Xóa dữ liệu demo</button>
      </span>
    </div>
  );
}
