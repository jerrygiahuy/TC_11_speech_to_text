// Kiểu dữ liệu dùng chung cho server, giao diện và script chấm điểm.

export type FieldType = "text" | "textarea" | "number" | "select" | "date";

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  ai_fill: boolean;
  options?: string[];
  /** Trường mã: tên danh mục dùng để tra (dich-vu, thuoc) */
  catalog?: string;
  /** Trường mã: id trường chứa tên tương ứng trong cùng dòng */
  name_field?: string;
  /** Trường mã: id trường hàm lượng tương ứng trong cùng dòng */
  strength_field?: string;
  /** Từ khóa để chế độ mock tách câu tự do */
  mock_keywords?: string[];
}

export interface FormConfig {
  id: string;
  title: string;
  system?: string;
  /** single: một bộ trường; rows: nhiều dòng */
  mode: "single" | "rows";
  mock_keywords?: string[];
  fields: FieldDef[];
}

export interface CatalogItem {
  ma: string;
  ten: string;
  ten_khac?: string[];
  hoat_chat?: string;
  ham_luong?: string;
  dang_bao_che?: string;
  /** Mục trong danh mục bệnh viện soạn tay (data/catalog/), được khớp trước danh mục thật */
  uu_tien?: boolean;
}

export type Catalogs = Record<string, CatalogItem[]>;
export type VietTat = Record<string, string>;

export interface WarningRules {
  tuoi_tre_em_duoi: number;
  truong_tuoi: string;
  truong_can_nang: string;
  form_kiem_tra_can_nang: string;
  thong_bao_thieu_can_nang: string;
  tinh_tong: {
    form: string;
    truong_tong: string;
    truong_lieu: string;
    truong_so_lan: string;
    truong_so_ngay: string;
    don_vi_dem: string[];
  };
}

export type FieldValue = string | number | null;
export type Values = Record<string, FieldValue>;
/** Bản nháp: form single là một Values, form rows là mảng Values */
export type Draft = Record<string, Values | Values[]>;

export interface CaseData {
  id: string;
  ten: string;
  hanh_chinh: Values;
  input_noi: string;
  input_go_tat: string;
  /** Phiếu mẫu tương ứng (data/eform/phieu-mau.json), cho npm run eval-mau */
  mau_id?: string;
  /** Câu ngắn kiểu bác sĩ gọi mẫu: tên tắt kèm vài chi tiết riêng của ca */
  input_mau?: string;
  expected: Draft;
}

