"use client";

import { useState } from "react";
import type { Cot, Truong } from "@/shared/phieu-kham-ngoai-tru/types";

export const O_NHAP =
  "w-full rounded-md border border-ef-vien bg-white px-3 py-2 text-sm leading-6 text-ef-chu outline-none transition-[border-color,box-shadow] focus:border-ef-xanh focus:ring-2 focus:ring-ef-xanh/20";
export const NUT_VIEN =
  "rounded-md border border-ef-vien bg-white px-2.5 py-1 text-[13px] font-medium text-ef-chu hover:border-ef-phu/50 hover:bg-ef-nen disabled:cursor-not-allowed disabled:opacity-50";
const RADIO =
  "flex cursor-pointer items-center gap-1.5 rounded-md border border-ef-vien bg-white px-2.5 py-1.5 text-[13px] text-ef-chu hover:border-ef-phu/50 has-checked:border-ef-xanh has-checked:bg-ef-xanh-nhat has-checked:font-medium";

export type Spec = Pick<Truong | Cot, "kieu" | "gia_tri_cho_phep" | "vi_du" | "dinh_dang">;

interface Props {
  spec: Spec;
  name: string;
  value: unknown;
  onChange: (v: unknown) => void;
  nhan: string;
}

function placeholderCua(spec: Spec): string | undefined {
  if (spec.kieu === "ngay_gio") return spec.dinh_dang?.match(/^[HhDdMmYys:/ ]+/)?.[0].trim() || "HH:mm dd/mm/yyyy";
  return spec.vi_du;
}

function TheNhieuGiaTri({ value, onChange, placeholder, nhan }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; nhan: string }) {
  const [nhap, setNhap] = useState("");
  const them = () => {
    const v = nhap.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setNhap("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-ef-xanh-nhat px-2.5 py-1 text-[13px] text-ef-dam">
            {v}
            <button type="button" aria-label={`Xóa ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="font-bold hover:text-ef-do">
              ×
            </button>
          </span>
        ))}
        {value.length === 0 && <span className="text-[13px] text-ef-phu">Chưa có giá trị nào.</span>}
      </div>
      <div className="flex gap-2">
        <input
          aria-label={nhan}
          value={nhap}
          placeholder={placeholder}
          onChange={(e) => setNhap(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              them();
            }
          }}
          className={O_NHAP}
        />
        <button type="button" onClick={them} className={NUT_VIEN}>
          Thêm
        </button>
      </div>
    </div>
  );
}

/** Một ô nhập theo kiểu trường (trừ bang_lap). Giá trị rỗng: số/chọn 1 là null, chữ là "". */
export function Control({ spec, name, value, onChange, nhan }: Props) {
  const cho = spec.gia_tri_cho_phep;
  const placeholder = placeholderCua(spec);
  switch (spec.kieu) {
    case "so":
      return (
        <input
          type="number"
          step="any"
          aria-label={nhan}
          value={typeof value === "number" ? String(value) : ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={O_NHAP}
        />
      );
    case "chu_dai":
      return (
        <textarea
          aria-label={nhan}
          rows={3}
          value={typeof value === "string" ? value : ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${O_NHAP} resize-y`}
        />
      );
    case "chon_1":
      if (!cho) {
        return (
          <input
            aria-label={nhan}
            value={typeof value === "string" ? value : ""}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
            className={O_NHAP}
          />
        );
      }
      return (
        <div role="radiogroup" aria-label={nhan} className="flex flex-wrap items-center gap-1.5">
          {cho.map((o) => (
            <label key={o} className={RADIO}>
              <input type="radio" name={name} checked={value === o} onChange={() => onChange(o)} className="accent-ef-xanh" />
              {o}
            </label>
          ))}
          <button type="button" disabled={value === null} onClick={() => onChange(null)} className="px-2 text-[13px] text-ef-phu underline disabled:no-underline disabled:opacity-40">
            Bỏ chọn
          </button>
        </div>
      );
    case "chon_nhieu": {
      const dang = Array.isArray(value) ? (value as string[]) : [];
      if (!cho) return <TheNhieuGiaTri value={dang} onChange={onChange} placeholder={placeholder} nhan={nhan} />;
      return (
        <div className="flex flex-col gap-1.5">
          {cho.map((o) => (
            <label key={o} className={`${RADIO} items-start`}>
              <input
                type="checkbox"
                checked={dang.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...dang, o] : dang.filter((x) => x !== o))}
                className="mt-1 accent-ef-xanh"
              />
              {o}
            </label>
          ))}
        </div>
      );
    }
    default:
      return (
        <input
          aria-label={nhan}
          value={typeof value === "string" ? value : ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={O_NHAP}
        />
      );
  }
}
