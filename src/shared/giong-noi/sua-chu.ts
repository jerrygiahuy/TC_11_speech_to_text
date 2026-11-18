// Sửa chữ nhận dạng giọng nói trước khi đưa vào ô nhập, theo bảng config/sua-chu-giong-noi.json.
// Chạy ở trình duyệt cho cả hai chế độ (Zipformer và Web Speech), và trong npm run eval-giong-noi. Ba bước:
// 1. Thay cụm model hay nghe nhầm ("thai phải" → "tai phải"), có từ đứng trước/sau để loại trừ ("có thai" giữ nguyên).
// 2. Tên thuốc, từ chuyên khoa: so gần đúng (bỏ dấu, gộp âm gần nhau) với cách bác sĩ đọc, thay bằng tên chuẩn.
// 3. Số đọc thành chữ đổi sang chữ số khi đứng trước đơn vị hoặc là số nhiều chữ: "năm trăm mi li gam" → "500 mg".
import { stripDiacritics } from "../normalize";

export interface QuyTacThay {
  sai: string[];
  dung: string;
  /** Không thay khi từ ngay trước là một trong các từ này */
  tru_khi_truoc?: string[];
  /** Không thay khi từ ngay sau là một trong các từ này */
  tru_khi_sau?: string[];
  /** Chỉ thay khi từ ngay sau là một trong các từ này */
  chi_khi_sau?: string[];
}

export interface TuChuyenKhoa {
  /** Tên chuẩn ghi vào ô nhập */
  dung: string;
  /** Cách bác sĩ đọc, viết bằng âm tiết tiếng Việt */
  doc: string[];
}

export interface BangSuaChu {
  thay: QuyTacThay[];
  tu_chuyen_khoa: TuChuyenKhoa[];
  /** Độ giống tối thiểu (0–1) để thay một cụm bằng từ chuyên khoa */
  nguong_giong: number;
  /**
   * Tên thuốc chỉ được thay khi một trong vài từ ngay sau là dấu hiệu kê đơn (uống, viên, mg, số…)
   * hoặc từ ngay trước là "đơn", "thuốc". Không có điều kiện này thì "thanh quản" bị thay thành "Tanakan".
   */
  dau_hieu_thuoc: string[];
}

const thuong = (s: string) => s.normalize("NFC").toLocaleLowerCase("vi");

// ── Bước 1: thay cụm ──────────────────────────────────────────────

function thayCum(tu: string[], bang: BangSuaChu): string[] {
  let out = tu;
  for (const quyTac of bang.thay) {
    const dung = quyTac.dung.split(" ");
    for (const sai of quyTac.sai) {
      const mau = thuong(sai).split(" ");
      const moi: string[] = [];
      for (let i = 0; i < out.length; ) {
        const khop = mau.every((m, k) => thuong(out[i + k] ?? "") === m);
        const truoc = thuong(out[i - 1] ?? "");
        const sau = thuong(out[i + mau.length] ?? "");
        const duoc =
          khop &&
          !quyTac.tru_khi_truoc?.includes(truoc) &&
          !quyTac.tru_khi_sau?.includes(sau) &&
          (!quyTac.chi_khi_sau || quyTac.chi_khi_sau.includes(sau));
        if (duoc) {
          moi.push(...dung);
          i += mau.length;
        } else moi.push(out[i++]);
      }
      out = moi;
    }
  }
  return out;
}

// ── Bước 2: tên thuốc ─────────────────────────────────────────────

/** Bỏ dấu và gộp các phụ âm đọc gần giống nhau, để "xi prô" và "si pờ rô" gần nhau */
function amGan(text: string): string {
  return stripDiacritics(thuong(text))
    .replace(/[^a-z\s]/g, "")
    .replace(/ngh/g, "ng")
    .replace(/gh/g, "g")
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/tr/g, "c")
    .replace(/ch/g, "c")
    .replace(/kh/g, "k")
    .replace(/gi|d|r/g, "z")
    .replace(/[qk]/g, "c")
    .replace(/x/g, "s")
    .replace(/y/g, "i")
    .replace(/w/g, "u");
}

function khoangCach(a: string, b: string): number {
  let truoc = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const hien = [i];
    for (let j = 1; j <= b.length; j++) {
      hien[j] = Math.min(truoc[j] + 1, hien[j - 1] + 1, truoc[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    truoc = hien;
  }
  return truoc[b.length];
}

function doGiong(a: string, b: string): number {
  const dai = Math.max(a.length, b.length);
  return dai === 0 ? 1 : 1 - khoangCach(a, b) / dai;
}

interface MauDoc {
  dung: string;
  am: string;
  soAmTiet: number;
}

const BO_NHO_MAU = new WeakMap<BangSuaChu, MauDoc[]>();

function mauDoc(bang: BangSuaChu): MauDoc[] {
  let mau = BO_NHO_MAU.get(bang);
  if (!mau) {
    mau = bang.tu_chuyen_khoa.flatMap((tu) =>
      [tu.dung, ...tu.doc].map((doc) => ({ dung: tu.dung, am: amGan(doc).replace(/\s/g, ""), soAmTiet: doc.split(" ").length })),
    );
    BO_NHO_MAU.set(bang, mau);
  }
  return mau;
}

/** Số từ phía sau được xét khi tìm dấu hiệu kê đơn */
const CUA_SO_THUOC = 4;

function thayTuChuyenKhoa(tu: string[], bang: BangSuaChu): string[] {
  const mau = mauDoc(bang);
  const am = tu.map((t) => amGan(t));
  const dauHieu = new Set(bang.dau_hieu_thuoc.map(thuong));
  const laDauHieu = (t: string) => dauHieu.has(t) || /\d/.test(t) || t in CHU_SO;
  const coNguCanh = (dau: number, cuoi: number) =>
    ["đơn", "thuốc"].includes(thuong(tu[dau - 1] ?? "")) ||
    tu.slice(cuoi, cuoi + CUA_SO_THUOC).some((t) => laDauHieu(thuong(t)));
  // Tìm mọi cụm liên tiếp giống một cách đọc, rồi chọn cụm điểm cao trước, không chồng lên nhau
  const ungVien: { dau: number; cuoi: number; dung: string; diem: number }[] = [];
  for (const m of mau) {
    for (let n = Math.max(1, m.soAmTiet - 1); n <= m.soAmTiet + 1; n++) {
      for (let i = 0; i + n <= tu.length; i++) {
        const phan = am.slice(i, i + n);
        // Cụm có số hay ký hiệu (âm rỗng) thì bỏ, nếu không "Amoxicillin 250" sẽ bị thay cả số
        if (phan.some((p) => p === "")) continue;
        const cum = phan.join("");
        if (cum.length < 5 || Math.abs(cum.length - m.am.length) > 3) continue;
        const diem = doGiong(cum, m.am);
        if (diem >= bang.nguong_giong && coNguCanh(i, i + n)) ungVien.push({ dau: i, cuoi: i + n, dung: m.dung, diem });
      }
    }
  }
  ungVien.sort((a, b) => b.diem - a.diem || a.cuoi - a.dau - (b.cuoi - b.dau));
  const daDung = new Array<boolean>(tu.length).fill(false);
  const chon: typeof ungVien = [];
  for (const u of ungVien) {
    if (daDung.slice(u.dau, u.cuoi).some(Boolean)) continue;
    for (let i = u.dau; i < u.cuoi; i++) daDung[i] = true;
    chon.push(u);
  }
  if (chon.length === 0) return tu;
  chon.sort((a, b) => a.dau - b.dau);
  const out: string[] = [];
  let i = 0;
  for (const u of chon) {
    out.push(...tu.slice(i, u.dau));
    // Đã đúng tên chuẩn (khác hoa thường) thì giữ nguyên chữ gốc
    const goc = tu.slice(u.dau, u.cuoi).join(" ");
    out.push(thuong(goc) === thuong(u.dung) ? goc : u.dung);
    i = u.cuoi;
  }
  out.push(...tu.slice(i));
  return out;
}

// ── Bước 3: số ────────────────────────────────────────────────────

const CHU_SO: Record<string, number> = { một: 1, hai: 2, ba: 3, bốn: 4, năm: 5, sáu: 6, bảy: 7, tám: 8, chín: 9 };
/** Chỉ là chữ số khi đứng sau "mươi"/"mười" */
const CHU_SO_SAU_MUOI: Record<string, number> = { mốt: 1, tư: 4, lăm: 5 };
/** Số đơn đứng trước các từ này mới đổi sang chữ số ("2 lần", "3 ngày"); "hai bên" giữ nguyên */
const DON_VI = new Set([
  "ngày", "tuần", "tháng", "năm", "giờ", "phút", "giây", "lần", "viên", "gói", "giọt", "xịt", "nhát", "ống", "chai",
  "lọ", "tuýp", "ml", "mg", "g", "gam", "mcg", "kg", "cm", "mm", "độ", "tuổi", "%", "cữ", "đợt",
]);
/** "một" trong các cụm này không phải số */
const MOT_KHONG_PHAI_SO = new Set(["số", "ít", "chút", "vài", "cách", "lúc", "khi", "mình"]);
/** "năm" đứng trước các từ này là "năm" (thời gian), không phải số 5 */
const NAM_LA_THOI_GIAN = new Set(["nay", "ngoái", "qua", "trước", "tới", "sau"]);

interface So {
  giaTri: string;
  het: number;
  /** Có từ nhân (mươi, mười, trăm, nghìn, phẩy) thì chắc là số */
  ghep: boolean;
}

/** Đọc một số bắt đầu tại vị trí i; trả null nếu không phải số */
function docSo(tu: string[], i: number): So | null {
  const t = tu.map(thuong);
  let tong = 0;
  let nho = 0;
  let chuSoCuoi = 0;
  let truoc: "so" | "muoi" | "tram" | "le" | "nghin" | null = null;
  let ghep = false;
  let j = i;
  for (; j < t.length; j++) {
    const w = t[j];
    if (w === "không" && j === i && t[j + 1] === "phẩy") {
      truoc = "so";
      chuSoCuoi = 0;
      continue;
    }
    const d = CHU_SO[w] ?? (truoc === "muoi" ? CHU_SO_SAU_MUOI[w] : undefined);
    if (d !== undefined) {
      if (truoc === "so") break;
      if (w === "một" && MOT_KHONG_PHAI_SO.has(t[j + 1] ?? "")) break;
      if (w === "năm" && NAM_LA_THOI_GIAN.has(t[j + 1] ?? "")) break;
      nho += d;
      chuSoCuoi = d;
      truoc = "so";
    } else if (w === "mười" && (truoc === null || truoc === "tram" || truoc === "le" || truoc === "nghin")) {
      nho += 10;
      truoc = "muoi";
      ghep = true;
    } else if (w === "mươi" && truoc === "so") {
      nho += chuSoCuoi * 9;
      truoc = "muoi";
      ghep = true;
    } else if (w === "trăm" && truoc === "so" && nho < 10) {
      nho *= 100;
      truoc = "tram";
      ghep = true;
    } else if ((w === "lẻ" || w === "linh") && truoc === "tram") {
      truoc = "le";
    } else if ((w === "nghìn" || w === "ngàn") && truoc !== null && truoc !== "nghin" && tong === 0) {
      tong = (nho || 1) * 1000;
      nho = 0;
      truoc = "nghin";
      ghep = true;
    } else break;
  }
  if (j === i || truoc === "le") return null;
  let giaTri = String(tong + nho);
  // Phần thập phân: "ba mươi tám phẩy năm" → 38,5
  if (t[j] === "phẩy") {
    const le = docSo(tu, j + 1);
    if (le) {
      giaTri += `,${le.giaTri}`;
      j = le.het;
      ghep = true;
    }
  }
  return { giaTri, het: j, ghep };
}

function doiSo(tu: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tu.length; ) {
    const so = docSo(tu, i);
    const sau = thuong(tu[so?.het ?? 0] ?? "");
    const truoc = thuong(tu[i - 1] ?? "");
    if (so && (so.ghep || DON_VI.has(sau) || truoc === "độ" || truoc === "số")) {
      out.push(so.giaTri);
      i = so.het;
    } else out.push(tu[i++]);
  }
  return out;
}

/** Sửa một câu nhận dạng được; giữ dấu câu và chữ hoa đầu câu */
export function suaChu(text: string, bang: BangSuaChu): string {
  // Dấu câu cuối từ (Web Speech có thêm) tách thành từ riêng để quy tắc vẫn khớp; "37,8" không bị tách
  const tu = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((t) => {
      const m = /^(.*?[^,;:.?!])([,;:.?!]+)$/.exec(t);
      return m ? [m[1], m[2]] : [t];
    });
  if (tu.length === 0) return text;
  const hoaDau = tu[0] !== thuong(tu[0]);
  const cau = doiSo(thayTuChuyenKhoa(thayCum(tu, bang), bang))
    .join(" ")
    .replace(/ ([,;:.?!%])/g, "$1");
  return hoaDau ? cau.charAt(0).toLocaleUpperCase("vi") + cau.slice(1) : cau;
}
