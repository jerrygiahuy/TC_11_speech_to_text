// Đo lường mỗi lượt thử. Chỉ lưu số đếm, không lưu nội dung nhập hay thông tin hành chính.

export type InputMode = "go" | "noi";

export interface SessionInput {
  kieu_nhap: InputMode;
  tu_ca_mau: boolean;
  ca_mau_id: string | null;
  /** Phiếu mẫu theo bệnh đã dùng trong lượt (data/eform/phieu-mau.json); lượt ghi trước 2026-11-12 không có */
  mau_id?: string | null;
  provider: string;
  thoi_gian_giay: number;
  so_truong_ai_dien: number;
  so_truong_sua: number;
  so_truong_bo_sung: number;
  so_muc_danh_muc: number;
  so_muc_khop: number;
  so_muc_khong_khop: number;
  so_canh_bao: number;
}

export interface SessionRecord extends SessionInput {
  id: string;
  thoi_diem: string;
}

export interface Aggregate {
  so_luot: number;
  thoi_gian_tb: number | null;
  ty_le_giu_nguyen: number | null;
  ty_le_khop: number | null;
}

export function aggregate(sessions: SessionRecord[]): Aggregate {
  const sum = (pick: (s: SessionRecord) => number) => sessions.reduce((total, s) => total + pick(s), 0);
  const filled = sum((s) => s.so_truong_ai_dien);
  const catalogItems = sum((s) => s.so_muc_danh_muc);
  return {
    so_luot: sessions.length,
    thoi_gian_tb: sessions.length > 0 ? sum((s) => s.thoi_gian_giay) / sessions.length : null,
    ty_le_giu_nguyen: filled > 0 ? (filled - sum((s) => s.so_truong_sua)) / filled : null,
    ty_le_khop: catalogItems > 0 ? sum((s) => s.so_muc_khop) / catalogItems : null,
  };
}

const CSV_COLUMNS: (keyof SessionRecord)[] = [
  "id",
  "thoi_diem",
  "kieu_nhap",
  "tu_ca_mau",
  "ca_mau_id",
  "mau_id",
  "provider",
  "thoi_gian_giay",
  "so_truong_ai_dien",
  "so_truong_sua",
  "so_truong_bo_sung",
  "so_muc_danh_muc",
  "so_muc_khop",
  "so_muc_khong_khop",
  "so_canh_bao",
];

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(sessions: SessionRecord[]): string {
  const lines = sessions.map((session) => CSV_COLUMNS.map((column) => csvCell(session[column])).join(","));
  return [CSV_COLUMNS.join(","), ...lines].join("\n");
}
