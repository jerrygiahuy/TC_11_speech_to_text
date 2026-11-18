// Dữ liệu trang /trinh-dien: cùng ca giả với trang eForm, thêm kịch bản cho 4 kiểu tương tác (data/eform/trinh-dien.json).
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { runPipeline } from "@/server/ai/pipeline";
import { loadCases, loadCatalogs, loadForms, loadRules, loadVietTat } from "./config";
import { loadEformData } from "./eform";
import { dienPhieu } from "@/shared/eform/dien-phieu";
import { matchCatalog } from "@/shared/match";
import type { DonDaKe } from "@/shared/eform/thoi-quen";
import type { EformData, TrinhDienData } from "@/shared/eform/types";

/** Chẩn đoán chọn sẵn cho kiểu 2, 3; trùng chẩn đoán của câu mẫu và các đơn đã kê giả */
const ICD_TRINH_DIEN = "H66.1";

type FileTrinhDien = Omit<TrinhDienData, "phieuMau" | "icd" | "hoiThoai"> & {
  hoi_thoai: TrinhDienData["hoiThoai"];
  thoi_quen: DonDaKe[];
};

export async function loadTrinhDienData(): Promise<EformData> {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "eform", "trinh-dien.json");
  const goc = JSON.parse(fs.readFileSync(file, "utf8")) as FileTrinhDien;
  const data = loadEformData();
  const vietTat = loadVietTat();

  // Đơn đã kê giả chỉ ghi tên; mã gán bằng code khớp danh mục như bộ mẫu gợi ý
  const ganMa = <T extends { ma: string; ten: string; ham_luong?: string }>(rows: T[], danhMuc: typeof data.danhMuc.thuoc) =>
    rows.map((row) => ({ ...row, ma: matchCatalog(row.ten, row.ham_luong ?? null, danhMuc, vietTat).item?.ma ?? "" }));
  const thoiQuen = goc.thoi_quen.map((don) => ({
    ...don,
    chi_dinh: ganMa(don.chi_dinh, data.danhMuc.dichVu),
    don_thuoc: ganMa(don.don_thuoc, data.danhMuc.thuoc),
  }));

  // Câu mẫu chạy chế độ mock (kết quả soạn sẵn), không gọi LLM dù LLM_PROVIDER là gì
  const ctx = { forms: loadForms(), catalogs: loadCatalogs(), vietTat, rules: loadRules(), cases: loadCases() };
  const ketQuaMau = await runPipeline(data.cauMau.noi, ctx, { provider: "mock" });
  const giaTri = data.ca.gia_tri;
  const phieuMau = dienPhieu(ketQuaMau.draft, ketQuaMau.matches, data, (id) => ({
    value: giaTri[id] ?? "",
    nguon: giaTri[id] ? "cu" : null,
  }));

  return {
    ...data,
    thoiQuen,
    trinhDien: { kieu: goc.kieu, lenh: goc.lenh, hoiThoai: goc.hoi_thoai, phieuMau, icd: ICD_TRINH_DIEN },
  };
}
