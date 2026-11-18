/* eslint-disable no-restricted-imports -- file test chỉ chạy bằng node:test, không vào bundle trình duyệt */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatClinicDate,
  formatClinicDateTime,
  formatClinicDateTimeLenient,
  formatClinicTime,
  formatGender,
  formatOptionalClinicDate,
  minutesOfClinicDay,
  NO_INFO,
  shiftClinicDate,
  weekdayLabel,
} from "./format";

test("format_time_date_vn", () => {
  assert.equal(formatClinicTime("2026-11-14T08:05:00+07:00"), "08:05");
  assert.equal(formatClinicTime("2026-11-13T17:00:00Z"), "00:00");
  assert.equal(formatClinicTime("2026-11-14T04:59:59Z"), "11:59");
  assert.equal(formatClinicDate("2026-11-04"), "04/11/2026");
  assert.equal(formatClinicDateTime("2026-11-13T17:30:00Z"), "14/11/2026 00:30");
  assert.equal(minutesOfClinicDay("2026-11-14T13:00:00+07:00"), 13 * 60);
});

test("shift_date_crosses_month_and_year", () => {
  assert.equal(shiftClinicDate("2026-11-30", 1), "2026-12-01");
  assert.equal(shiftClinicDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftClinicDate("2028-02-28", 1), "2028-02-29");
});

test("weekday_label_vi", () => {
  assert.equal(weekdayLabel("2026-11-14"), "Thứ bảy");
  assert.equal(weekdayLabel("2026-11-15"), "Chủ nhật");
});

test("optional_date_keeps_unknown_text", () => {
  assert.equal(formatOptionalClinicDate(null), NO_INFO);
  assert.equal(formatOptionalClinicDate("2026-11-04"), "04/11/2026");
  assert.equal(formatOptionalClinicDate("04/11/2026"), "04/11/2026");
  assert.equal(formatOptionalClinicDate(""), "");
});

test("datetime_lenient_passthrough_invalid", () => {
  assert.equal(formatClinicDateTimeLenient("2026-11-13T17:30:00Z"), "14/11/2026 00:30");
  assert.equal(formatClinicDateTimeLenient("khong-phai-ngay"), "khong-phai-ngay");
});

test("gender_capitalizes_or_no_info", () => {
  assert.equal(formatGender("nam"), "Nam");
  assert.equal(formatGender("nữ"), "Nữ");
  assert.equal(formatGender(""), NO_INFO);
  assert.equal(formatGender(null), NO_INFO);
});

test("isCompleteClinicDate_rejects_partial_and_old_years", async () => {
  const { isCompleteClinicDate } = await import("./format");
  assert.equal(isCompleteClinicDate("2026-11-14"), true);
  assert.equal(isCompleteClinicDate("1900-01-01"), true);
  for (const v of ["", "0002-11-14", "1899-12-31", "2026-02-30", "2026-1-1", "abc", "20261-11-14"]) {
    assert.equal(isCompleteClinicDate(v), false, v);
  }
});
