"use client";

import { useState } from "react";
import { useEform } from "@/client/eform/EformContext";
import { BTN_AI, FieldLabel, anchorId, inputClass } from "@/client/eform/fields";
import { GoiYIcdPanel } from "@/client/eform/GoiYIcdPanel";
import { TimDanhMuc } from "@/client/eform/TimDanhMuc";
import type { Icd10 } from "@/shared/eform/types";

const SEPARATOR = ",";

export function splitCodes(value: string): string[] {
  return value ? value.split(SEPARATOR) : [];
}

/** "Mã – tên" của các mã ICD10 trong ô, dùng cho báo cáo y tế và bản in */
export function nhanIcd(value: string, icd10: Icd10[]): string {
  return splitCodes(value)
    .map((code) => `${code} – ${icd10.find((item) => item.ma === code)?.ten ?? ""}`)
    .join("; ");
}

function GoiYButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={BTN_AI} aria-expanded={open} onClick={onToggle}>
      ✨ Gợi ý ICD10
    </button>
  );
}

/** Một mã ICD10 kèm ô mô tả */
export function IcdField({ id, moTaId, label }: { id: string; moTaId: string; label: string }) {
  const { data, get, put, edit } = useEform();
  const [open, setOpen] = useState(false);
  const field = get(id);
  const moTa = get(moTaId);
  return (
    <div className="space-y-3">
      <div id={anchorId(id)} className="scroll-mt-44">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <FieldLabel id={id} label={`${label} (ICD10)`} nguon={field.nguon} />
          <GoiYButton open={open} onToggle={() => setOpen((value) => !value)} />
        </div>
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <TimDanhMuc
              items={data.icd10}
              vietTat={data.vietTat}
              onPick={(item) => put(id, item.ma, "bs")}
              ariaLabel={`${label} (ICD10)`}
              placeholder={`Gõ mã hoặc tên bệnh (${data.icd10.length} mã ICD10)…`}
              giaTri={field.value ? nhanIcd(field.value, data.icd10) : undefined}
              className={inputClass(field.nguon)}
            />
          </div>
          {field.value && (
            <button type="button" aria-label={`Bỏ mã ${field.value}`} onClick={() => put(id, "", null)} className="mt-1.5 rounded px-1.5 text-ef-phu hover:text-ef-do">
              ×
            </button>
          )}
        </div>
        {open && (
          <GoiYIcdPanel
            onPick={(ma) => {
              put(id, ma, "ai");
              setOpen(false);
            }}
          />
        )}
      </div>
      <div id={anchorId(moTaId)} className="scroll-mt-44">
        <div className="mb-1">
          <FieldLabel id={moTaId} label={`Mô tả ${label.toLowerCase()}`} nguon={moTa.nguon} />
        </div>
        <textarea
          aria-label={`Mô tả ${label.toLowerCase()}`}
          rows={1}
          value={moTa.value}
          onChange={(e) => edit(moTaId, e.target.value)}
          className={inputClass(moTa.nguon)}
        />
      </div>
    </div>
  );
}

/** Nhiều mã ICD10, hiển thị thành các thẻ có nút xóa */
export function IcdMultiField({ id, label, loaiTru }: { id: string; label: string; loaiTru: string[] }) {
  const { data, get, put } = useEform();
  const [open, setOpen] = useState(false);
  const field = get(id);
  const codes = splitCodes(field.value);

  const add = (code: string, nguon: "ai" | "bs") => {
    if (code && !codes.includes(code)) put(id, [...codes, code].join(SEPARATOR), nguon);
  };
  const remove = (code: string) => {
    const next = codes.filter((item) => item !== code);
    put(id, next.join(SEPARATOR), next.length > 0 ? field.nguon : null);
  };

  return (
    <div id={anchorId(id)} className="scroll-mt-44">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <FieldLabel id={id} label={`${label} (ICD10)`} nguon={field.nguon} bcyt />
        <GoiYButton open={open} onToggle={() => setOpen((value) => !value)} />
      </div>
      {codes.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {codes.map((code) => (
            <span
              key={code}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] ring-1 ${field.nguon === "xem" ? "bg-xem-nhat ring-xem/50" : field.nguon === "ai" ? "bg-tim-nhat ring-tim-vien" : "bg-ef-nen ring-ef-vien"}`}
            >
              {code} – {data.icd10.find((item) => item.ma === code)?.ten}
              <button type="button" aria-label={`Bỏ ${code}`} onClick={() => remove(code)} className="text-ef-phu hover:text-ef-do">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <TimDanhMuc
        items={data.icd10}
        vietTat={data.vietTat}
        onPick={(item) => add(item.ma, "bs")}
        ariaLabel={`Thêm ${label.toLowerCase()}`}
        placeholder="Gõ mã hoặc tên bệnh để thêm…"
        loaiTru={codes}
        className={inputClass(null)}
      />
      {open && (
        <GoiYIcdPanel
          loaiTru={[...codes, ...loaiTru]}
          onPick={(ma) => {
            add(ma, "ai");
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
