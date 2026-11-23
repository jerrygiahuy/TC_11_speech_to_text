import assert from "node:assert/strict";
import { test } from "node:test";
import { createHistoryLoader } from "./history-controller";

interface Detail {
  id: string;
  text: string;
}

interface Deferred {
  signal: AbortSignal;
  resolve: (value: Detail) => void;
  reject: (error: Error) => void;
}

/** fetchDetail giả: mỗi lần gọi tạo một deferred để test tự quyết định lúc nào kết thúc. */
function setup() {
  const calls = new Map<string, Deferred[]>();
  const fetchDetail = (_patientId: string, encounterId: string, signal: AbortSignal) =>
    new Promise<Detail>((resolve, reject) => {
      const list = calls.get(encounterId) ?? [];
      list.push({ signal, resolve, reject });
      calls.set(encounterId, list);
    });
  const nth = (id: string, n = 0) => {
    const d = calls.get(id)?.[n];
    assert.ok(d, `chưa có lần gọi ${n} cho ${id}`);
    return d;
  };
  return { loader: createHistoryLoader<Detail>(fetchDetail), nth, calls };
}

test("slow_A_then_fast_B_applies_only_B", async () => {
  const { loader, nth } = setup();
  const a = loader.load("000123", "A");
  const b = loader.load("000123", "B");
  assert.equal(nth("A").signal.aborted, true, "load B phải hủy request của A");
  nth("B").resolve({ id: "B", text: "phiếu B" });
  assert.deepEqual(await b, { id: "B", value: { id: "B", text: "phiếu B" } });
  nth("A").resolve({ id: "A", text: "phiếu A" });
  assert.equal(await a, null, "kết quả A đến muộn không được áp dụng");
});

test("late_error_of_A_after_B_is_not_shown", async () => {
  const { loader, nth } = setup();
  const a = loader.load("000123", "A");
  const b = loader.load("000123", "B");
  nth("B").resolve({ id: "B", text: "phiếu B" });
  await b;
  nth("A").reject(new Error("mạng lỗi A"));
  assert.equal(await a, null, "lỗi của load cũ không được hiện");
});

test("error_of_current_load_throws_and_retry_works", async () => {
  const { loader, nth } = setup();
  const first = loader.load("000123", "B");
  nth("B", 0).reject(new Error("mạng lỗi B"));
  await assert.rejects(first, /mạng lỗi B/);
  const retry = loader.load("000123", "B");
  nth("B", 1).resolve({ id: "B", text: "phiếu B" });
  assert.deepEqual(await retry, { id: "B", value: { id: "B", text: "phiếu B" } });
});

test("dispose_aborts_and_blocks_updates", async () => {
  const { loader, nth, calls } = setup();
  const a = loader.load("000123", "A");
  loader.dispose();
  assert.equal(nth("A").signal.aborted, true);
  nth("A").resolve({ id: "A", text: "phiếu A" });
  assert.equal(await a, null);
  const after = await loader.load("000123", "B");
  assert.equal(after, null, "sau dispose không tải nữa");
  assert.equal(calls.has("B"), false);
});

test("dispose_swallows_pending_error", async () => {
  const { loader, nth } = setup();
  const a = loader.load("000123", "A");
  loader.dispose();
  nth("A").reject(new Error("lỗi sau dispose"));
  assert.equal(await a, null);
});
