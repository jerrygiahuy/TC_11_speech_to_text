import assert from "node:assert/strict";
import { test } from "node:test";
import { chePii } from "./index";

const none = new Set<string>();

test("chePii: nhiều đoạn, span tính trên bản thô nối \n, tự che phần sót R11 rồi qua chốt chặn", () => {
  const r = chePii(["nhà ở đường lê lợi", "hôm qua gặp lại văn hùng ở chợ", "xem lại cái đơn"], [], none);
  assert.equal(r.raw, "nhà ở đường lê lợi\nhôm qua gặp lại văn hùng ở chợ\nxem lại cái đơn");
  assert.deepEqual(r.spans.map((s) => r.raw.slice(s.start, s.end)), ["đường lê lợi"]);
  assert.deepEqual(r.parts, ["nhà ở [ĐỊA_DANH_1]", "hôm qua gặp [NGƯỜI_KHÁC] ở chợ", "xem lại cái đơn"]);
  assert.equal(r.clean, r.parts.join("\n"));
  assert.deepEqual(r.auto_masked.map((m) => m.reason), ["R11c_ten_rieng_con_sot"]);
  assert.equal(r.gate.passed, true);
});

test("chePii: một chuỗi giống một đoạn; không còn gì sót thì không tự che", () => {
  const r = chePii("đau tai phải ba ngày", [], none);
  assert.equal(r.clean, "đau tai phải ba ngày");
  assert.equal(r.auto_masked.length, 0);
  assert.equal(r.counts.R2, 0);
});
