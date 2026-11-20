import assert from "node:assert/strict";
import { test } from "node:test";
import { PcmSegmenter, SegmentQueue } from "./session";

test("continuous PCM beyond 30s is preserved exactly including final partial segment", () => {
  const segments: Int16Array[] = [];
  const segmenter = new PcmSegmenter((pcm) => segments.push(pcm));
  const input = Int16Array.from({ length: 16000 * 75 + 31 }, (_, i) => (i % 3000) + 1000);
  for (let i = 0; i < input.length; i += 2048) segmenter.push(input.subarray(i, i + 2048));
  segmenter.finish();
  assert.ok(segments.length > 10);
  assert.ok(segments.every((pcm) => pcm.length <= 16000 * 5));
  const joined = new Int16Array(input.length);
  let offset = 0;
  for (const part of segments) { joined.set(part, offset); offset += part.length; }
  assert.equal(offset, input.length);
  assert.deepEqual(joined, input);
});

test("short pause emits speech before max segment duration", () => {
  const segments: Int16Array[] = [];
  const segmenter = new PcmSegmenter((pcm) => segments.push(pcm));
  segmenter.push(new Int16Array(16000).fill(4000));
  for (let i = 0; i < 6; i++) segmenter.push(new Int16Array(1600));
  assert.equal(segments.length, 1);
  assert.equal(segments[0].length, 25600);
  segmenter.finish();
  assert.equal(segments.length, 1);
});

test("queue serializes requests, drains final text, and reports failed segments", async () => {
  const output: string[] = [];
  let active = 0;
  let maxActive = 0;
  const queue = new SegmentQueue(async (pcm) => {
    active++; maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    if (pcm[0] === 2) throw new Error("offline");
    output.push(String(pcm[0]));
  }, (_error, sequence) => output.push(`failed:${sequence}`));
  queue.add(new Int16Array([1])); queue.add(new Int16Array([2])); queue.add(new Int16Array([3]));
  await queue.drain();
  assert.deepEqual(output, ["1", "failed:2", "3"]);
  assert.equal(maxActive, 1);
  assert.equal(queue.pending, 0);
});

test("bounded queue rejects excess audio explicitly and cancellation releases pending chunks", async () => {
  let resolve!: () => void;
  const queue = new SegmentQueue(() => new Promise<void>((done) => { resolve = done; }), () => {}, 2);
  queue.add(new Int16Array([1])); queue.add(new Int16Array([2]));
  assert.throws(() => queue.add(new Int16Array([3])), /STT_BACKLOG/);
  queue.cancel(); resolve(); await queue.drain();
  assert.equal(queue.pending, 0);
});
