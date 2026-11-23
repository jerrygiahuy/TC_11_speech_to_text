import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import type { DemoEvent } from "@/shared/demo-luong/types";
import { createDemoPhieu, demoStore, type DemoStore } from "./store";
import { runDemoFlow } from "./flow";

/**
 * Kịch bản demo (chữ kiểu STT thật: viết thường, không dấu hai chấm, không nhãn) chạy qua đúng luồng mà /api/demo-luong dùng,
 * rồi so từng ô của phiếu với `data/demo-luong/kich-ban/expected/*.expected.json` (dựng từ nội dung hội thoại theo
 * bảng ánh xạ trường, không từ đầu ra của mock). Cùng kiểu so với `nghiem-thu-tim-mach.test.ts`.
 */
process.env.PII_NER = "off";
const parent = fs.mkdtempSync(path.join(os.tmpdir(), "demo-kich-ban-phieu-"));
let count = 0;
const newStore = () => demoStore(path.join(parent, `s${++count}`));
after(() => fs.rmSync(parent, { recursive: true, force: true }));

interface Mong {
  kich_ban: string; benh_nhan_id: string; ai_route?: string; provider?: string;
  fields: Record<string, string>; tai_kham_sau_ngay?: number;
  thuocDangDung?: { ten: string; ham_luong: string; cach_dung: string }[]; chiDinh?: unknown[];
  sinh_hieu?: { mach: number; ha_tam_thu: number; ha_tam_truong: number; spo2: number };
}
const mong = (id: string): Mong => JSON.parse(fs.readFileSync(`data/demo-luong/kich-ban/expected/${id}.expected.json`, "utf8"));
/** Chữ cần so: không phân biệt hoa thường, bỏ dấu câu và khoảng trắng thừa (mock giữ nguyên chữ STT, expected viết có dấu câu). */
const gon = (value: string) => value.normalize("NFC").toLocaleLowerCase("vi").replace(/[.,;:!?]+/gu, " ").replace(/\s+/gu, " ").trim();
const congNgay = (value: string, ngay: number) => new Date(Date.parse(`${value.slice(0, 10)}T00:00:00Z`) + ngay * 86400000).toISOString().slice(0, 10);

async function chay(store: DemoStore, id: string, patientId: string) {
  const phieu = createDemoPhieu(store, patientId);
  const events: DemoEvent[] = [];
  for await (const e of runDemoFlow(store, { encounterId: phieu.encounter_id, source: { kind: "kich_ban", id } })) events.push(e);
  const luu = events.find(e => e.buoc === "luu");
  assert.ok(luu && luu.trang_thai === "xong", JSON.stringify(events.map(e => [e.buoc, e.trang_thai])));
  const ai = events.find(e => e.buoc === "ai");
  assert.ok(ai && ai.trang_thai === "xong");
  return { phieu: (luu.du_lieu as { phieu: ReturnType<typeof createDemoPhieu> }).phieu, events, record: store.repo.read(phieu.encounter_id) };
}

function soSanh(snapshot: ReturnType<typeof createDemoPhieu>["snapshot"], expected: Mong, nhan: string) {
  const lech: string[] = [];
  for (const [id, can] of Object.entries(expected.fields)) {
    const co = snapshot.fields[id]?.value ?? "";
    if (id === "hen_tai_kham" || id === "di_ung" || id === "thuoc_dang_dung" || id === "icd_ban_dau" ? co !== can : gon(co) !== gon(can)) lech.push(`${id}: có "${co}" / cần "${can}"`);
  }
  if (expected.tai_kham_sau_ngay !== undefined) {
    const mongNgay = congNgay(snapshot.fields.thoi_gian_kham.value, expected.tai_kham_sau_ngay);
    if (snapshot.fields.ngay_tai_kham.value !== mongNgay) lech.push(`ngay_tai_kham: có "${snapshot.fields.ngay_tai_kham.value}" / cần "${mongNgay}"`);
  }
  assert.deepEqual(lech, [], `${nhan}: trường lệch với expected`);
}

for (const id of ["ca-chuan", "ca-tu-che"]) {
  test(`kich_ban_phieu_${id}: phiếu điền đúng từng ô theo expected`, async () => {
    const expected = mong(id);
    const { phieu, events, record } = await chay(newStore(), id, expected.benh_nhan_id);
    soSanh(phieu.snapshot, expected, id);
    // Thuốc đang dùng: tên, hàm lượng, cách dùng (tiền sử, không phải đơn mới).
    assert.deepEqual((phieu.snapshot.thuocDangDung ?? []).map(r => ({ ten: gon(r.ten), ham_luong: gon(r.ham_luong), cach_dung: gon(r.cach_dung) })),
      (expected.thuocDangDung ?? []).map(r => ({ ten: gon(r.ten), ham_luong: gon(r.ham_luong), cach_dung: gon(r.cach_dung) })));
    assert.deepEqual(phieu.snapshot.chiDinh, []);
    // Ô AI điền không có chữ giữ chỗ che PII và không dính cụm mở đầu mục.
    for (const [key, field] of Object.entries(phieu.snapshot.fields)) if (field.value) assert.equal(/\[[A-ZÀ-Ỵ_0-9]+\]/u.test(field.value), false, `${key}: ${field.value}`);
    assert.doesNotMatch(phieu.snapshot.fields.kham_tim_mach_ho_hap.value, /^\s*khám tim phổi/iu);
    assert.doesNotMatch(phieu.snapshot.fields.loi_dan.value, /^\s*lời dặn/iu);
    // AI không ghi đè sinh hiệu: sinh hiệu vẫn là của fixture, không có cảnh báo lệch (hội thoại đọc đúng số fixture).
    const sh = record.sinh_hieu;
    assert.deepEqual({ mach: sh.mach?.value, ha_tam_thu: sh.ha_tam_thu?.value, ha_tam_truong: sh.ha_tam_truong?.value, spo2: sh.spo2?.value }, expected.sinh_hieu);
    const ai = events.find(e => e.buoc === "ai")!;
    const draft = (ai.du_lieu as { extraction: { draft: { can_xem_lai: { loai: string }[] } } }).extraction.draft;
    assert.ok(draft.can_xem_lai.every(item => item.loai !== "mau_thuan"));
    // Mã ICD ra viện không bao giờ được chép từ chẩn đoán ban đầu; mọi ô AI điền ở nguồn "ai".
    assert.equal(phieu.snapshot.fields.icd_ra_vien.value, "");
    assert.equal(phieu.snapshot.fields.mo_ta_ra_vien.value, "");
    for (const [key, value] of Object.entries(expected.fields)) if (value) assert.equal(phieu.sources[key]?.nguon, "ai", `${key} phải ghi nguồn AI`);
  });
}

test("kich_ban_phieu_ca-chua-dong-y: không gửi AI ngoài, dữ liệu chỉ chạy cục bộ", async () => {
  const expected = mong("ca-chua-dong-y");
  const { phieu, events } = await chay(newStore(), "ca-chua-dong-y", expected.benh_nhan_id);
  const che = events.find(e => e.buoc === "che")!.du_lieu as { ai_route: string; dong_y: { trang_thai: boolean } };
  assert.equal(che.ai_route, expected.ai_route);
  assert.equal(che.dong_y.trang_thai, false);
  const ai = events.find(e => e.buoc === "ai")!.du_lieu as { provider: string };
  assert.equal(ai.provider, expected.provider);
  const luu = events.find(e => e.buoc === "luu")!.du_lieu as { audit: { ai_route: string } };
  assert.equal(luu.audit.ai_route, "local_only");
  soSanh(phieu.snapshot, expected, "ca-chua-dong-y");
});
