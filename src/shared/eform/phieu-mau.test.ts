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
  mau("vtg-cap", "Viêm tai giữa cấp", ["vtg cấp", "vtgc"]),
  mau("vtg-man", "Viêm tai giữa mạn đợt cấp", ["vtg mạn"]),
  mau("vh-cap", "Viêm họng cấp", ["vh cấp", "vtgc"]),
];

function pick(goi: GoiMau | null) {
  assert.ok(goi && goi.loai === "mot", `cần đúng một mẫu, nhận ${JSON.stringify(goi?.loai ?? null)}`);
  return { loai: goi.loai, id: goi.mau.id, conLai: goi.conLai };
}

test("gọi mẫu bằng tên đầy đủ", () => {
  assert.deepEqual(pick(timPhieuMau("mẫu viêm tai giữa cấp", M)), { loai: "mot", id: "vtg-cap", conLai: "" });
});

test("gọi bằng viết tắt, giữ phần chi tiết", () => {
  assert.deepEqual(pick(timPhieuMau("vtg cấp, tai T, 3n", M)), { loai: "mot", id: "vtg-cap", conLai: "tai T, 3n" });
});

test("không dấu vẫn khớp", () => {
  assert.equal(timPhieuMau("viem tai giua cap", M)?.loai, "mot");
});

test("tên dài nhất thắng", () => {
  assert.equal(pick(timPhieuMau("mẫu viêm tai giữa mạn đợt cấp", M)).id, "vtg-man");
});

test("bí danh trùng thì hỏi lại", () => {
  const goi = timPhieuMau("vtgc", M);
  assert.equal(goi?.loai, "nhieu");
  assert.deepEqual(goi?.loai === "nhieu" ? goi.cacMau.map((m) => m.id).sort() : [], ["vh-cap", "vtg-cap"]);
});

test("câu kể cả ca không kích hoạt mẫu", () => {
  assert.equal(timPhieuMau("Chị đến khám vì đau họng 2 ngày. Chẩn đoán viêm họng cấp. Kê Paracetamol.", M), null);
});

test("sau chữ mẫu ở giữa câu vẫn nhận", () => {
  assert.equal(pick(timPhieuMau("bé này điền mẫu vh cấp nhé", M)).id, "vh-cap");
});

test("chữ 'máu' không bị hiểu là 'mẫu'", () => {
  assert.equal(timPhieuMau("bệnh nhân chảy máu vh cấp", M), null);
});

test("chỉ còn từ đệm sau tên mẫu thì coi như không có chi tiết", () => {
  assert.equal(pick(timPhieuMau("mẫu vh cấp nhé", M)).conLai, "");
});

test("tên mẫu phải trọn từ", () => {
  assert.equal(timPhieuMau("vtg cấpxx", M), null);
});

test("gợi ý tên khi gõ dở", () => {
  assert.deepEqual(goiYTenMau("viêm t", M).map((m) => m.id), ["vtg-cap", "vtg-man"]);
});

test("gợi ý không chạy với chữ quá ngắn hoặc quá dài", () => {
  assert.deepEqual(goiYTenMau("v", M), []);
  assert.deepEqual(goiYTenMau("viêm ".repeat(10), M), []);
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

test("chữ 'sổ mũi' không xóa chỗ [số] chưa điền", () => {
  assert.equal(dienChoTrong("Sốt [số] độ. Huyết áp [số] mmHg.", "tai T, 3n, sổ mũi", VT), "Sốt [số] độ. Huyết áp [số] mmHg.");
});

test("'sốt 2 ngày' không thành nhiệt độ", () => {
  assert.equal(dienChoTrong("Sốt [số] độ. Đau [số] ngày.", "tai T, sốt 2 ngày", VT), "Sốt [số] độ. Đau 2 ngày.");
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
  assert.equal(dienChoTrong("Tai [phải|trái].", "vtg cấp, phải, 3n", VT), "Tai phải.");
});

test("tai, mũi, họng, amidan không còn là ngữ cảnh bên (Tim mạch)", () => {
  for (const tu of ["tai", "mũi", "họng", "amidan"]) {
    assert.equal(dienChoTrong(`Đau ${tu} [phải|trái].`, `${tu} T`, VT), `Đau ${tu} [phải|trái].`);
  }
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
  const m: PhieuMau = { ...M[0], icd: "H66.0", ketQua: { ...M[0].ketQua, draft: { phieu_kham: { chan_doan_chinh: "Viêm tai giữa cấp tai [phải|trái|2 bên]" } } } };
  assert.equal(icdTheoMau(m, { phieu_kham: { chan_doan_chinh: "Viêm tai giữa cấp tai trái" } }), "H66.0");
});

test("icdTheoMau bỏ mã mẫu khi LLM đổi chẩn đoán", () => {
  const m: PhieuMau = { ...M[2], icd: "J02.9", ketQua: { ...M[2].ketQua, draft: { phieu_kham: { chan_doan_chinh: "Viêm họng cấp" } } } };
  assert.equal(icdTheoMau(m, { phieu_kham: { chan_doan_chinh: "Viêm amidan cấp" } }), undefined);
});
