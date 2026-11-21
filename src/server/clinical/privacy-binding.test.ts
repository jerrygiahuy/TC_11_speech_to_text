import assert from "node:assert/strict";
import { test } from "node:test";
import { PrivacyTickets } from "./privacy";
import { ClinicalError } from "./repository";

const a = { encounter_id: "encounter-a", recording_session_id: "session-a", generation: 1, content_revision: 1 };
const conflict = (error: unknown) => error instanceof ClinicalError && error.status === 409;
const check = (store: PrivacyTickets, text: string, binding?: typeof a) =>
  store.check(text, "dictation", { known: [], allowlist: new Set(), consent: true, binding });

test("passed tickets remain bound to their encounter, session, generation and content revision", () => {
  const store = new PrivacyTickets();
  const checked = check(store, "BS: Tim đều.", a);
  assert.deepEqual(store.approved(checked.ticket!, a).binding, a);
  for (const mismatch of [
    { ...a, encounter_id: "encounter-b" }, { ...a, recording_session_id: "session-b" },
    { ...a, generation: 2 }, { ...a, content_revision: 2 },
  ]) {
    assert.throws(() => store.approved(checked.ticket!, mismatch), conflict);
    assert.throws(() => store.pii(checked.ticket!, mismatch), conflict);
  }
  assert.throws(() => store.approved(checked.ticket!), conflict);
});

test("unbound tickets cannot be promoted to a bound recording ticket", () => {
  const store = new PrivacyTickets();
  const checked = check(store, "BS: Tim đều.");
  assert.throws(() => store.approved(checked.ticket!, a), conflict);
});

test("binding is copied and digest comes from the checked text", () => {
  const store = new PrivacyTickets();
  const binding = { ...a };
  const checked = check(store, "BS: Tim đều.", binding);
  binding.encounter_id = "tampered";
  const first = store.reviewed(checked.ticket!, a);
  assert.match(first.digest, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.transcript.binding, a);
  assert.equal(store.reviewed(checked.ticket!, a).digest, first.digest);
  first.transcript.segments[0].text = "tampered";
  assert.notEqual(store.reviewed(checked.ticket!, a).transcript.segments[0].text, "tampered");
});

test("binding is rechecked before revealing ticket content, including after expiration", () => {
  let time = 1_000;
  const store = new PrivacyTickets(() => time);
  const checked = store.check("BS: Tim đều.", "dictation", { known: [], allowlist: new Set(), consent: true, binding: a });
  time += 600_000;
  assert.throws(() => store.reviewed(checked.ticket!, a), /hết hạn/);
});
