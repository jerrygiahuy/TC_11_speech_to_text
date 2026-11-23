export async function proxyStt(request: Request, send: typeof fetch = fetch): Promise<Response> {
  const base = process.env.STT_BACKEND_URL || "http://127.0.0.1:8765";
  const init: RequestInit = { method: request.method, cache: "no-store", signal: request.method === "POST" && !request.headers.has("X-STT-Session")
    ? undefined : AbortSignal.timeout(120000) };
  if (request.method === "POST") {
    if (!/^audio\/(x-)?wav(?:;|$)/i.test(request.headers.get("content-type") || "")) {
      return Response.json({ detail: "AUDIO_MIME_UNSUPPORTED" }, { status: 400 });
    }
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ detail: "AUDIO_EMPTY" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    init.body = Buffer.concat(chunks);
    const headers: Record<string, string> = { "Content-Type": "audio/wav" };
    for (const key of ["X-STT-Session", "X-STT-Sequence", "X-STT-Start-Frame", "X-STT-Diarize", "X-STT-Diarizer", "X-STT-Denoise"]) {
      const value = request.headers.get(key);
      if (value) headers[key] = value;
    }
    init.headers = headers;
  }
  try {
    const response = await send(`${base.replace(/\/$/, "")}/${request.method === "GET" ? "health" : "transcribe"}`, init);
    const data = await response.json();
    return Response.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json({ detail: timeout ? "STT_TIMEOUT" : "STT_BACKEND_UNAVAILABLE" }, { status: timeout ? 504 : 503 });
  }
}

/** voiceId: mã bác sĩ do máy chủ Next xác định (client không tự chọn); có thì phiên so giọng đã đăng ký khi chốt. */
export async function proxySttSession(request: Request, id?: string, send: typeof fetch = fetch, voiceId?: string): Promise<Response> {
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ detail: "STT_SESSION_INVALID" }, { status: 400 });
  }
  const base = process.env.STT_BACKEND_URL || "http://127.0.0.1:8765";
  const path = id ? `/sessions/${id}${request.method === "POST" ? "/finalize" : ""}` : "/sessions";
  try {
    const headers: Record<string, string> = {};
    if (!id && request.method === "POST" && request.headers.has("X-STT-Denoise")) {
      headers["X-STT-Denoise"] = request.headers.get("X-STT-Denoise")!;
    }
    if (!id && request.method === "POST" && request.headers.get("X-STT-Latency") === "low") headers["X-STT-Latency"] = "low";
    if (!id && request.method === "POST" && voiceId) headers["X-STT-Voice"] = voiceId;
    const response = await send(base.replace(/\/$/, "") + path, { method: request.method, headers, cache: "no-store", signal: AbortSignal.timeout(120000) });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ detail: "STT_BACKEND_UNAVAILABLE" }, { status: 503 });
  }
}

/** Đăng ký / xem / xóa đặc trưng giọng bác sĩ ở STT backend. doctorId do máy chủ Next xác định. */
export async function proxySttVoice(request: Request, doctorId: string, send: typeof fetch = fetch): Promise<Response> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(doctorId)) return Response.json({ detail: "VOICE_ID_INVALID" }, { status: 400 });
  const base = process.env.STT_BACKEND_URL || "http://127.0.0.1:8765";
  const init: RequestInit = { method: request.method, cache: "no-store", signal: AbortSignal.timeout(120000) };
  if (request.method === "POST") {
    if (!/^audio\/(x-)?wav(?:;|$)/i.test(request.headers.get("content-type") || "")) {
      return Response.json({ detail: "AUDIO_MIME_UNSUPPORTED" }, { status: 400 });
    }
    init.body = Buffer.from(await request.arrayBuffer());
    init.headers = { "Content-Type": "audio/wav" };
  }
  try {
    const response = await send(`${base.replace(/\/$/, "")}/voices/${doctorId}`, init);
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ detail: "STT_BACKEND_UNAVAILABLE" }, { status: 503 });
  }
}
