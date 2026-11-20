// Kiểu dữ liệu của trang mô phỏng eForm ngoại trú.
import type { CatalogItem, VietTat, WarningRules } from "../types";
import type { BangSuaChu } from "../giong-noi/sua-chu";
import type { MauGoiY } from "./goi-y";
import type { DonDaKe } from "./thoi-quen";
import type { KetQuaDien } from "./dien-phieu";
import type { PhieuMau } from "./phieu-mau";

/** cu: dữ liệu có sẵn; ai: AI thêm; xem: AI thêm nhưng chưa chắc, bác sĩ cần xem lại;
 * sua: dữ liệu cũ hoặc AI đã bị bác sĩ sửa; bs: bác sĩ tự nhập */
export type Nguon = "cu" | "ai" | "xem" | "sua" | "bs";

export interface Truong {
  value: string;
  nguon: Nguon | null;
}

export interface DongLichSu {
  ngay: string;
  bac_si: string;
  khoa: string;
  noi_dung: string;
}

/** Một dòng thuốc người bệnh đang dùng, bác sĩ nhập trên phiếu (nút "+ Thêm thuốc") */
export interface DongThuocDangDung {
  ten: string;
  ham_luong: string;
  cach_dung: string;
}

export interface DongDiUng {
  ngay: string;
  loai_phieu: string;
  loai: string;
  thong_tin: string;
  nguoi: string;
}

/** Thiếu số đo thì để null (chưa đo), không đoán. */
export interface SinhHieu {
  mach: number | null;
  nhiet_do: number | null;
  ha_tam_thu: number | null;
  ha_tam_truong: number | null;
  spo2: number | null;
  nhip_tho: number | null;
  chieu_cao: number | null;
  can_nang: number | null;
  bmi: number | null;
}

/** Một dòng thuốc trong lịch sử dùng thuốc của người bệnh (bảng Excel "lich_su_thuoc"). */
export interface DongThuocLichSu {
  ten_thuoc: string;
  lieu: string;
  duong_dung: string;
  ngay: string;
}

export interface KetQuaTheoNgay {
  ngay: string;
  muc: Array<{
    nhom?: string;
    bo_xet_nghiem?: string;
    ten: string;
    ket_qua: string;
    tham_chieu?: string;
    don_vi?: string;
    thoi_gian?: string;
    nguoi_tra_ket_qua?: string;
    ket_luan?: string;
  }>;
}

export interface CaGia {
  dang_nhap: string;
  co_so: string;
  pid: string;
  ma_luot_kham: string;
  ho_ten: string;
  gioi_tinh: string;
  canh_bao_di_ung: string;
  chinh_sua_cuoi: { nguoi: string; luc: string };
  danh_gia_ban_dau: { nhan: string; gia_tri: string }[];
  sinh_hieu: SinhHieu;
  bac_si_kham: string;
  phong_kham: string;
  bac_si_chinh: string;
  trang_thai: string;
  lich_su: {
    tien_su_ban_than: DongLichSu[];
    tien_su_gia_dinh: DongLichSu[];
    benh_su: DongLichSu[];
    di_ung: DongDiUng[];
    thuoc: DongThuocLichSu[];
  };
  /** Chẩn đoán xác định ở bảng ra viện của lượt khám trước (hiển thị, không phải chẩn đoán của phiếu này) */
  chan_doan_oh: string;
  xet_nghiem: KetQuaTheoNgay[];
  chan_doan_hinh_anh: KetQuaTheoNgay[];
  can_lam_sang: KetQuaTheoNgay[];
  dong_bo_cls: string;
  /** Giá trị có sẵn của các trường trong form, theo id trường */
  gia_tri: Record<string, string>;
}

export interface Icd10 {
  ma: string;
  ten: string;
  /** Từ khóa đặc trưng, điểm cao */
  manh: string[];
  /** Từ khóa gợi ý, điểm thấp */
  vua: string[];
}

export interface TuyChon {
  trang_thai: string[];
  tinh_trang_ra_vien: string[];
  loai_di_ung: string[];
}

export type VungKham = "toan_than" | "tim_mach_ho_hap";

/** Thư viện câu khám, mỗi vùng một danh sách câu (nạp từ data/cardiology/exam-library.json) */
export interface MauCauData {
  theoVung: Record<VungKham, string[]>;
}

export interface QuyTacAi {
  tom_tat: {
    /** Độ giống tối thiểu để gộp hai ý, từ 0 đến 1 */
    nguong_giong: number;
    so_y_toi_da: number;
    /** Ý chứa các cụm này không đưa vào tóm tắt */
    bo_qua: string[];
  };
  icd: {
    diem_manh: number;
    diem_vua: number;
    /** Tin cậy = điểm / (điểm + hệ số), chỉ là số mô phỏng */
    he_so: number;
    tran_tin_cay: number;
    nguong_tin_cay: number;
    so_goi_y: number;
  };
  phu_dinh: {
    tu: string[];
    /** Cụm có từ phủ định nhưng không phủ định triệu chứng, ví dụ "không đỡ" */
    ngoai_le: string[];
    /** Số từ đứng trước triệu chứng được xét phủ định */
    cua_so: number;
  };
}

export interface EformData {
  ca: CaGia;
  icd10: Icd10[];
  thuVien: Record<string, string[]>;
  tuyChon: TuyChon;
  quyTac: QuyTacAi;
  mauCau: MauCauData;
  /** Danh mục dịch vụ và thuốc: danh mục bệnh viện (data/catalog/) ghép danh mục thật (data/tham-khao/) */
  danhMuc: { dichVu: CatalogItem[]; thuoc: CatalogItem[] };
  /** Từ viết tắt (config/viet-tat.json), để ô tìm danh mục hiểu "tha", "ecg"... */
  vietTat: VietTat;
  canhBao: WarningRules;
  /** Bộ mẫu chỉ định và đơn thuốc theo chẩn đoán, mã đã gán bằng src/shared/match.ts */
  goiY: MauGoiY[];
  /** Nhà cung cấp AI đang dùng (mock, anthropic, openai, gemini) */
  provider: string;
  /** Câu mẫu của ca giả này (lấy từ data/cases/ca-01-tang-huyet-ap.json) để demo nhanh; id ghi vào số đo lượt thử */
  cauMau: { id: string; noi: string; goTat: string };
  /** Bảng sửa chữ nhận dạng giọng nói (config/sua-chu-giong-noi.json), áp vào từng câu trước khi đưa vào ô nhập */
  suaChu: BangSuaChu;
  /** Các lần tài khoản đang đăng nhập (ca.dang_nhap) đã Lưu đơn, để gợi ý theo thói quen */
  thoiQuen: DonDaKe[];
  /** Phiếu mẫu theo bệnh (data/eform/phieu-mau.json), mã đã gán ở server */
  phieuMau: PhieuMau[];
  /** Chỉ có ở trang /trinh-dien: không ghi gì khi Lưu, có kịch bản cho 4 kiểu tương tác */
  trinhDien?: TrinhDienData;
}

/** Một kiểu tương tác trong trang trình diễn (data/eform/trinh-dien.json) */
export interface KieuTuongTac {
  so: KichBan;
  ten: string;
  giong_nhu: string;
  luc_nao: string;
  bac_si_lam: string;
  may_lam: string;
  kiem_tra: string;
}

export type KichBan = 1 | 2 | 3 | 4;

export interface TrinhDienData {
  kieu: KieuTuongTac[];
  /** Câu lệnh ngắn cho kiểu 3 */
  lenh: string;
  /** Hội thoại giả cho kiểu 4, phát lại từng câu */
  hoiThoai: { ai: "BS" | "BN"; cau: string }[];
  /**
   * Nháp AI của câu mẫu (chế độ mock) đã đổ vào phiếu ở server, để kiểu 1 mở ra đã có nháp mà không gọi LLM.
   * Tính sẵn ở server để HTML server và trình duyệt giống hệt nhau.
   */
  phieuMau: KetQuaDien;
  /** Chẩn đoán chọn sẵn cho kiểu 2 và 3 */
  icd: string;
}
