import assert from "node:assert/strict";
import { test } from "node:test";
import { proxyStt, proxySttSession } from "./proxy";

test("proxy reports unavailable backend and preserves upstream errors", async () => {
  const failed = await proxyStt(new Request("http://localhost/api/stt"), async () => { throw new Error("offline"); });
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).detail, "STT_BACKEND_UNAVAILABLE");
  const upstream = await proxyStt(new Request("http://localhost/api/stt", {
    method: "POST", body: "wav", headers: { "Content-Type": "audio/wav" },
  }), async (_url, init) => {
    assert.equal(init?.method, "POST");
    return Response.json({ detail: "AUDIO_SILENT" }, { status: 400 });
  });
  assert.equal(upstream.status, 400);
  assert.equal((await upstream.json()).detail, "AUDIO_SILENT");
});

test("proxy forwards uploads larger than 20 MB without an inference timeout", async () => {
  const payload = new Uint8Array(21 * 1024 * 1024);
  let contacted = false;
  const response = await proxyStt(new Request("http://localhost/api/stt", {
    method: "POST", body: payload, headers: { "Content-Type": "audio/wav" },
  }), async (_url, init) => {
    contacted = true;
    assert.equal((init?.body as Uint8Array).byteLength, payload.byteLength);
    assert.equal(init?.signal, undefined);
    return Response.json({});
  });
  assert.equal(response.status, 200);
  assert.equal(contacted, true);
});

test("speaker session metadata survives proxy and session paths cannot escape", async () => {
  await proxyStt(new Request("http://localhost/api/stt", { method: "POST", body: "wav", headers: {
    "Content-Type": "audio/wav", "X-STT-Session": "id", "X-STT-Sequence": "2", "X-STT-Start-Frame": "80000",
  } }), async (_url, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-STT-Sequence"), "2");
    assert.equal(headers.get("X-STT-Start-Frame"), "80000");
    return Response.json({});
  });
  const response = await proxySttSession(new Request("http://localhost/api/stt/session/x", { method: "DELETE" }), "../health");
  assert.equal(response.status, 400);
});


test("selected local file diarizer reaches the backend", async () => {
  const response = await proxyStt(new Request("http://localhost/api/stt", { method: "POST", body: "wav", headers: {
    "Content-Type": "audio/wav", "X-STT-Diarize": "1", "X-STT-Diarizer": "community1",
  }}), async (_url, init) => {
    assert.equal(new Headers(init?.headers).get("X-STT-Diarizer"), "community1");
    return Response.json({});
  });
  assert.equal(response.status, 200);
});

test("denoise selection reaches backend for file and session creation", async () => {
  for (const session of [false, true]) {
    const request = new Request("http://localhost/api/stt", { method: "POST", body: session ? undefined : "wav",
      headers: { "Content-Type": "audio/wav", "X-STT-Denoise": "deepfilternet3" } });
    let mode: string | null = null;
    const send: typeof fetch = async (_url, init) => {
      mode = new Headers(init?.headers).get("X-STT-Denoise");
      return Response.json({});
    };
    const response = session ? await proxySttSession(request, undefined, send) : await proxyStt(request, send);
    assert.equal(response.status, 200);
    assert.equal(mode, "deepfilternet3");
  }
});
