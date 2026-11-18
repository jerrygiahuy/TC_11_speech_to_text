"use client";

import { useState } from "react";
import { MO_PHONG, useEform } from "@/client/eform/EformContext";
import { BTN_OUTLINE } from "@/client/eform/fields";
import type { SinhHieu } from "@/shared/eform/types";

interface Props {
  lastEdit: { nguoi: string; luc: string };
  expanded: boolean;
  onToggleExpand: () => void;
}

const KY_HIEU_GIOI: Record<string, string> = { Nam: "♂", Nữ: "♀" };

function computeBmi(sinhHieu: SinhHieu): string {
  const metres = sinhHieu.chieu_cao / 100;
  return (sinhHieu.can_nang / (metres * metres)).toFixed(1);
}

function ChiSo({ nhan, giaTri, donVi, title }: { nhan: string; giaTri: string; donVi?: string; title: string }) {
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap" title={title}>
      <span className="text-xs text-ef-phu">{nhan}</span>
      <span className="font-semibold tabular-nums text-ef-chu">{giaTri}</span>
      {donVi && <span className="text-[11px] text-ef-phu">{donVi}</span>}
    </span>
  );
}

/**
 * Header ghim trên cùng, giữ các thông tin của màn EMR: đơn vị, người dùng, PID, giới, dị ứng, LSKB.
 * Sinh hiệu (chỉ đọc, từ phiếu điều dưỡng) đặt ở đây để luôn thấy khi cuộn phiếu.
 */
export function EformHeader({ lastEdit, expanded, onToggleExpand }: Props) {
  const { data, notify } = useEform();
  const { ca } = data;
  const sh = ca.sinh_hieu;
  const [showAllergy, setShowAllergy] = useState(false);

  return (
    <header className="z-30 border-b border-ef-vien bg-white lg:sticky lg:top-0">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5">
        <div className="sm:border-r sm:border-ef-vien sm:pr-5">
          <span className="block leading-tight">
            <span className="block text-[13px] font-bold tracking-wide text-ef-dam">VINMEC</span>
            <span className="block text-[11px] text-ef-phu">Bệnh án điện tử</span>
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-lg font-semibold text-ef-chu">{ca.ho_ten}</span>
          <span className="rounded-full bg-ef-nen px-2 py-px text-xs font-medium text-ef-chu ring-1 ring-ef-vien">
            {KY_HIEU_GIOI[ca.gioi_tinh] ?? ""} {ca.gioi_tinh}
          </span>
          <span className="text-[13px] text-ef-phu">
            PID <span className="font-medium tabular-nums text-ef-chu">{ca.pid}</span>
          </span>
          <span className="text-[13px] text-ef-phu">
            Lượt khám <span className="font-medium tabular-nums text-ef-chu">{ca.ma_luot_kham}</span>
          </span>
          {ca.canh_bao_di_ung && (
            <span className="relative">
              <button
                type="button"
                aria-label={`Dị ứng ${ca.canh_bao_di_ung}, xem chi tiết`}
                aria-expanded={showAllergy}
                onClick={() => setShowAllergy((open) => !open)}
                className="rounded-full bg-ef-do px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-ef-do/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ef-do"
              >
                ⚠ Dị ứng: {ca.canh_bao_di_ung}
              </button>
              {showAllergy && (
                <span className="absolute left-0 top-full z-10 mt-1.5 w-80 max-w-[80vw] rounded-lg border border-ef-vien bg-white p-3 text-xs text-ef-chu shadow-lg">
                  {ca.lich_su.di_ung.map((row) => (
                    <span key={`${row.ngay}-${row.loai_phieu}`} className="block py-0.5">
                      <span className="tabular-nums text-ef-phu">{row.ngay}</span> {row.loai}: {row.thong_tin}
                    </span>
                  ))}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-ef-phu">{ca.co_so}</span>
          <span className="font-medium text-ef-chu">{ca.dang_nhap}</span>
          <button type="button" onClick={() => notify(MO_PHONG)} className={BTN_OUTLINE}>
            Menu
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-ef-vien/70 bg-ef-nen/60 px-5 py-1.5 text-[13px]">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Sinh hiệu từ phiếu điều dưỡng">
          <ChiSo nhan="Mạch" giaTri={String(sh.mach)} donVi="l/ph" title="Mạch (nhịp/phút)" />
          <ChiSo nhan="Nhiệt" giaTri={String(sh.nhiet_do)} donVi="°C" title="Nhiệt độ (°C)" />
          <ChiSo nhan="HA" giaTri={`${sh.ha_tam_thu}/${sh.ha_tam_truong}`} donVi="mmHg" title="Huyết áp (mmHg)" />
          <ChiSo nhan="SpO2" giaTri={String(sh.spo2)} donVi="%" title="SpO2 (%)" />
          <ChiSo nhan="Nhịp thở" giaTri={String(sh.nhip_tho)} donVi="l/ph" title="Nhịp thở (lần/phút)" />
          <ChiSo nhan="Cao" giaTri={String(sh.chieu_cao)} donVi="cm" title="Chiều cao (cm)" />
          <ChiSo nhan="Nặng" giaTri={String(sh.can_nang)} donVi="kg" title="Cân nặng (kg)" />
          <ChiSo nhan="BMI" giaTri={computeBmi(sh)} title="BMI (tự tính)" />
        </span>

        <details className="relative">
          <summary className="cursor-pointer text-ef-xanh hover:underline">Đánh giá ban đầu</summary>
          <div className="absolute left-0 top-full z-10 mt-1.5 w-[36rem] max-w-[85vw] rounded-lg border border-ef-vien bg-white p-3 text-xs shadow-lg">
            <div className="mb-1.5 font-semibold text-ef-chu">Đánh giá ban đầu người bệnh ngoại trú thông thường</div>
            <dl className="grid max-h-60 gap-x-4 gap-y-1 overflow-y-auto sm:grid-cols-2">
              {ca.danh_gia_ban_dau.map((item) => (
                <div key={item.nhan} className="flex gap-1">
                  <dt className="text-ef-phu">{item.nhan}:</dt>
                  <dd className="text-ef-chu">{item.gia_tri}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>

        <span className="ml-auto text-xs text-ef-phu">
          Sửa lần cuối: {lastEdit.nguoi}, <span className="tabular-nums">{lastEdit.luc}</span>
        </span>
        <button type="button" onClick={() => notify(MO_PHONG)} className="text-xs font-medium text-ef-xanh hover:underline">
          Xem LSKB
        </button>
        <button type="button" aria-pressed={expanded} onClick={onToggleExpand} className="text-xs font-medium text-ef-xanh hover:underline">
          {expanded ? "Thu hẹp" : "Mở rộng"}
        </button>
      </div>
    </header>
  );
}
