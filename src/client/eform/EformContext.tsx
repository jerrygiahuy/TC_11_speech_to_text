"use client";

import { createContext, useContext } from "react";
import type { DongThuocDangDung, EformData, Nguon, Truong } from "@/shared/eform/types";

export const MO_PHONG = "Chưa kết nối hệ thống thật.";

export interface EformApi {
  data: EformData;
  get: (id: string) => Truong;
  /** Bác sĩ gõ trực tiếp vào ô */
  edit: (id: string, value: string) => void;
  /** Đặt cả giá trị và nguồn, dùng khi chọn từ danh sách */
  put: (id: string, value: string, nguon: Nguon | null) => void;
  /** Thêm vào cuối ô, không ghi đè nội dung đang có */
  append: (id: string, text: string, nguon?: Nguon) => void;
  notify: (message: string) => void;
  /** Danh sách thuốc đang dùng (giữ thứ tự dòng) */
  thuoc: DongThuocDangDung[];
  datThuoc: (rows: DongThuocDangDung[]) => void;
}

export const EformContext = createContext<EformApi | null>(null);

export function useEform(): EformApi {
  const api = useContext(EformContext);
  if (!api) throw new Error("useEform phải nằm trong EformContext");
  return api;
}
