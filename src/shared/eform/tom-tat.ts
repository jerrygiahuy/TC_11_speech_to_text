// Mock "AI tóm tắt": chỉ trích và gộp câu có sẵn trong lịch sử, không viết thêm nội dung.
import { normalizeVi } from "../normalize";
import type { DongLichSu, QuyTacAi } from "./types";

/** Đoạn bắt đầu bằng tiền tố này là lịch sử cũ, gợi ý ICD10 sẽ bỏ qua */
export const TIEN_TO_TOM_TAT = "Tóm tắt lịch sử";

export interface KetQuaTomTat {
  text: string;
  soLanKham: number;
  soY: number;
  /** Số ý bị lược vì vượt giới hạn độ dài */
  boBot: number;
}

interface Y {
  text: string;
  /** Các thời điểm "mm/yyyy" đã ghi nhận ý này */
  thang: string[];
  moiNhat: number;
  thuTu: number;
}

function thoiDiem(ngay: string): number {
  const [day, month, year] = ngay.split("/").map(Number);
  return Date.UTC(year, month - 1, day);
}

const tokens = (text: string) => normalizeVi(text).split(" ").filter(Boolean);

function tachY(noiDung: string): string[] {
  return noiDung
    .split(/[;\n]+|\.(?=\s|$)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Số liệu và bên phải/trái: khác nhau thì không được gộp */
function phanQuanTrong(text: string): Set<string> {
  return new Set(tokens(text).filter((token) => /\d/.test(token) || token === "phai" || token === "trai"));
}

const laTapCon = (a: Set<string>, b: Set<string>) => [...a].every((item) => b.has(item));

function giongNhau(a: string, b: string, nguong: number): boolean {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  const shared = [...left].filter((token) => right.has(token)).length;
  if ((2 * shared) / (left.size + right.size) < nguong) return false;
  const keyA = phanQuanTrong(a);
  const keyB = phanQuanTrong(b);
  return laTapCon(keyA, keyB) || laTapCon(keyB, keyA);
}

export function tomTatLichSu(rows: DongLichSu[], quyTac: QuyTacAi["tom_tat"]): KetQuaTomTat | null {
  const boQua = quyTac.bo_qua.map(normalizeVi);
  const cuTruocMoiSau = [...rows].sort((a, b) => thoiDiem(a.ngay) - thoiDiem(b.ngay));

  const danhSach: Y[] = [];
  const lanKhamCoNoiDung = new Set<string>();
  for (const row of cuTruocMoiSau) {
    const thang = row.ngay.slice(3);
    for (const text of tachY(row.noi_dung)) {
      const chuanHoa = normalizeVi(text);
      if (boQua.some((cum) => chuanHoa.includes(cum))) continue;
      lanKhamCoNoiDung.add(row.ngay);
      const trung = danhSach.find((y) => giongNhau(y.text, text, quyTac.nguong_giong));
      if (trung) {
        // Giữ câu dài hơn vì thường đủ thông tin hơn
        if (text.length > trung.text.length) trung.text = text;
        if (!trung.thang.includes(thang)) trung.thang.push(thang);
        trung.moiNhat = thoiDiem(row.ngay);
      } else {
        danhSach.push({ text, thang: [thang], moiNhat: thoiDiem(row.ngay), thuTu: danhSach.length });
      }
    }
  }
  if (danhSach.length === 0) return null;

  // Ưu tiên ý lặp lại qua nhiều lần khám, sau đó tới ý mới nhất
  const duocChon = [...danhSach]
    .sort((a, b) => b.thang.length - a.thang.length || b.moiNhat - a.moiNhat)
    .slice(0, quyTac.so_y_toi_da)
    .sort((a, b) => b.moiNhat - a.moiNhat || a.thuTu - b.thuTu);

  const dauCuoi = [...lanKhamCoNoiDung].map((ngay) => ngay.slice(3));
  const khoang = dauCuoi[0] === dauCuoi.at(-1) ? dauCuoi[0] : `${dauCuoi[0]}–${dauCuoi.at(-1)}`;
  const noiDung = duocChon.map((y) => `${y.text} (${y.thang.join(", ")})`).join("; ");
  const text = `${TIEN_TO_TOM_TAT} (${lanKhamCoNoiDung.size} lần khám, ${khoang}): ${noiDung}.`;

  return {
    text,
    soLanKham: lanKhamCoNoiDung.size,
    soY: duocChon.length,
    boBot: danhSach.length - duocChon.length,
  };
}
