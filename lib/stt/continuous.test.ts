import assert from "node:assert/strict";
import { test } from "node:test";
import { openContinuousSession } from "./continuous";
import type { MicPipeline } from "./microphone";

test("returns text during capture beyond 30s and flushes partial audio on finish", async () => {
  let closed = false;
  let stopped = false;
  const output: number[] = [];
  const pipeline: MicPipeline = {
    onChunk: null, onError: null,
    flush: async () => { pipeline.onChunk?.(new Int16Array(321).fill(1000)); },
    close: () => { closed = true; },
  };
  const capture = await openContinuousSession({
    transcribe: async (wav) => ({ transcript: "text", no_speech: false, inference_ms: 1, audio_ms: (wav.size - 44) / 32 }),
    onResult: (result) => output.push(result.audio_ms),
    onError: (error) => { throw error; }, onElapsed: () => {}, onPending: () => {}, onStopping: () => {},
    onStopped: () => { stopped = true; },
  }, async () => pipeline);
  for (let i = 0; i < 7; i++) {
    pipeline.onChunk?.(new Int16Array(80000).fill(1000));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.equal(output.length, 7);
  assert.equal(closed, false);
  const finishing = capture.stop();
  await finishing;
  assert.equal(closed, true);
  assert.equal(stopped, true);
  assert.equal(output.length, 8);
  assert.equal(output.reduce((a, b) => a + b, 0), 35000 + 321 / 16);
});

test("cancel closes microphone and suppresses pending results", async () => {
  let closed = false;
  let returned = 0;
  let resolve!: (value: { transcript: string; no_speech: boolean; inference_ms: number; audio_ms: number }) => void;
  const pipeline: MicPipeline = { onChunk: null, onError: null, flush: async () => {}, close: () => { closed = true; } };
  const capture = await openContinuousSession({
    transcribe: () => new Promise((done) => { resolve = done; }),
    onResult: () => { returned++; }, onError: () => {}, onElapsed: () => {}, onPending: () => {}, onStopping: () => {}, onStopped: () => {},
  }, async () => pipeline);
  pipeline.onChunk?.(new Int16Array(80000).fill(1000));
  capture.cancel();
  resolve({ transcript: "late", no_speech: false, inference_ms: 1, audio_ms: 5000 });
  await new Promise((done) => setTimeout(done, 0));
  assert.equal(closed, true);
  assert.equal(returned, 0);
});

test("backlog auto-stop preserves overflow and flush ordering and ends exactly once", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const output: number[] = [];
  let stopped = 0;
  let closed = false;
  const errors: string[] = [];
  const pipeline: MicPipeline = {
    onChunk: null, onError: null,
    flush: async () => { pipeline.onChunk?.(new Int16Array(123).fill(99)); },
    close: () => { closed = true; },
  };
  const capture = await openContinuousSession({
    transcribe: async (wav) => {
      await gate;
      const view = new DataView(await wav.arrayBuffer());
      output.push(view.getInt16(44, true));
      return { transcript: "part", no_speech: false, inference_ms: 0, audio_ms: (wav.size - 44) / 32 };
    },
    onResult: () => {}, onError: (error) => errors.push((error as Error).message),
    onElapsed: () => {}, onPending: () => {}, onStopping: () => {}, onStopped: () => { stopped++; },
  }, async () => pipeline);
  for (let i = 1; i <= 14; i++) pipeline.onChunk?.(new Int16Array(80000).fill(1000 + i));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(closed, true);
  assert.deepEqual(errors, ["STT_BACKLOG"]);
  release();
  await capture.stop();
  assert.deepEqual(output, [...Array.from({ length: 14 }, (_, i) => 1001 + i), 99]);
  assert.equal(stopped, 1);
});
