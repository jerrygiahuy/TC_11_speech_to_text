"use client";

import { useState } from "react";
import { EformScreen } from "@/client/eform/EformScreen";
import type { EformData, KichBan } from "@/shared/eform/types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tim";

/**
 * Trang trình diễn cho buổi họp với bác sĩ: cùng ca giả, chọn một trong 4 kiểu tương tác,
 * phiếu mở lại từ đầu theo kiểu đó. Thẻ phía trên nói kiểu này giống thứ gì bác sĩ đã quen và ai làm gì.
 */
export function TrinhDienScreen({ data }: { data: EformData }) {
  const td = data.trinhDien;
  const [kieu, setKieu] = useState<KichBan>(1);
  // Tăng để mở lại phiếu từ đầu (key mới cho EformScreen)
  const [lan, setLan] = useState(0);
  // Thẻ giải thích chiếm chỗ: giải thích xong thì ẩn để cột Trợ lý AI hiện trọn trên màn laptop
  const [hienThe, setHienThe] = useState(true);
  if (!td) return null;
  const chon = td.kieu.find((item) => item.so === kieu) ?? td.kieu[0];

  const the: { nhan: string; noiDung: string }[] = [
    { nhan: "Giống như", noiDung: chon.giong_nhu },
    { nhan: "Lúc nào", noiDung: chon.luc_nao },
    { nhan: "Bác sĩ làm", noiDung: chon.bac_si_lam },
    { nhan: "Máy làm", noiDung: chon.may_lam },
    { nhan: "Bác sĩ cần kiểm tra", noiDung: chon.kiem_tra },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <section aria-labelledby="tieu-de-trinh-dien" className="border-b border-tim-vien bg-white print:hidden">
        <div className="mx-auto max-w-[90rem] px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 id="tieu-de-trinh-dien" className="text-[15px] font-semibold text-tim">
              4 cách làm việc với máy, trên cùng một ca
            </h1>
            <div role="tablist" aria-label="Kiểu tương tác" className="flex flex-wrap gap-1.5">
              {td.kieu.map((item) => (
                <button
                  key={item.so}
                  type="button"
                  role="tab"
                  aria-selected={kieu === item.so}
                  onClick={() => {
                    setKieu(item.so);
                    setLan((n) => n + 1);
                  }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${FOCUS} ${
                    kieu === item.so
                      ? "border-tim bg-tim font-semibold text-white"
                      : "border-tim-vien bg-white text-ef-chu hover:bg-tim-nhat"
                  }`}
                >
                  <span
                    className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${
                      kieu === item.so ? "bg-white text-tim" : "bg-tim-nhat text-tim"
                    }`}
                  >
                    {item.so}
                  </span>
                  {item.ten}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-expanded={hienThe}
              aria-controls="the-trinh-dien"
              onClick={() => setHienThe((v) => !v)}
              className={`ml-auto rounded-md border border-ef-vien bg-white px-3 py-1 text-[13px] text-ef-chu hover:bg-ef-nen ${FOCUS}`}
            >
              {hienThe ? "Ẩn giải thích" : "Hiện giải thích"}
            </button>
            <button
              type="button"
              onClick={() => setLan((n) => n + 1)}
              className={`rounded-md border border-ef-vien bg-white px-3 py-1 text-[13px] text-ef-chu hover:bg-ef-nen ${FOCUS}`}
            >
              ↺ Làm lại từ đầu
            </button>
          </div>

          {hienThe && (
            <div id="the-trinh-dien">
              <dl className="mt-3 grid gap-x-5 gap-y-2 rounded-lg bg-tim-nhat/60 px-4 py-3 text-[13px] sm:grid-cols-2 lg:grid-cols-5">
                {the.map(({ nhan, noiDung }) => (
                  <div key={nhan} className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-tim">{nhan}</dt>
                    <dd className="mt-0.5 leading-snug text-ef-chu">{noiDung}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-ef-phu">Dữ liệu giả. Bấm Lưu ở trang này không ghi số đo hay đơn đã kê.</p>
            </div>
          )}
        </div>
      </section>

      <EformScreen key={`${kieu}-${lan}`} data={data} kichBan={kieu} />
    </div>
  );
}
