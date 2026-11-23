import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { buildAuditEntry, PII_POLICY_VERSION, type PiiAuditEntry } from "@/shared/clinical/pii";
import { goiNer } from "./ner-client";

const on = { PII_NER: "on", NER_BACKEND_URL: "http://ner.test" };
const ok = (ket_qua: unknown) => Response.json({ model_sha256: "a".repeat(64), nguong: 0.6, ket_qua });

test("phiên bản chính sách là pii-auto-2", () => {
  assert.equal(PII_POLICY_VERSION, "pii-auto-2");
});

test("PII_NER=off thì không gọi mạng", async () => {
  let called = false;
  const send = (async () => { called = true; return ok([[]]); }) as typeof fetch;
  assert.deepEqual(await goiNer(["a"], { env: { PII_NER: "off" }, send }), { trang_thai: "tat" });
  assert.deepEqual(await goiNer(["a"], { env: { PII_NER: " OFF " }, send }), { trang_thai: "tat" });
  assert.equal(called, false);
});

test("không đặt PII_NER thì mặc định bật NER", async () => {
  let called = false;
  const send = (async () => { called = true; return ok([[]]); }) as typeof fetch;
  const r = await goiNer(["a"], { env: {}, send });
  assert.equal(called, true);
  assert.equal(r.trang_thai, "chay");
});

test("503, lỗi mạng, sai schema, lệch số mảng đều là khong_chay", async () => {
  for (const send of [
    async () => Response.json({ detail: "NER_NOT_READY" }, { status: 503 }),
    async () => { throw new TypeError("fetch failed"); },
    async () => Response.json({ ket_qua: "x" }),
    async () => ok([]),
    async () => ok([[{ start: 0, end: 1, nhan: "NAME" }]]),
  ]) assert.deepEqual(await goiNer(["a"], { env: on, send: send as typeof fetch }), { trang_thai: "khong_chay" });
});

test("quá thời gian chờ thì khong_chay", async () => {
  const send = ((_u: string, init: RequestInit) => new Promise((_r, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("timeout", "TimeoutError")));
  })) as typeof fetch;
  assert.deepEqual(await goiNer(["a"], { env: { ...on, PII_NER_TIMEOUT_MS: "20" }, send }), { trang_thai: "khong_chay" });
});

test("gửi NFC tới /ner của NER_BACKEND_URL và trả spans khi chạy", async () => {
  let url = "", body = "";
  const send = (async (u: string, init: RequestInit) => { url = u; body = String(init.body);
    return ok([[{ start: 0, end: 3, nhan: "NAME", diem: 0.9 }]]); }) as typeof fetch;
  const r = await goiNer(["làn"], { env: on, send });
  assert.equal(url, "http://ner.test/ner");
  assert.equal(JSON.parse(body).texts[0], "làn");
  assert.deepEqual(r, { trang_thai: "chay", nguong: 0.6, model_sha256: "a".repeat(64), spans: [[{ start: 0, end: 3, nhan: "NAME", diem: 0.9 }]] });
});

test("không có văn bản nào thì không gọi mạng", async () => {
  let called = false;
  const send = (async () => { called = true; return ok([]); }) as typeof fetch;
  assert.deepEqual(await goiNer([], { env: on, send }), { trang_thai: "chay", nguong: 1, model_sha256: "", spans: [] });
  assert.equal(called, false);
});

test("buildAuditEntry giữ trường ner, bỏ trường lạ", () => {
  const base: Omit<PiiAuditEntry, "at"> = {
    encounter_id: randomUUID(), session_sequence: 1, policy_version: PII_POLICY_VERSION,
    counts: { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0 }, gate: true, gate_reasons: [],
    ai_route: "local_only", provider: "mock", model: "mock", clean_sha256: "a".repeat(64),
  };
  const e = buildAuditEntry({ ...base, now: "2026-11-18T00:00:00.000Z", ner: { trang_thai: "chay", model_sha256: "a".repeat(64), so_doan: 2, raw: "x" } as never });
  assert.deepEqual(e.ner, { trang_thai: "chay", model_sha256: "a".repeat(64), so_doan: 2 });
  assert.equal("ner" in buildAuditEntry({ ...base, now: "2026-11-18T00:00:00.000Z" }), false);
});
