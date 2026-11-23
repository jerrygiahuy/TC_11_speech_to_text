/* eslint-disable no-restricted-imports -- file test chỉ chạy bằng node:test, không vào bundle trình duyệt */
import assert from "node:assert/strict";
import { test } from "node:test";
import { historyNavigation, sortHistory } from "./history";

const H = (id: string, at: string) => ({ id, encounter_at: at });

test("sort_history_desc_with_id_tiebreak_no_mutate", () => {
  const input = [
    H("a", "2026-10-01T09:00:00+07:00"),
    H("b", "2026-10-02T09:00:00+07:00"),
    H("c", "2026-10-01T02:00:00Z"), // cùng thời điểm với "a"
    H("z", "2026-09-01T09:00:00+07:00"),
  ];
  const copy = structuredClone(input);
  assert.deepEqual(sortHistory(input).map((x) => x.id), ["b", "c", "a", "z"]);
  assert.deepEqual(input, copy);
});

test("history_navigation_prev_is_newer_next_is_older", () => {
  const list = [{ id: "n3" }, { id: "n2" }, { id: "n1" }];
  assert.deepEqual(historyNavigation(list, "n3"), { index: 0, previousId: null, nextId: "n2" });
  assert.deepEqual(historyNavigation(list, "n2"), { index: 1, previousId: "n3", nextId: "n1" });
  assert.deepEqual(historyNavigation(list, "n1"), { index: 2, previousId: "n2", nextId: null });
});

test("history_navigation_single_and_missing", () => {
  assert.deepEqual(historyNavigation([{ id: "x" }], "x"), { index: 0, previousId: null, nextId: null });
  assert.deepEqual(historyNavigation([{ id: "x" }], "y"), { index: -1, previousId: null, nextId: null });
  assert.deepEqual(historyNavigation([], "y"), { index: -1, previousId: null, nextId: null });
});
