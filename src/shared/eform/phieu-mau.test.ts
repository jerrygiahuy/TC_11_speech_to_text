import assert from "node:assert/strict";
import { test } from "node:test";
import type { Draft } from "../types";
import {
  dienChoTrong,
  dienChoTrongNhap,
  goiYTenMau,
  icdTheoMau,
  ketQuaTheoQuyTac,
  timPhieuMau,
  type GoiMau,
  type PhieuMau,
} from "./phieu-mau";

const VT = { P: "phải", T: "trái", n: "ngày" };

function mau(id: string, ten: string, bi_danh: string[]): PhieuMau {
  return {
    id,
    ten,
    bi_danh,
    icd: "",
    khamKhac: "",
    ketQua: { draft: {}, matches: {}, provider: "mau", duration_ms: 0 },
  };
}

const M = [
  mau("tha-cap", "Tăng huyết áp độ 1", ["tha cấp", "thac"]),
  mau("tha-man", "Tăng huyết áp kèm đái tháo đường", ["tha mạn"]),
  mau("rn-cap", "Rung nhĩ cấp", ["rn cấp", "thac"]),
];

function pick(goi: GoiMau | null) {
  assert.ok(goi && goi.loai === "mot", `cần đúng một mẫu, nhận ${JSON.stringify(goi?.loai ?? null)}`);
  return { loai: goi.loai, id: goi.mau.id, conLai: goi.conLai };
}

test("gọi mẫu bằng tên đầy đủ", () => {
  assert.deepEqual(pick(timPhieuMau("mẫu tăng huyết áp độ 1", M)), { loai: "mot", id: "tha-cap", conLai: "" });
});

test("gọi bằng viết tắt, giữ phần chi tiết", () => {
  assert.deepEqual(pick(timPhieuMau("tha cấp, chân T, 3n", M)), { loai: "mot", id: "tha-cap", conLai: "chân T, 3n" });
});

test("không dấu vẫn khớp", () => {
  assert.equal(timPhieuMau("tang huyet ap do 1", M)?.loai, "mot");
});

test("tên dài nhất thắng", () => {
  assert.equal(pick(timPhieuMau("mẫu tăng huyết áp kèm đái tháo đường", M)).id, "tha-man");
});

test("bí danh trùng thì hỏi lại", () => {
  const goi = timPhieuMau("thac", M);
  assert.equal(goi?.loai, "nhieu");
  assert.deepEqual(goi?.loai === "nhieu" ? goi.cacMau.map((m) => m.id).sort() : [], ["rn-cap", "tha-cap"]);
});

test("câu kể cả ca không kích hoạt mẫu", () => {
  assert.equal(timPhieuMau("Chị đến khám vì đau ngực 2 ngày. Chẩn đoán rung nhĩ cấp. Kê Paracetamol.", M), null);
});

test("sau chữ mẫu ở giữa câu vẫn nhận", () => {
  assert.equal(pick(timPhieuMau("bé này điền mẫu rn cấp nhé", M)).id, "rn-cap");
});

test("chữ 'máu' không bị hiểu là 'mẫu'", () => {
  assert.equal(timPhieuMau("bệnh nhân chảy máu rn cấp", M), null);
});

test("chỉ còn từ đệm sau tên mẫu thì coi như không có chi tiết", () => {
  assert.equal(pick(timPhieuMau("mẫu rn cấp nhé", M)).conLai, "");
});

test("tên mẫu phải trọn từ", () => {
  assert.equal(timPhieuMau("tha cấpxx", M), null);
});

test("gợi ý tên khi gõ dở", () => {
  assert.deepEqual(goiYTenMau("tăng h", M).map((m) => m.id), ["tha-cap", "tha-man"]);
});

test("gợi ý không chạy với chữ quá ngắn hoặc quá dài", () => {
  assert.deepEqual(goiYTenMau("t", M), []);
  assert.deepEqual(goiYTenMau("tăng ".repeat(10), M), []);
});

test("điền bên và số", () => {
  assert.equal(
    dienChoTrong("Đau tai [phải|trái|2 bên] [số] ngày, sốt [số] độ", "bên T, 3n, sốt 38,5", VT),
    "Đau tai trái 3 ngày, sốt 38,5 độ",
  );
});

test("không hiểu thì giữ nguyên chỗ trống", () => {
  assert.equal(dienChoTrong("Đau tai [phải|trái] [số] ngày", "đau nhiều về đêm", VT), "Đau tai [phải|trái] [số] ngày");
});

test("hai lựa chọn cùng có thì giữ nguyên", () => {
  assert.equal(dienChoTrong("tai [phải|trái]", "phải đỡ, trái đau", VT), "tai [phải|trái]");
});

test("dienChoTrongNhap không sửa mẫu gốc", () => {
  const nhap: Draft = { phieu_kham: { benh_su: "Đau tai [phải|trái] [số] ngày" }, ke_don: [{ ten_thuoc: "Paracetamol", so_ngay: 3 }] };
  const ra = dienChoTrongNhap(nhap, "bên P, 5n", VT);
  assert.equal((ra.phieu_kham as Record<string, unknown>).benh_su, "Đau tai phải 5 ngày");
  assert.deepEqual(ra.ke_don, [{ ten_thuoc: "Paracetamol", so_ngay: 3 }]);
  assert.equal((nhap.phieu_kham as Record<string, unknown>).benh_su, "Đau tai [phải|trái] [số] ngày");
});

test("điền số giờ và cân nặng", () => {
  assert.equal(dienChoTrong("[số] giờ trước có dị vật. Cân nặng [số] kg.", "2 giờ, nặng 18kg", VT), "2 giờ trước có dị vật. Cân nặng 18 kg.");
});

// --- Sửa sau review ---

test("chữ 'sổ khám' không xóa chỗ [số] chưa điền", () => {
  assert.equal(dienChoTrong("Sốt [số] độ. Huyết áp [số] mmHg.", "chân T, 3n, sổ khám", VT), "Sốt [số] độ. Huyết áp [số] mmHg.");
});

test("'sốt 2 ngày' không thành nhiệt độ", () => {
  assert.equal(dienChoTrong("Sốt [số] độ. Đau [số] ngày.", "chân T, sốt 2 ngày", VT), "Sốt [số] độ. Đau 2 ngày.");
});

test("nhiệt độ ngoài khoảng thân nhiệt thì bỏ qua", () => {
  assert.equal(dienChoTrong("Sốt [số] độ.", "sốt 5", VT), "Sốt [số] độ.");
});

test("động từ 'phải' không bị hiểu là bên phải", () => {
  assert.equal(dienChoTrong("Mủ khe giữa [phải|trái|2 bên].", "vmx cấp, 7n, phải nhỏ mũi", VT), "Mủ khe giữa [phải|trái|2 bên].");
});

test("'hai bên' khớp lựa chọn '2 bên'", () => {
  assert.equal(dienChoTrong("Ngạt mũi [phải|trái|2 bên].", "ngạt mũi hai bên, bảy ngày", VT), "Ngạt mũi 2 bên.");
});

test("bên đứng riêng một vế vẫn nhận", () => {
  assert.equal(dienChoTrong("Tai [phải|trái].", "tha cấp, phải, 3n", VT), "Tai phải.");
});

test("ketQuaTheoQuyTac điền chỗ trống trên mẫu đã khớp mã, giữ mã", () => {
  const m: PhieuMau = {
    ...M[0],
    ketQua: {
      draft: { phieu_kham: { benh_su: "Đau tai [phải|trái] [số] ngày" }, ke_don: [{ ma_thuoc: "TH-001", ten_thuoc: "Augmentin" }] },
      matches: {},
      provider: "mau",
      duration_ms: 0,
    },
  };
  const kq = ketQuaTheoQuyTac(m, "bên T, 3n", VT);
  assert.equal((kq.draft.phieu_kham as Record<string, unknown>).benh_su, "Đau tai trái 3 ngày");
  assert.deepEqual(kq.draft.ke_don, [{ ma_thuoc: "TH-001", ten_thuoc: "Augmentin" }]);
  assert.equal((m.ketQua.draft.phieu_kham as Record<string, unknown>).benh_su, "Đau tai [phải|trái] [số] ngày");
});

test("icdTheoMau giữ mã mẫu khi chẩn đoán vẫn là bệnh của mẫu", () => {
  const m: PhieuMau = { ...M[0], icd: "I10", ketQua: { ...M[0].ketQua, draft: { phieu_kham: { chan_doan_chinh: "Tăng huyết áp độ 1 tai [phải|trái|2 bên]" } } } };
  assert.equal(icdTheoMau(m, { phieu_kham: { chan_doan_chinh: "Tăng huyết áp độ 1 tai trái" } }), "I10");
});

test("icdTheoMau bỏ mã mẫu khi LLM đổi chẩn đoán", () => {
  const m: PhieuMau = { ...M[2], icd: "I48.9", ketQua: { ...M[2].ketQua, draft: { phieu_kham: { chan_doan_chinh: "Rung nhĩ cấp" } } } };
  assert.equal(icdTheoMau(m, { phieu_kham: { chan_doan_chinh: "Suy tim cấp" } }), undefined);
});
