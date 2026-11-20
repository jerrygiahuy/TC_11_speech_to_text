import assert from "node:assert/strict";
import { test } from "node:test";
import { createRecordingController, type RecordingBinding, type RecordingControllerDeps } from "./recording-controller";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness(overrides: Partial<RecordingControllerDeps<string>> = {}) {
  const events: string[] = [];
  const texts: Array<{ binding: RecordingBinding; text: string }> = [];
  let timer: (() => void) | undefined;
  const controller = createRecordingController<string>({
    reserve: async (id, generation) => ({ encounterId: id, recordingSessionId: `${id}-session`, generation }),
    finalize: async binding => { events.push(`finalize:${binding.encounterId}`); },
    saveContent: async binding => { events.push(`save:${binding.encounterId}`); },
    load: async id => id,
    onLoaded: (id, data) => { events.push(`loaded:${id}:${data}`); },
    heartbeat: async binding => { events.push(`beat:${binding.encounterId}`); },
    onText: (binding, text) => { texts.push({ binding, text }); },
    onError: () => { events.push("error"); },
    setInterval: (callback, milliseconds) => { assert.equal(milliseconds, 10_000); timer = callback; return () => { timer = undefined; }; },
    ...overrides,
  });
  return { controller, events, texts, tick: () => timer?.() };
}

test("switch waits for microphone flush and durable save before loading next encounter", async () => {
  const flush = deferred<void>();
  const save = deferred<void>();
  const h = harness({ saveContent: async binding => { h.events.push(`saving:${binding.encounterId}`); await save.promise; } });
  await h.controller.switchEncounter("A");
  const binding = await h.controller.start("A");
  h.controller.registerCapture({ stop: async () => { h.events.push("stop"); await flush.promise; h.controller.routeText(binding, "final words"); }, cancel: () => {} }, binding);
  const switching = h.controller.switchEncounter("B");
  await Promise.resolve();
  assert.equal(h.events.some(event => event.startsWith("loaded:B")), false);
  flush.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.texts[0]?.binding.encounterId, "A");
  assert.deepEqual(h.events, ["loaded:A:A", "stop", "finalize:A", "saving:A"]);
  await assert.rejects(h.controller.start("B"));
  save.resolve();
  await switching;
  assert.equal(h.events.at(-1), "loaded:B:B");
  h.controller.dispose();
});

test("failed save holds A, retries save without repeating successful flush/finalize", async () => {
  let fail = true;
  let stops = 0;
  const h = harness({ saveContent: async () => { if (fail) throw new Error("awaiting_review"); } });
  await h.controller.switchEncounter("A");
  const binding = await h.controller.start("A");
  h.controller.registerCapture({ stop: async () => { stops++; }, cancel: () => {} }, binding);
  await assert.rejects(h.controller.switchEncounter("B"), /awaiting_review/);
  assert.equal(h.controller.getEncounterId(), "A");
  assert.equal(h.events.includes("loaded:B:B"), false);
  fail = false;
  await h.controller.switchEncounter("B");
  assert.equal(stops, 1);
  assert.equal(h.events.filter(event => event === "finalize:A").length, 1);
  h.controller.dispose();
});

test("stop failure blocks switch and retries the real flush before finalizing", async () => {
  let fail = true;
  const h = harness();
  await h.controller.switchEncounter("A");
  const binding = await h.controller.start("A");
  h.controller.registerCapture({ stop: async () => { if (fail) throw new Error("flush failed"); }, cancel: () => {} }, binding);
  await assert.rejects(h.controller.switchEncounter("B"), /flush failed/);
  assert.equal(h.events.includes("finalize:A"), false);
  assert.equal(h.controller.getEncounterId(), "A");
  fail = false;
  await h.controller.switchEncounter("B");
  h.controller.dispose();
});

test("slow open A cannot overwrite B even when load ignores abort", async () => {
  const slow = deferred<string>();
  const h = harness({ load: async id => id === "A" ? slow.promise : id });
  const first = h.controller.switchEncounter("A");
  await new Promise(resolve => setImmediate(resolve));
  await h.controller.switchEncounter("B");
  slow.resolve("old A");
  await first;
  assert.deepEqual(h.events, ["loaded:B:B"]);
  assert.equal(h.controller.getEncounterId(), "B");
  h.controller.dispose();
});

test("late A text retains A binding after B loads and forged binding is ignored", async () => {
  const h = harness();
  await h.controller.switchEncounter("A");
  const a = await h.controller.start("A");
  h.controller.registerCapture({ stop: async () => {}, cancel: () => {} }, a);
  await h.controller.switchEncounter("B");
  const b = await h.controller.start("B");
  h.controller.routeText(a, "late A");
  h.controller.routeText({ ...b, generation: b.generation + 10 }, "forged");
  assert.deepEqual(h.texts, [{ binding: a, text: "late A" }]);
  h.controller.dispose();
});

test("heartbeat runs on reserved binding and stops after flush before save", async () => {
  const h = harness();
  await h.controller.switchEncounter("A");
  const a = await h.controller.start("A");
  h.controller.registerCapture({ stop: async () => {}, cancel: () => {} }, a);
  h.tick();
  await Promise.resolve();
  assert.equal(h.events.includes("beat:A"), true);
  await h.controller.stopAndSave();
  const count = h.events.length;
  h.tick();
  await Promise.resolve();
  assert.equal(h.events.length, count);
  h.controller.dispose();
});

test("switch waits for capture registration after reservation and cancelCapture releases it", async () => {
  const h = harness();
  await h.controller.switchEncounter("A");
  const a = await h.controller.start("A");
  const switching = h.controller.switchEncounter("B");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.controller.getEncounterId(), "A");
  h.controller.cancelCapture(a);
  await switching;
  assert.equal(h.controller.getEncounterId(), "B");
  h.controller.dispose();
});

test("lease conflict leaves microphone unstarted and does not publish a binding", async () => {
  const h = harness({ reserve: async () => { throw new Error("lease conflict"); } });
  await h.controller.switchEncounter("A");
  await assert.rejects(h.controller.start("A"), /lease conflict/);
  assert.equal(h.controller.getBinding(), null);
  assert.equal(h.events.includes("finalize:A"), false);
  h.controller.dispose();
});

test("dispose cancels capture, clears heartbeat and ignores late text/load", async () => {
  let cancelled = 0;
  const h = harness();
  await h.controller.switchEncounter("A");
  const a = await h.controller.start("A");
  h.controller.registerCapture({ stop: async () => {}, cancel: () => { cancelled++; } }, a);
  h.controller.dispose();
  h.controller.routeText(a, "late");
  h.tick();
  assert.equal(cancelled, 1);
  assert.equal(h.texts.length, 0);
  await assert.rejects(h.controller.start("A"), /disposed/);
});

test("late failed heartbeat of finalized A cannot stop B or publish an error", async () => {
  const beat = deferred<void>();
  let stoppedB = 0;
  const h = harness({ heartbeat: async binding => binding.encounterId === "A" ? beat.promise : undefined });
  await h.controller.switchEncounter("A");
  const a = await h.controller.start("A");
  h.controller.registerCapture({ stop: async () => {}, cancel: () => {} }, a);
  h.tick();
  await h.controller.switchEncounter("B");
  const b = await h.controller.start("B");
  h.controller.registerCapture({ stop: async () => { stoppedB++; }, cancel: () => {} }, b);
  beat.reject(new Error("expired A heartbeat"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stoppedB, 0);
  assert.deepEqual(h.controller.getBinding(), b);
  assert.equal(h.events.includes("error"), false);
  assert.equal(h.events.includes("finalize:B"), false);
  h.controller.dispose();
});
