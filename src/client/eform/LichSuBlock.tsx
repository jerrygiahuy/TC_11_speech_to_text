"use client";

import { useState } from "react";
import { useEform } from "@/client/eform/EformContext";
import { BTN_AI, BTN_OUTLINE, SourceBadge, TD, TH, inputClass } from "@/client/eform/fields";
import { tomTatLichSu, type KetQuaTomTat } from "@/shared/eform/tom-tat";
import type { DongLichSu } from "@/shared/eform/types";

interface Props {
  targetId: string;
  targetLabel: string;
  rows: DongLichSu[];
  columnLabel?: string;
}

export function LichSuBlock({ targetId, targetLabel, rows, columnLabel = "Nội dung" }: Props) {
  const { data, append, notify } = useEform();
  const [ketQua, setKetQua] = useState<KetQuaTomTat | null>(null);
  const [draft, setDraft] = useState("");

  if (rows.length === 0) return null;

  const summarize = () => {
    const result = tomTatLichSu(rows, data.quyTac.tom_tat);
    if (!result) {
      notify("Lịch sử không có nội dung để tóm tắt.");
      return;
    }
    setKetQua(result);
    setDraft(result.text);
  };

  const insert = () => {
    if (!ketQua || !draft.trim()) return;
    // Bác sĩ đã sửa đoạn tóm tắt trước khi chèn thì ghi nhận là "Đã sửa"
    append(targetId, draft.trim(), draft === ketQua.text ? "ai" : "sua");
    setKetQua(null);
  };

  return (
    <div className="mt-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ef-phu">Thông tin khai thác {targetLabel.toLowerCase()}</span>
        <button type="button" className={BTN_AI} onClick={summarize}>
          ✨ AI tóm tắt
        </button>
      </div>

      {ketQua && (
        <div className="mb-2 rounded-lg border border-tim-vien bg-tim-nhat p-3">
          <div className="mb-1">
            <SourceBadge nguon="ai" />
          </div>
          <textarea
            aria-label={`Bản nháp tóm tắt ${targetLabel.toLowerCase()}`}
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={inputClass(null)}
          />
          <div className="mt-1.5 flex gap-1.5">
            <button type="button" className={BTN_AI} onClick={insert}>
              Chèn vào ô {targetLabel}
            </button>
            <button type="button" className={BTN_OUTLINE} onClick={() => setKetQua(null)}>
              Bỏ
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-ef-vien">
        <table className="w-full min-w-[32rem] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={`${TH} whitespace-nowrap`}>Ngày khám</th>
              <th className={`${TH} whitespace-nowrap`}>Bác sĩ</th>
              <th className={`${TH} whitespace-nowrap`}>Khoa phòng</th>
              <th className={TH}>{columnLabel}</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.ngay}-${row.noi_dung}`} className="[&:last-child>td]:border-b-0">
                <td className={`${TD} whitespace-nowrap tabular-nums`}>{row.ngay}</td>
                <td className={`${TD} whitespace-nowrap`}>{row.bac_si}</td>
                <td className={`${TD} whitespace-nowrap`}>{row.khoa}</td>
                <td className={TD}>{row.noi_dung}</td>
                <td className={`${TD} text-right`}>
                  <button type="button" className={BTN_OUTLINE} onClick={() => append(targetId, row.noi_dung, "cu")}>
                    Copy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
