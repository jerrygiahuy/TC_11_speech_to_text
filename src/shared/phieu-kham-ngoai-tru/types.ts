// Kiểu của config/forms/phieu-kham-ngoai-tru.json (sinh từ Excel bởi scripts/nhap-excel-phieu-kham.py) và của bản ghi phiếu.

export type KieuTruong = "so" | "chu_ngan" | "chu_dai" | "ngay_gio" | "chon_1" | "chon_nhieu" | "bang_lap";
export type CachNhap = "tu_dong" | "chon" | "go_tay" | "chi_doc" | "bam";

export interface Cot {
  nhan: string;
  khoa: string;
  kieu: Exclude<KieuTruong, "bang_lap">;
  vi_du?: string;
  dinh_dang?: string;
  cach_nhap?: CachNhap;
  gia_tri_cho_phep?: string[];
  ghi_chu_gia_tri?: string;
}

export interface Truong {
  nhan: string;
  /** Khóa; có dấu chấm là đường dẫn lồng (vd `chan_doan_ban_dau.ma_icd10`) */
  khoa: string;
  kieu: KieuTruong;
  vi_du?: string;
  dinh_dang?: string;
  cach_nhap: CachNhap;
  bat_buoc?: string;
  ai_dien?: string;
  gia_tri_cho_phep?: string[];
  bien_doi?: string;
  ghi_chu_gia_tri?: string;
  /** Chỉ `huyet_ap`: hai khóa số tách từ chuỗi "135/80" */
  khoa_con?: string[];
  /** Chỉ bang_lap */
  cot?: Cot[];
  ghi_chu_cot?: string;
  /** Tên nút trên EMR, chỉ để hiển thị */
  nut?: string[];
}

export interface Muc {
  tieu_de: string;
  truong: Truong[];
  nut?: string[];
}

export interface Phan {
  tieu_de: string;
  muc: Muc[];
}

export interface CauHinhPhieu {
  phien_ban: number;
  phan: Phan[];
}
