/* eslint-disable no-restricted-imports -- file test chỉ chạy bằng node:test, không vào bundle trình duyệt */
import assert from "node:assert/strict";
import { test } from "node:test";
import { groupAppointments, layoutDay, splitByPeriod } from "./layout";
import { summarizeAppointments } from "./schedule";
import type { AppointmentItem, DisplayStatus } from "./types";

function item(id: string, start: string, end: string | null, status: DisplayStatus = "scheduled"): AppointmentItem {
  return {
    appointment: {
      id, facility_id: "CS01", patient_id: "P" + id, doctor_id: "BS01",
      starts_at: start, ends_at: end, content: "x", scheduling_status: "scheduled",
    },
    patient: {
      id: "P" + id, facility_id: "CS01", full_name: "A", date_of_birth: null, gender: null,
      insurance: {
        bhyt: { known: false, enrolled: null, provider: null, plan: null, member_code: null, valid_from: null, valid_to: null },
        bao_lanh: { known: false, enrolled: null, provider: null, plan: null, member_code: null, valid_from: null, valid_to: null },
      },
    },
    doctor_name: "BS", encounter_id: null, status, has_prior_encounter: false, can_open: false, open_reason: "no_context",
  };
}

test("group_counts_match_summarize", () => {
  const items = (["completed", "completed", "scheduled", "scheduled", "in_progress", "waiting_results", "cancelled", "admitted"] as DisplayStatus[])
    .map((s, i) => item(`L${i}`, "2026-11-14T08:00:00+07:00", null, s));
  const g = groupAppointments(items);
  const t = summarizeAppointments(items);
  assert.equal(g.completed.length, t.completed);
  assert.equal(g.remaining.length, t.remaining);
  assert.equal(g.unfinished.length, t.unfinished);
  assert.equal(g.cancelled.length, t.cancelled);
  assert.equal(g.other.length, t.other);
  assert.equal(g.unknown.length, t.unknown);
  assert.deepEqual(g.unfinished.map((i) => i.status).sort(), ["in_progress", "waiting_results"]);
  assert.ok(g.unfinished.every((u) => g.remaining.includes(u)));
});

test("split_by_period_at_noon", () => {
  const a = item("A", "2026-11-14T11:59:00+07:00", null);
  const b = item("B", "2026-11-14T12:00:00+07:00", null);
  const c = item("C", "2026-11-13T17:00:00Z", null); // 00:00 VN
  const s = splitByPeriod([b, a, c]);
  assert.deepEqual(s.morning.map((i) => i.appointment.id), ["C", "A"]);
  assert.deepEqual(s.afternoon.map((i) => i.appointment.id), ["B"]);
});

test("layout_axis_covers_all_and_min_07_18", () => {
  const l = layoutDay([item("A", "2026-11-14T09:00:00+07:00", null)]);
  assert.equal(l.startHour, 7);
  assert.equal(l.endHour, 18);
  const w = layoutDay([item("A", "2026-11-14T05:30:00+07:00", null), item("B", "2026-11-14T19:10:00+07:00", "2026-11-14T20:00:00+07:00")]);
  assert.equal(w.startHour, 5);
  assert.equal(w.endHour, 20);
  assert.equal(layoutDay([]).blocks.length, 0);
});

test("layout_default_30_minutes_flagged_estimated", () => {
  const l = layoutDay([item("A", "2026-11-14T09:00:00+07:00", null), item("B", "2026-11-14T10:00:00+07:00", "2026-11-14T11:00:00+07:00")]);
  const [a, b] = l.blocks;
  assert.equal(a.endMin - a.startMin, 30);
  assert.equal(a.estimated, true);
  assert.equal(b.endMin - b.startMin, 60);
  assert.equal(b.estimated, false);
  assert.equal(l.hasEstimated, true);
});

test("layout_overlaps_side_by_side_no_loss", () => {
  const l = layoutDay([
    item("A", "2026-11-14T09:00:00+07:00", "2026-11-14T10:00:00+07:00"),
    item("B", "2026-11-14T09:00:00+07:00", null),
    item("C", "2026-11-14T09:30:00+07:00", null),
    item("D", "2026-11-14T11:00:00+07:00", null),
  ]);
  assert.equal(l.blocks.length, 4);
  const by = Object.fromEntries(l.blocks.map((b) => [b.item.appointment.id, b]));
  assert.equal(by.A.cols, 2); // B kết thúc 09:30 nên C dùng lại cột của B
  assert.equal(by.C.col, by.B.col);
  assert.notEqual(by.A.col, by.B.col);
  assert.notEqual(by.A.col, by.C.col);
  assert.equal(by.D.cols, 1);
  assert.equal(by.D.col, 0);
});

test("layout_clamps_past_midnight", () => {
  const l = layoutDay([item("A", "2026-11-14T23:30:00+07:00", "2026-11-15T01:00:00+07:00")]);
  assert.equal(l.blocks[0].endMin, 24 * 60);
  assert.equal(l.endHour, 24);
});

test("layout_short_appointments_get_min_length_and_do_not_overlap_next_block", () => {
  // Ca 5 phút lúc 09:00 và ca 09:10: vẽ tối thiểu 20 phút nên phải xếp cạnh nhau, không đè lên nhau.
  const l = layoutDay([
    item("A", "2026-11-14T09:00:00+07:00", "2026-11-14T09:05:00+07:00"),
    item("B", "2026-11-14T09:10:00+07:00", "2026-11-14T09:40:00+07:00"),
    item("C", "2026-11-14T09:20:00+07:00", "2026-11-14T09:50:00+07:00"),
  ]);
  const by = Object.fromEntries(l.blocks.map((b) => [b.item.appointment.id, b]));
  assert.equal(by.A.endMin - by.A.startMin, 20);
  assert.equal(by.A.estimated, false);
  assert.equal(by.A.cols, 2);
  assert.notEqual(by.A.col, by.B.col);
  assert.equal(by.C.col, by.A.col, "C bắt đầu sau khi khối A (đến 09:20) kết thúc nên dùng lại cột A");
});
