import assert from "node:assert/strict";
import { test } from "node:test";
import { danhGiaMotCau, phanVi } from "./danh-gia";

test("đếm bắt được và che nhầm theo dạng gấp", () => {
  assert.deepEqual(danhGiaMotCau("chị [NGƯỜI_1] sốt [NGƯỜI_2]", ["Nguyễn Thị Lan"], ["sốt cao"]), { bat_duoc: 1, tong_phai_che: 1, che_nham: 1 });
  assert.deepEqual(danhGiaMotCau("chị lan sốt cao", ["lan"], ["sốt cao"]), { bat_duoc: 0, tong_phai_che: 1, che_nham: 0 });
});

test("so theo ranh giới từ: 'lan' còn trong 'lan tỏa' không tính là đã che", () => {
  assert.equal(danhGiaMotCau("đau lan tỏa", ["lan"], []).bat_duoc, 0);
  assert.equal(danhGiaMotCau("đau [NGƯỜI_1] tỏa", ["lan"], []).bat_duoc, 1);
  assert.equal(danhGiaMotCau("thanh lan đến", ["lan"], []).bat_duoc, 0);
  assert.equal(danhGiaMotCau("[NGƯỜI_1] thanh đến", ["thanh"], []).bat_duoc, 0);
});

test("phân vị p50/p95", () => {
  assert.deepEqual(phanVi([5, 1, 3, 2, 4]), { p50: 3, p95: 5 });
  assert.deepEqual(phanVi([]), { p50: 0, p95: 0 });
});
