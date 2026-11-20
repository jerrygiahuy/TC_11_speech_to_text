import assert from "node:assert/strict";
import { test } from "node:test";
import { SpeakerSessionClient } from "./speaker-client";
import { encodePcm16Wav } from "./audio";

test("session retries exact chunks, advances offsets once and finalizes before cleanup", async () => {
  const calls: { url: string; method?: string; sequence?: string | null; start?: string | null; body?: unknown }[] = [];
  let failed = false;
  const send: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, method: init?.method, sequence: headers.get("X-STT-Sequence"), start: headers.get("X-STT-Start-Frame"), body: init?.body });
    if (url === "/api/stt/session") return Response.json({ session_id: "test-session" });
    if (url === "/api/stt" && !failed) { failed = true; throw new Error("connection lost"); }
    return Response.json({ transcript: "text", words: [], replace_from_ms: 0, inference_ms: 1, audio_ms: 5000, no_speech: false, final: url !== "/api/stt" });
  };
  const client = await SpeakerSessionClient.create(new AbortController().signal, send);
  const wav = encodePcm16Wav(new Float32Array(80000));
  await client.transcribe(wav); await client.transcribe(wav); await client.finish(); await client.close();
  const chunks = calls.filter((call) => call.url === "/api/stt");
  assert.deepEqual(chunks.map((call) => [call.sequence, call.start]), [["1", "0"], ["1", "0"], ["2", "80000"]]);
  assert.equal(chunks[0].body, chunks[1].body);
  assert.deepEqual(calls.slice(-2).map((call) => call.method), ["POST", "DELETE"]);
});

test("browser fetch is called without the client as its receiver throughout the session", async () => {
  const methods: string[] = [];
  // Native Window.fetch rejects a foreign receiver. Arrow mocks hide this failure.
  const browserFetch: typeof fetch = async function (this: unknown, input, init) {
    if (this !== undefined) throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
    methods.push(`${init?.method} ${String(input)}`);
    if (input === "/api/stt/session") return Response.json({ session_id: "browser-session" });
    return Response.json({ transcript: "xin chào", words: [], inference_ms: 1, audio_ms: 1000, no_speech: false });
  };
  const client = await SpeakerSessionClient.create(new AbortController().signal, browserFetch);
  await client.transcribe(encodePcm16Wav(new Float32Array(16000)));
  await client.finish();
  assert.deepEqual(methods, [
    "POST /api/stt/session", "POST /api/stt", "POST /api/stt/session/browser-session", "DELETE /api/stt/session/browser-session",
  ]);
});


test("missing or invalid VAD is actionable and never retried", async () => {
  for (const code of ["STT_VAD_MODEL_MISSING", "STT_VAD_MODEL_INVALID", "DENOISE_NOT_READY", "DENOISE_FAILED"]) {
    let attempts = 0;
    const client = await SpeakerSessionClient.create(new AbortController().signal, async (url) => {
      if (url === "/api/stt/session") return Response.json({ session_id: "test" });
      attempts++;
      return Response.json({ detail: code }, { status: 503 });
    });
    await assert.rejects(client.transcribe(encodePcm16Wav(new Float32Array(16000))), new RegExp(code));
    assert.equal(attempts, 1);
  }
});

test("denoise choice binds to session creation and is not changed by chunk retries", async () => {
  const calls: { url: string; mode: string | null }[] = [];
  const client = await SpeakerSessionClient.create(new AbortController().signal, async (url, init) => {
    calls.push({ url: String(url), mode: new Headers(init?.headers).get("X-STT-Denoise") });
    if (url === "/api/stt/session") return Response.json({ session_id: "clean" });
    return Response.json({ transcript: "", inference_ms: 1 });
  }, "deepfilternet3");
  await client.transcribe(encodePcm16Wav(new Float32Array(16000)));
  assert.deepEqual(calls, [{ url: "/api/stt/session", mode: "deepfilternet3" }, { url: "/api/stt", mode: null }]);
});
