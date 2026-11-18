"use client";

import { useState } from "react";
import { useEform } from "@/client/eform/EformContext";
import { BTN_AI } from "@/client/eform/fields";
import { VUNG_KHAM, goiYMauCau, tachMau } from "@/shared/eform/mau-cau";

const TRUONG_KHAM = "kham_chuyen_khoa";

function TheMau({ nhanVung, text, theoLyDo }: { nhanVung: string; text: string; theoLyDo: boolean }) {
  const { append, notify } = useEform();
  const [chon, setChon] = useState<Record<number, string>>({});
  const phan = tachMau(text);

  const insert = () => {
    const cau = phan.map((p, index) => (p.kieu === "chu" ? p.text : (chon[index] ?? p.goc))).join("");
    append(TRUONG_KHAM, `${nhanVung}: ${cau}`, "ai");
    setChon({});
    notify(`Đã chèn mẫu câu ${nhanVung} vào Khám chuyên khoa.`);
  };

  return (
    <div className="rounded border border-ef-vien bg-white p-2 text-[13px]">
      {!theoLyDo && <span className="mb-1 block text-[11px] text-ef-phu">Mẫu chung</span>}
      <p className="leading-7">
        {phan.map((p, index) =>
          p.kieu === "chu" ? (
            <span key={index}>{p.text}</span>
          ) : (
            <select
              key={index}
              aria-label={`Chọn: ${p.luaChon.join(", ")}`}
              value={chon[index] ?? ""}
              onChange={(e) => setChon((prev) => ({ ...prev, [index]: e.target.value }))}
              className="mx-0.5 max-w-full rounded border border-tim-vien bg-tim-nhat px-1 text-[13px]"
            >
              <option value="">…</option>
              {p.luaChon.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ),
        )}
      </p>
      <button type="button" className={`${BTN_AI} mt-1`} onClick={insert}>
        Chèn
      </button>
    </div>
  );
}

export function MauCauPanel() {
  const { data, get } = useEform();
  const lyDo = get("ly_do").value;
  const { theoVung } = goiYMauCau(lyDo, data.mauCau, data.quyTac.phu_dinh);

  return (
    <div className="mt-2 rounded-lg border border-tim-vien bg-tim-nhat p-3">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {VUNG_KHAM.map((vung) => (
          <div key={vung.id} className="space-y-1.5">
            <h3 className="text-[13px] font-semibold text-ef-chu">{vung.nhan}</h3>
            {theoVung[vung.id].map((mau) => (
              <TheMau key={mau.text} nhanVung={vung.nhan} text={mau.text} theoLyDo={mau.theoLyDo} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
