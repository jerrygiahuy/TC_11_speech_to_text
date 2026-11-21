/* eslint-disable no-restricted-imports -- file test chỉ chạy bằng node:test, không vào bundle trình duyệt */
import assert from "node:assert/strict";
import { test } from "node:test";
import { dashboardHref, patientHref, safeReturnTo } from "./links";

test("safe_return_to_accepts_only_internal_paths", () => {
  assert.equal(safeReturnTo("/dashboard?date=2026-11-14&view=list"), "/dashboard?date=2026-11-14&view=list");
  assert.equal(safeReturnTo("/dashboard"), "/dashboard");
  for (const bad of [
    "//evil.example/x",
    "https://evil.example",
    "http://localhost:3000/dashboard",
    "javascript:alert(1)",
    "/" + String.fromCharCode(92) + "evil.example",
    String.fromCharCode(92, 92) + "evil.example",
    "dashboard",
    "",
    " /dashboard",
    "/dash\nboard",
    "/a\tb",
    "/%2F%2Fevil",
  ]) {
    assert.equal(safeReturnTo(bad), "/dashboard", `phải từ chối: ${JSON.stringify(bad)}`);
  }
  assert.equal(safeReturnTo(null), "/dashboard");
  assert.equal(safeReturnTo(undefined, "/"), "/");
});

test("hrefs_encode_ids_and_keep_leading_zero", () => {
  assert.equal(dashboardHref("2026-11-14", "calendar"), "/dashboard?date=2026-11-14&view=calendar");
  const href = patientHref("000123", "LK 000001", "/dashboard?date=2026-11-14&view=list");
  assert.equal(
    href,
    "/benh-nhan/000123?appointment_id=LK%20000001&return_to=%2Fdashboard%3Fdate%3D2026-11-14%26view%3Dlist",
  );
  const u = new URL(href, "http://x.test");
  assert.equal(u.searchParams.get("return_to"), "/dashboard?date=2026-11-14&view=list");
  assert.equal(patientHref("a/b", "X", "//evil"), "/benh-nhan/a%2Fb?appointment_id=X&return_to=%2Fdashboard");
});
