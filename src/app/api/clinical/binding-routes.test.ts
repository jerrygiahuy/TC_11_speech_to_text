import assert from "node:assert/strict";
import { test } from "node:test";
import { POST as privacy } from "./privacy/route";
import { POST as extract } from "./extract/route";

test("clinical HTTP privacy no longer issues an unbound ticket", async () => {
  const response = await privacy(new Request("http://localhost:3000/api/clinical/privacy", { method: "POST",
    headers: { origin: "http://localhost:3000" }, body: JSON.stringify({ action: "prepare", text: "BS: Họng đỏ.", mode: "dictation" }) }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).ticket, undefined);
});

test("clinical HTTP extraction requires explicit encounter/session/content binding", async () => {
  const response = await extract(new Request("http://localhost:3000/api/clinical/extract", { method: "POST",
    body: JSON.stringify({ ticket: "unbound" }) }));
  assert.equal(response.status, 400);
});
