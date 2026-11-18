"use client";

import type { ReactNode } from "react";
import { useEform } from "@/client/eform/EformContext";
import type { Nguon } from "@/shared/eform/types";

// Kiểu nút và ô nhập dùng chung cho cả trang eForm
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ef-xanh";
export const BTN_OUTLINE = `rounded-md border border-ef-vien bg-white px-2.5 py-1 text-[13px] font-medium text-ef-chu hover:border-ef-phu/50 hover:bg-ef-nen disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
export const BTN_AI = `rounded-md border border-tim-vien bg-white px-2.5 py-1 text-[13px] font-medium text-tim hover:bg-tim-nhat disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
export const BTN_CHINH = `rounded-md bg-ef-xanh px-4 py-2 text-sm font-semibold text-white hover:bg-ef-dam disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
/** Bảng trong phiếu: đầu bảng xám nhạt, chỉ kẻ ngang */
export const TH = "border-b border-ef-vien bg-ef-nen px-3 py-2 text-left text-xs font-semibold text-ef-phu";
export const TD = "border-b border-ef-vien/70 px-3 py-2 align-top";

const INPUT_BASE =
  "w-full rounded-md border px-3 py-2 text-sm leading-6 text-ef-chu outline-none transition-[border-color,box-shadow] focus:border-ef-xanh focus:ring-2 focus:ring-ef-xanh/20 disabled:cursor-not-allowed disabled:opacity-70";

// Vạch màu bên trái ô cho biết nguồn: tím là AI điền, vàng là AI chưa chắc
export function inputClass(nguon: Nguon | null) {
  if (nguon === "ai") return `${INPUT_BASE} border-tim-vien bg-tim-nhat shadow-[inset_3px_0_0_var(--ai_tim)]`;
  if (nguon === "xem") return `${INPUT_BASE} border-xem/50 bg-xem-nhat shadow-[inset_3px_0_0_var(--xem)]`;
  if (nguon === "cu") return `${INPUT_BASE} border-ef-vien bg-ef-nen/60`;
  return `${INPUT_BASE} border-ef-vien bg-white`;
}

/** id của khối bao quanh một trường, để cột Trợ lý AI cuộn tới */
export function anchorId(id: string) {
  return `truong-${id}`;
}

const BADGE = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-px text-[11px] font-semibold";

export function SourceBadge({ nguon }: { nguon: Nguon | null }) {
  if (nguon === "ai") return <span className={`${BADGE} bg-tim-nhat text-tim ring-1 ring-tim-vien`}>✨ AI điền</span>;
  if (nguon === "xem") return <span className={`${BADGE} bg-xem-nhat text-xem ring-1 ring-xem/40`}>⚠ AI chưa chắc, cần xem lại</span>;
  if (nguon === "sua") return <span className={`${BADGE} bg-ef-dam/10 text-ef-dam`}>Đã sửa</span>;
  return null;
}

export function BcytTag() {
  return (
    <span className="text-xs font-normal text-ef-xanh" title="Trường này được ghép thẳng vào báo cáo y tế">
      (Hiển thị trên báo cáo y tế)
    </span>
  );
}

/** Nút bỏ đánh dấu "cần xem lại" ngay tại trường, bác sĩ không phải sang cột Trợ lý AI */
function XacNhanButton({ id }: { id: string }) {
  const { get, put } = useEform();
  return (
    <button
      type="button"
      title="Giá trị đã đúng, bỏ đánh dấu cần xem lại"
      onClick={() => put(id, get(id).value, "ai")}
      className={`rounded-full border border-xem/50 bg-white px-2 py-px text-[11px] font-semibold text-xem hover:bg-xem-nhat ${FOCUS}`}
    >
      ✓ Đúng
    </button>
  );
}

export function FieldLabel({ label, nguon, bcyt, id }: { label: string; nguon?: Nguon | null; bcyt?: boolean; id?: string }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-[13px] font-semibold text-ef-chu">{label}</span>
      {bcyt && <BcytTag />}
      <SourceBadge nguon={nguon ?? null} />
      {id && nguon === "xem" && <XacNhanButton id={id} />}
    </span>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-ef-vien bg-white">
      <h2 className="border-b border-ef-vien px-5 py-3 text-[15px] font-semibold text-ef-dam">{title}</h2>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  );
}

/** Nhóm trường con trong một mục, ví dụ Khám lâm sàng */
export const NHOM = "space-y-4 rounded-lg border border-ef-vien/80 bg-ef-nen/40 p-4";

interface TextBoxProps {
  id: string;
  label: string;
  rows?: number;
  bcyt?: boolean;
  /** Nút đặt cùng hàng với nhãn */
  actions?: ReactNode;
  /** Nội dung đặt ngay dưới ô nhập */
  children?: ReactNode;
}

export function TextBox({ id, label, rows = 2, bcyt, actions, children }: TextBoxProps) {
  const { get, edit } = useEform();
  const field = get(id);
  return (
    <div id={anchorId(id)} className="scroll-mt-44">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <FieldLabel id={id} label={label} nguon={field.nguon} bcyt={bcyt} />
        {actions && <div className="flex flex-wrap gap-1.5">{actions}</div>}
      </div>
      <textarea
        aria-label={label}
        rows={rows}
        value={field.value}
        onChange={(e) => edit(id, e.target.value)}
        className={inputClass(field.nguon)}
      />
      {children}
    </div>
  );
}

/** Lựa chọn dạng thẻ: ô đang chọn viền xanh, nền xanh nhạt */
export const RADIO =
  "flex cursor-pointer items-center gap-1.5 rounded-md border border-ef-vien bg-white px-2.5 py-1.5 text-[13px] text-ef-chu hover:border-ef-phu/50 has-checked:border-ef-xanh has-checked:bg-ef-xanh-nhat has-checked:font-medium has-focus-visible:ring-2 has-focus-visible:ring-ef-xanh/30 has-disabled:cursor-not-allowed has-disabled:opacity-60";

export function RadioField({ id, label, options }: { id: string; label: string; options: string[] }) {
  const { get, edit } = useEform();
  const field = get(id);
  return (
    <fieldset id={anchorId(id)} className="scroll-mt-44">
      <legend className="mb-1">
        <FieldLabel id={id} label={label} nguon={field.nguon} />
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label key={option} className={RADIO}>
            <input
              type="radio"
              name={id}
              checked={field.value === option}
              onChange={() => edit(id, option)}
              className="accent-ef-xanh"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ReadonlyItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[13px] font-semibold text-ef-chu">{label}</div>
      <div className="rounded-md bg-ef-nen px-3 py-2 text-sm leading-6 text-ef-phu">{value}</div>
    </div>
  );
}

/** Nút thư viện mẫu câu tĩnh: bấm một mẫu để thêm vào cuối ô */
export function ThuVienButton({ id }: { id: string }) {
  const { data, append } = useEform();
  const items = data.thuVien[id] ?? [];
  return (
    <details className="relative">
      <summary className={`${BTN_OUTLINE} cursor-pointer list-none`}>Mở thư viện tham khảo</summary>
      <div className="absolute right-0 z-10 mt-1 w-80 max-w-[80vw] rounded-lg border border-ef-vien bg-white p-1 shadow-lg">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => append(id, item)}
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-ef-nen"
          >
            {item}
          </button>
        ))}
      </div>
    </details>
  );
}
