import type { SttResult } from "./continuous";

/** One opaque server session per recording; exact payload retries never append audio twice. */
export class SpeakerSessionClient {
  private sequence = 1;
  private frames = 0;
  private closed = false;
  private readonly send: typeof fetch;
  private constructor(private id: string, private signal: AbortSignal, send: typeof fetch) {
    // A stored native Window.fetch cannot be invoked with this client as `this`.
    this.send = (input, init) => send(input, init);
  }

  /**
   * lowLatency: cửa sổ ngắn hơn, chữ chốt sớm hơn (eForm cần chữ hiện ngay khi bác sĩ nói).
   * soGiongBacSi: chốt phiên thì so với giọng bác sĩ đã đăng ký (kết quả ở voice_match của finish()).
   */
  static async create(signal: AbortSignal, send: typeof fetch = fetch, denoise: "off" | "deepfilternet3" = "off", lowLatency = false, soGiongBacSi = false) {
    const headers: Record<string, string> = { "X-STT-Denoise": denoise };
    if (lowLatency) headers["X-STT-Latency"] = "low";
    if (soGiongBacSi) headers["X-STT-Voice"] = "bac-si";
    const response = await send("/api/stt/session", { method: "POST", signal, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "STT_BACKEND_UNAVAILABLE");
    return new SpeakerSessionClient(data.session_id, signal, send);
  }

  private async request(url: string, init: RequestInit): Promise<SttResult> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.send(url, { ...init, signal: AbortSignal.any([this.signal, AbortSignal.timeout(125000)]) });
      } catch (error) {
        if (attempt >= 2 || this.signal.aborted || this.closed) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
        continue;
      }
      const data = await response.json();
      if (response.ok) return data;
      const retryable = response.status === 429 || (response.status >= 500 && !String(data.detail).startsWith("DENOISE_") && !["DIARIZATION_MODEL_MISSING", "STT_HOTWORDS_INVALID", "STT_VAD_MODEL_MISSING", "STT_VAD_MODEL_INVALID"].includes(data.detail));
      if (!retryable || attempt >= 2 || this.signal.aborted) throw new Error(data.detail || "STT_INFERENCE_FAILED");
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }

  async transcribe(wav: Blob): Promise<SttResult> {
    if (this.closed) throw new Error("STT_SESSION_FINISHED");
    const result = await this.request("/api/stt", {
      method: "POST", headers: { "Content-Type": "audio/wav", "X-STT-Session": this.id,
        "X-STT-Sequence": String(this.sequence), "X-STT-Start-Frame": String(this.frames) }, body: wav,
    });
    this.sequence++;
    this.frames += (wav.size - 44) / 2;
    return result;
  }

  async finish() {
    try { return await this.request(`/api/stt/session/${this.id}`, { method: "POST" }); }
    finally { await this.close(); }
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    try { await this.send(`/api/stt/session/${this.id}`, { method: "DELETE", keepalive: true }); }
    catch { /* The server also expires abandoned sessions after ten idle minutes. */ }
  }
}
