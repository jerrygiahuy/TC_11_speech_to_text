import assert from "node:assert/strict";
import { test } from "node:test";
import { chePii, locNer } from "./index";
import { nhanNer } from "./nhan";

const ALLOW = new Set(["tăng huyết áp"]);

test("không có NER thì kết quả giống hệt bản cũ", () => {
  const t = "chị Nguyễn Thị Lan đau họng 3 ngày";
  assert.deepEqual(chePii(t, [], ALLOW), chePii(t, [], ALLOW, { spans: [[]], nguong: 0.5 }));
  assert.equal(chePii(t, [], ALLOW).ner_chap_nhan, 0);
});

test("NER thêm tên rule bỏ sót, đánh số nhãn như R10", () => {
  const t = "hôm qua lan đưa bé đi khám";
  const r = chePii(t, [], ALLOW, { spans: [[{ start: 8, end: 11, nhan: "NAME", diem: 0.9 }]], nguong: 0.5 });
  assert.equal(r.clean, "hôm qua [NGƯỜI_1] đưa bé đi khám");
  assert.equal(r.spans.find((s) => s.nguon === "ner")?.rule, "R2");
  assert.equal(r.ner_chap_nhan, 1);
});

test("NER cùng tên với R2 thì dùng chung số nhãn", () => {
  const t = "chị Nguyễn Thị Lan đến. Hôm sau Nguyễn Thị Lan quay lại";
  const r = chePii(t, [], ALLOW, { spans: [[{ start: 32, end: 46, nhan: "NAME", diem: 0.9 }]], nguong: 0.5 });
  assert.equal(r.clean, "chị [NGƯỜI_1] đến. Hôm sau [NGƯỜI_1] quay lại");
});

test("NER không gỡ được đoạn rule đã che, chồng một phần thì phần thừa vẫn che", () => {
  const t = "chị Nguyễn Thị Lan ở phường Bến Nghé";
  const base = chePii(t, [], ALLOW);
  assert.equal(chePii(t, [], ALLOW, { spans: [[{ start: 4, end: 10, nhan: "NAME", diem: 0.9 }]], nguong: 0.5 }).clean, base.clean);
  const lo = chePii("anh Tuấn Anh Khoa ở nhà", [], ALLOW, { spans: [[{ start: 4, end: 17, nhan: "NAME", diem: 0.9 }]], nguong: 0.5 });
  assert.doesNotMatch(lo.clean, /Khoa/);
});

test("bỏ đoạn dưới ngưỡng, nhãn lâm sàng, trong allowlist, vị trí sai", () => {
  const t = "tăng huyết áp nặng, sốt cao";
  const spans = [[
    { start: 0, end: 13, nhan: "NAME", diem: 0.99 },
    { start: 20, end: 27, nhan: "SYMPTOM_AND_DISEASE", diem: 0.99 },
    { start: 20, end: 27, nhan: "NAME", diem: 0.2 },
    { start: 5, end: 999, nhan: "NAME", diem: 0.9 },
    { start: 9, end: 9, nhan: "NAME", diem: 0.9 },
    { start: -1, end: 3, nhan: "NAME", diem: 0.9 },
  ]];
  assert.equal(chePii(t, [], ALLOW, { spans, nguong: 0.5 }).clean, t);
});

test("số mảng NER khác số đoạn văn thì bỏ qua NER", () => {
  const r = chePii(["lan đau", "họng đỏ"], [], ALLOW, { spans: [[{ start: 0, end: 3, nhan: "NAME", diem: 0.9 }]], nguong: 0.5 });
  assert.equal(r.ner_chap_nhan, 0);
});

test("đoạn NER của từng phần văn bản tính trên chính phần đó", () => {
  const r = chePii(["đau họng", "lan đưa đi khám"], [], ALLOW, { spans: [[], [{ start: 0, end: 3, nhan: "NAME", diem: 0.9 }]], nguong: 0.5 });
  assert.equal(r.clean, "đau họng\n[NGƯỜI_1] đưa đi khám");
});

test("locNer ánh xạ nhãn PhoNER sang rule và loại nhãn", () => {
  const t = "lan làm ở bệnh viện an bình quận năm, mã bn 123";
  const kept = locNer(t, [
    { start: 0, end: 3, nhan: "NAME", diem: 0.9 },
    { start: 10, end: 27, nhan: "ORGANIZATION", diem: 0.9 },
    { start: 28, end: 36, nhan: "LOCATION", diem: 0.9 },
    { start: 44, end: 47, nhan: "PATIENT_ID", diem: 0.9 },
    { start: 4, end: 7, nhan: "JOB", diem: 0.9 },
  ], new Set(), 0.5);
  assert.deepEqual(kept.map((k) => [k.rule, k.kind]), [["R2", "NGƯỜI"], ["R3", "NƠI_LÀM_VIỆC"], ["R3", "ĐỊA_DANH"], ["R6", "MÃ_ĐỊNH_DANH"]]);
});

test("nhanNer: một dòng trạng thái cho giao diện", () => {
  assert.equal(nhanNer({ trang_thai: "chay", so_doan: 2 }), "NER: đã chạy (2 đoạn)");
  assert.equal(nhanNer({ trang_thai: "khong_chay", so_doan: 0 }), "NER: không chạy, chỉ dùng rule");
  assert.equal(nhanNer({ trang_thai: "tat", so_doan: 0 }), "NER: tắt");
});

test("bỏ đoạn NER chỉ có một chữ cái kèm dấu câu (\"P.\" là bên phải trong ghi tắt)", () => {
  const t = "khối u sau tai P. lớn chậm, tai T bình thường";
  const p = t.indexOf("P."), tt = t.indexOf("T bình");
  assert.deepEqual(locNer(t, [{ start: p, end: p + 2, nhan: "NAME", diem: 0.98 }, { start: tt, end: tt + 1, nhan: "NAME", diem: 0.9 }], ALLOW, 0.3), []);
  const r = chePii(t, [], ALLOW, { spans: [[{ start: p, end: p + 2, nhan: "NAME", diem: 0.98 }]], nguong: 0.3 });
  assert.equal(r.clean.includes("tai P."), true);
  const id = "mã 12";
  assert.equal(locNer(id, [{ start: 3, end: 5, nhan: "PATIENT_ID", diem: 0.9 }], ALLOW, 0.3).length, 1);
});
