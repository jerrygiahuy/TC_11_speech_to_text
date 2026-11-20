import type { RecordingBinding, RecordingHandle } from "@/shared/clinical/recording";
export type { RecordingBinding, RecordingHandle } from "@/shared/clinical/recording";

export interface RecordingControllerDeps<T> {
  reserve(encounterId: string, generation: number): Promise<RecordingBinding>;
  finalize(binding: RecordingBinding): Promise<void>;
  /** Reject until pending content is reviewed and saved or explicitly discarded. */
  saveContent(binding: RecordingBinding): Promise<void>;
  load(encounterId: string, signal: AbortSignal): Promise<T>;
  onLoaded(encounterId: string, data: T): void;
  heartbeat(binding: RecordingBinding): Promise<void>;
  onText(binding: RecordingBinding, text: string): void;
  onError?(error: unknown): void;
  /** Returns a cleanup function; injectable clock avoids real timer waits in tests. */
  setInterval?(callback: () => void, milliseconds: number): () => void;
}

interface Capture {
  binding: RecordingBinding;
  handle: RecordingHandle | null;
  ready: Promise<void>;
  captureReady(): void;
  registered: boolean;
  stopped: boolean;
  finalized: boolean;
  clearHeartbeat(): void;
}

/** Framework-independent ordering and provenance guard for both microphone backends. */
export function createRecordingController<T>(deps: RecordingControllerDeps<T>) {
  let encounterId: string | null = null;
  let active: Capture | null = null;
  let pendingStart: Promise<RecordingBinding> | null = null;
  let pendingStop: Promise<void> | null = null;
  let navigation = 0;
  let generation = 0;
  let switching = false;
  let disposed = false;
  let loadAbort: AbortController | null = null;
  const bindings = new Map<string, RecordingBinding>();
  const key = (binding: RecordingBinding) => JSON.stringify([binding.encounterId, binding.recordingSessionId, binding.generation]);
  const assertLive = () => { if (disposed) throw new Error("Recording controller disposed."); };
  const schedule = deps.setInterval ?? ((callback: () => void, milliseconds: number) => {
    const timer = globalThis.setInterval(callback, milliseconds);
    return () => globalThis.clearInterval(timer);
  });

  function start(id: string): Promise<RecordingBinding> {
    try {
      assertLive();
      if (switching || pendingStop || pendingStart || active) throw new Error("Recording is busy; finish saving before starting again.");
      if (encounterId !== id) throw new Error("Open the encounter before starting its microphone.");
    } catch (error) { return Promise.reject(error); }
    const currentGeneration = ++generation;
    pendingStart = (async () => {
      const result = await deps.reserve(id, currentGeneration);
      if (result.encounterId !== id || result.generation !== currentGeneration || !result.recordingSessionId) {
        throw new Error("Recording reservation returned a different binding.");
      }
      const binding = Object.freeze({ ...result });
      if (disposed) {
        // The tab/controller went away while reservation was in flight; no capture may start.
        await deps.finalize(binding);
        throw new Error("Recording controller disposed.");
      }
      let captureReady!: () => void;
      const ready = new Promise<void>(resolve => { captureReady = resolve; });
      const capture: Capture = { binding, handle: null, ready, captureReady, registered: false, stopped: false, finalized: false, clearHeartbeat: () => {} };
      active = capture;
      bindings.set(key(binding), binding);
      let beating = false;
      capture.clearHeartbeat = schedule(() => {
        if (disposed || beating || active !== capture || capture.finalized) return;
        beating = true;
        void deps.heartbeat(binding).catch(error => {
          if (disposed || active !== capture || capture.finalized) return;
          capture.clearHeartbeat();
          deps.onError?.(error);
          // A lost lease must stop capture, while save/review failures remain visible and retryable.
          void stopAndSave().catch(() => {});
        }).finally(() => { beating = false; });
      }, 10_000);
      return binding;
    })().catch(error => { deps.onError?.(error); throw error; }).finally(() => { pendingStart = null; });
    return pendingStart;
  }

  function registerCapture(handle: RecordingHandle, binding: RecordingBinding): void {
    if (disposed || !active || key(active.binding) !== key(binding) || active.registered) {
      handle.cancel();
      return;
    }
    active.handle = handle;
    active.registered = true;
    active.captureReady();
  }

  /** Call if microphone acquisition fails after reserve; no audio started to flush. */
  function cancelCapture(binding: RecordingBinding): void {
    if (active && key(active.binding) === key(binding) && !active.registered) {
      active.registered = true;
      active.captureReady();
    }
  }

  function stopAndSave(): Promise<void> {
    if (disposed) return Promise.reject(new Error("Recording controller disposed."));
    if (pendingStop) return pendingStop;
    pendingStop = (async () => {
      if (pendingStart) await pendingStart;
      const capture = active;
      if (!capture) return;
      // beforeStart may have returned while getUserMedia is still acquiring the microphone.
      await capture.ready;
      assertLive();
      if (!capture.stopped) {
        await capture.handle?.stop();
        assertLive();
        capture.stopped = true;
      }
      if (!capture.finalized) {
        await deps.finalize(capture.binding);
        assertLive();
        capture.finalized = true;
        capture.clearHeartbeat();
      }
      await deps.saveContent(capture.binding);
      assertLive();
      if (active === capture) active = null;
    })().catch(error => { deps.onError?.(error); throw error; }).finally(() => { pendingStop = null; });
    return pendingStop;
  }

  async function switchEncounter(nextId: string): Promise<void> {
    assertLive();
    const request = ++navigation;
    switching = true;
    loadAbort?.abort();
    const abort = new AbortController();
    loadAbort = abort;
    try {
      await stopAndSave();
      if (disposed || request !== navigation) return;
      const data = await deps.load(nextId, abort.signal);
      if (disposed || request !== navigation || abort.signal.aborted) return;
      deps.onLoaded(nextId, data);
      encounterId = nextId;
    } catch (error) {
      if (!disposed && request === navigation) {
        deps.onError?.(error);
        throw error;
      }
    } finally {
      if (request === navigation) {
        switching = false;
        loadAbort = null;
      }
    }
  }

  function routeText(binding: RecordingBinding, text: string): void {
    if (disposed) return;
    const source = bindings.get(key(binding));
    if (source) deps.onText(source, text);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    ++navigation;
    loadAbort?.abort();
    active?.clearHeartbeat();
    active?.handle?.cancel();
    active?.captureReady();
    bindings.clear();
  }

  return {
    start, registerCapture, cancelCapture, stopAndSave, switchEncounter, routeText, dispose,
    getBinding: (): RecordingBinding | null => active ? { ...active.binding } : null,
    getEncounterId: (): string | null => encounterId,
  };
}
