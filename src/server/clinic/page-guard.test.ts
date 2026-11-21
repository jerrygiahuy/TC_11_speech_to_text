import assert from "node:assert/strict";
import { test } from "node:test";
import { ClinicHttpError } from "./errors";
import { assertLocalDemoPage } from "./page-guard";

function status(headers: Record<string, string>): number | "ok" {
  try {
    assertLocalDemoPage(new Headers(headers), "/benh-nhan");
    return "ok";
  } catch (e) {
    return e instanceof ClinicHttpError ? e.status : -1;
  }
}

test("page_guard_allows_local_hosts", () => {
  assert.equal(status({ host: "localhost:3000" }), "ok");
  assert.equal(status({ host: "127.0.0.1:3101" }), "ok");
  assert.equal(status({ host: "[::1]:3000" }), "ok");
  assert.equal(status({ host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }), "ok");
});

test("page_guard_denies_lan_external_cross_origin_and_missing_host", () => {
  assert.equal(status({ host: "192.168.1.5:3000" }), 403);
  assert.equal(status({ host: "example.com" }), 403);
  assert.equal(status({}), 403);
  assert.equal(status({ host: "localhost:3000", origin: "http://evil.example" }), 403);
  assert.equal(status({ host: "localhost:3000", origin: "http://localhost:4000" }), 403);
  assert.equal(status({ host: "localhost:3000", "sec-fetch-site": "cross-site" }), 403);
});
