"use client";

import { useState } from "react";
import { useEform } from "@/client/eform/EformContext";
import { BTN_AI, BTN_OUTLINE } from "@/client/eform/fields";
import { VUNG_KHAM, chenMauCau } from "@/shared/eform/mau-cau";
import type { VungKham } from "@/shared/eform/types";

/**
 * Hộp chọn mẫu câu khám (thư viện tham khảo). Tick câu rồi bấm Chọn: các câu thành dòng "- …" cuối ô khám.
 * Thư viện chỉ gợi ý câu thường gặp, bác sĩ tự quyết câu nào đúng với người bệnh.
 */
export function MauCauPanel({ vung, onDong }: { vung: VungKham; onDong: () => void }) {
  const { data, get, put, notify } = useEform();
  const [chon, setChon] = useState<Set<number>>(new Set());
  const info = VUNG_KHAM.find((item) => item.id === vung);
  const cau = data.mauCau.theoVung[vung];
  if (!info) return null;
  const tatCa = chon.size === cau.length && cau.length > 0;

  const toggle = (index: number) =>
    setChon((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const chenVao = () => {
    const dong = cau.filter((_, index) => chon.has(index));
    if (dong.length === 0) return;
    const hienCo = get(info.truong);
    // Câu do bác sĩ tick và chèn nên là "Bác sĩ nhập"; ô đã có dữ liệu AI hoặc dữ liệu cũ thì thành "Đã sửa"
    const daCoGiaTri = hienCo.value.trim() !== "";
    put(info.truong, chenMauCau(hienCo.value, dong), daCoGiaTri && hienCo.nguon ? "sua" : "bs");
    notify(`Đã chèn ${dong.length} câu vào ${info.nhan}.`);
    setChon(new Set());
    onDong();
  };

  return (
    <div className="mt-2 rounded-lg border border-tim-vien bg-tim-nhat p-3" role="group" aria-label={`Thư viện câu ${info.nhan}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ef-chu">
          <input
            type="checkbox"
            checked={tatCa}
            onChange={() => setChon(tatCa ? new Set() : new Set(cau.map((_, index) => index)))}
            className="accent-ef-xanh"
          />
          Chọn tất cả
        </label>
        <span className="text-xs text-ef-phu">{chon.size}/{cau.length} câu</span>
      </div>
      <ul className="space-y-1">
        {cau.map((text, index) => (
          <li key={text}>
            <label className="flex cursor-pointer items-start gap-1.5 rounded border border-ef-vien bg-white p-1.5 text-[13px] leading-5">
              <input type="checkbox" checked={chon.has(index)} onChange={() => toggle(index)} className="mt-0.5 accent-ef-xanh" />
              <span>{text}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-1.5">
        <button type="button" className={BTN_AI} disabled={chon.size === 0} onClick={chenVao}>
          Chọn
        </button>
        <button type="button" className={BTN_OUTLINE} onClick={onDong}>
          Hủy
        </button>
      </div>
    </div>
  );
}
