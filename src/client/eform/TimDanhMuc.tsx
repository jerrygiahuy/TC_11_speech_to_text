"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { searchCatalog } from "@/shared/match";
import type { CatalogItem, VietTat } from "@/shared/types";

/** Số dòng tối đa trong danh sách thả xuống; danh mục thuốc có hàng nghìn mục nên phải gõ để lọc */
const SO_DONG = 30;

/**
 * Ô gõ để tìm trong danh mục (dịch vụ, thuốc, ICD10), thay cho select vì danh mục thật có hàng nghìn mục.
 * Chưa gõ gì thì hiện `goiY` (ứng viên AI tìm được) hoặc các mục đầu danh mục (danh mục bệnh viện đứng trước).
 */
export function TimDanhMuc<T extends CatalogItem>({
  items,
  vietTat,
  onPick,
  ariaLabel,
  placeholder,
  className,
  goiY,
  loaiTru,
  giaTri,
}: {
  items: T[];
  vietTat: VietTat;
  onPick: (item: T) => void;
  ariaLabel: string;
  placeholder: string;
  className: string;
  goiY?: T[];
  loaiTru?: string[];
  /** Chữ hiện trong ô khi đang không tìm, ví dụ mã đang chọn */
  giaTri?: string;
}) {
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = useDeferredValue(q);

  const ketQua = useMemo(() => {
    const boQua = new Set(loaiTru ?? []);
    const nguon = query.trim()
      ? searchCatalog(query, items, vietTat, SO_DONG + boQua.size).map((entry) => entry.item as T)
      : goiY && goiY.length > 0
        ? goiY
        : items.slice(0, SO_DONG + boQua.size);
    return nguon.filter((item) => !boQua.has(item.ma)).slice(0, SO_DONG);
  }, [query, items, vietTat, goiY, loaiTru]);

  const chon = (item: T | undefined) => {
    if (!item) return;
    onPick(item);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && ketQua[active] ? `${listId}-${active}` : undefined}
        value={open ? q : (giaTri ?? "")}
        placeholder={open && giaTri ? giaTri : placeholder}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, ketQua.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            chon(ketQua[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-ef-vien bg-white py-1 text-[13px] shadow-lg"
        >
          {ketQua.length === 0 && <li className="px-3 py-2 text-ef-phu">Không tìm thấy trong danh mục.</li>}
          {ketQua.map((item, index) => (
            <li
              key={item.ma}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // Giữ focus ở ô nhập để onBlur không đóng danh sách trước khi chọn
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => chon(item)}
              className={`flex cursor-pointer flex-wrap items-baseline gap-x-1.5 px-3 py-1.5 ${index === active ? "bg-ef-xanh/10" : ""}`}
            >
              <span className="font-semibold">{item.ma}</span>
              <span>– {item.ten}</span>
              {item.ham_luong && <span>{item.ham_luong}</span>}
              {item.dang_bao_che && <span className="text-xs text-ef-phu">{item.dang_bao_che}</span>}
              {item.uu_tien && (
                <span className="rounded-full bg-ef-nen px-1.5 text-[11px] font-semibold text-ef-dam ring-1 ring-ef-vien" title="Có trong danh mục bệnh viện">
                  DM BV
                </span>
              )}
            </li>
          ))}
          {ketQua.length === SO_DONG && <li className="px-3 py-1.5 text-xs text-ef-phu">Gõ thêm để lọc, chỉ hiện {SO_DONG} kết quả đầu.</li>}
        </ul>
      )}
    </div>
  );
}
