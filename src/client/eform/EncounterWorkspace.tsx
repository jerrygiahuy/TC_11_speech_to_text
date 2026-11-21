"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { docHoSo, listEncounters, openEncounter, recordingApi, type ClinicalResponse, type EncounterList } from "@/client/clinical-api";
import type { EncounterBridge, TextSink } from "@/client/eform/encounter-bridge";
import { EncounterSwitcher } from "@/client/eform/EncounterSwitcher";
import { EformScreen } from "@/client/eform/EformScreen";
import { BTN_OUTLINE } from "@/client/eform/fields";
import { createRecordingController } from "@/client/eform/recording-controller";
import type { RecordingBinding, RecordingHandle } from "@/shared/clinical/recording";
import type { RecordingSession } from "@/shared/clinical/types";

const OPEN_STATES: RecordingSession["state"][] = ["opening", "recording", "finalizing"];
type Controller = ReturnType<typeof createRecordingController<ClinicalResponse>>;

let fallbackDeviceId: string | null = null;
/** Một máy là một thiết bị giữ micro, chung cho mọi tab: hai tab cùng bấm ghi âm thì chỉ một bên được giữ. */
function deviceId(): string {
  try {
    const saved = localStorage.getItem("eform-device-id");
    if (saved) return saved;
    const created = crypto.randomUUID();
    localStorage.setItem("eform-device-id", created);
    return created;
  } catch {
    fallbackDeviceId ??= crypto.randomUUID();
    return fallbackDeviceId;
  }
}

const message = (cause: unknown, fallback: string) => (cause instanceof Error && cause.message ? cause.message : fallback);

/**
 * Điều phối lượt khám: mở đúng hồ sơ theo mã khám, giữ phiên bản hồ sơ mới nhất, chuyển bệnh nhân an toàn.
 * Chuyển lượt luôn đi qua recording-controller: dừng micro → chữ cuối → chốt phiên → mới tải lượt kia.
 */
export function EncounterWorkspace({ initialRecordId }: { initialRecordId?: string }) {
  const [list, setList] = useState<EncounterList>({ open: [], available: [] });
  const [response, setResponse] = useState<ClinicalResponse | null>(null);
  const [error, setError] = useState("");
  const [switching, setSwitching] = useState(false);
  const [controller, setController] = useState<Controller | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<{ key: string; reason: string } | null>(null);
  const responseRef = useRef<ClinicalResponse | null>(null);
  const controllerRef = useRef<Controller | null>(null);
  const dirtyRef = useRef(false);
  const pendingTextRef = useRef(false);
  const strictRef = useRef(false);
  const leases = useRef(new Map<string, string>());
  const sinkRef = useRef<TextSink | null>(null);

  const publish = useCallback((next: ClinicalResponse) => {
    const current = responseRef.current;
    // Phản hồi chậm của cùng hồ sơ không được kéo phiên bản lùi lại.
    if (current && current.record.id === next.record.id && next.record.revision < current.record.revision) return;
    responseRef.current = next;
    setResponse(next);
  }, []);

  const refreshList = useCallback(() => {
    listEncounters().then(setList).catch(() => undefined);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const c = createRecordingController<ClinicalResponse>({
      reserve: async (key, generation) => {
        const current = responseRef.current;
        if (!current) throw new Error("Chưa mở lượt khám.");
        const started = await recordingApi.start({ encounter_id: current.record.id, expected_revision: current.record.revision, device_id: deviceId(), client_request_id: crypto.randomUUID() });
        leases.current.set(started.session.id, started.lease_token);
        const latest = responseRef.current ?? current;
        publish({ ...latest, record: started.record });
        return { encounterId: key, recordingSessionId: started.session.id, generation };
      },
      finalize: async (binding) => {
        const current = responseRef.current;
        const token = leases.current.get(binding.recordingSessionId);
        if (!current || !token) throw new Error("Không còn mã giữ phiên ghi âm.");
        publish(await recordingApi.finalize({ encounter_id: current.record.id, session_id: binding.recordingSessionId, lease_token: token, expected_revision: current.record.revision, reason: "stopped" }));
      },
      saveContent: async (binding) => {
        if (!strictRef.current) return;
        const session = responseRef.current?.record.recording_sessions.find((item) => item.id === binding.recordingSessionId);
        if (session?.content_state === "awaiting_review") throw new Error("Còn nội dung ghi âm chưa che và lưu. Hãy che thông tin và tạo bản nháp, hoặc bỏ phần chưa lưu, trước khi chuyển lượt.");
      },
      load: (key, signal) => openEncounter(key, signal),
      onLoaded: (key, loaded) => {
        responseRef.current = loaded;
        setResponse(loaded);
        setError("");
        const url = new URL(window.location.href);
        url.searchParams.set("ho_so", loaded.record.id);
        window.history.replaceState(null, "", url);
        void key;
      },
      heartbeat: async (binding) => {
        const current = responseRef.current;
        const token = leases.current.get(binding.recordingSessionId);
        if (!current || !token) throw new Error("Không còn mã giữ phiên ghi âm.");
        await recordingApi.heartbeat({ encounter_id: current.record.id, session_id: binding.recordingSessionId, lease_token: token });
      },
      onText: (binding, text) => sinkRef.current?.(binding, text),
      onError: (cause) => setError(message(cause, "Không xử lý được yêu cầu.")),
    });
    controllerRef.current = c;
    setController(c);
    (async () => {
      try {
        await recordingApi.recover(deviceId()).catch(() => undefined);
        const lists = await listEncounters(abort.signal);
        if (abort.signal.aborted) return;
        setList(lists);
        let key: string | undefined;
        if (initialRecordId) key = (await docHoSo(initialRecordId, abort.signal)).record.appointment_id ?? undefined;
        key ??= lists.open[0]?.appointment_id ?? lists.available[0]?.appointment_id;
        if (!key) throw new Error("Chưa có mã khám nào để mở.");
        await c.switchEncounter(key);
      } catch (cause) {
        if (!abort.signal.aborted) setError(message(cause, "Không mở được lượt khám."));
      }
    })();
    return () => { abort.abort(); c.dispose(); controllerRef.current = null; };
  }, [initialRecordId, publish]);

  useEffect(() => { if (response) refreshList(); }, [response?.record.id, response?.record.status, refreshList]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || pendingTextRef.current || controllerRef.current?.getBinding()) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const awaitingReview = (): RecordingSession[] =>
    (responseRef.current?.record.recording_sessions ?? []).filter((item) => item.content_state === "awaiting_review" && !OPEN_STATES.includes(item.state));

  const discard = useCallback(async (session: RecordingSession) => {
    const current = responseRef.current;
    const live = current?.record.recording_sessions.find((item) => item.id === session.id);
    if (!current || !live) return;
    publish(await recordingApi.content({ encounter_id: current.record.id, session_id: live.id, expected_revision: current.record.revision, content_revision: live.content_revision, client_request_id: crypto.randomUUID(), action: "discard" }));
  }, [publish]);

  const stopAndSave = useCallback(async () => {
    strictRef.current = false;
    await controllerRef.current?.stopAndSave();
  }, []);

  async function runSwitch(key: string) {
    const c = controllerRef.current;
    if (!c) return;
    setSwitching(true); setError(""); setPendingSwitch(null);
    strictRef.current = true;
    try { await c.switchEncounter(key); }
    catch { /* onError đã báo; hồ sơ hiện tại được giữ nguyên */ }
    finally { strictRef.current = false; setSwitching(false); refreshList(); }
  }

  function requestSwitch(key: string) {
    const c = controllerRef.current;
    if (!c || switching || key === c.getEncounterId()) return;
    if (dirtyRef.current) { setError("Phiếu còn thay đổi chưa lưu. Hãy Lưu phiếu trước khi chuyển lượt khám."); return; }
    const reason = c.getBinding() ? "Đang ghi âm lượt này."
      : awaitingReview().length > 0 ? "Còn nội dung ghi âm chưa che và lưu."
      : pendingTextRef.current ? "Còn nội dung đã nhập chưa che và lưu." : null;
    if (reason) { setPendingSwitch({ key, reason }); return; }
    void runSwitch(key);
  }

  async function discardAndSwitch(key: string) {
    setSwitching(true); setError("");
    try {
      await stopAndSave();
      for (const session of awaitingReview()) await discard(session);
      pendingTextRef.current = false;
    } catch (cause) {
      setError(message(cause, "Không bỏ được phần chưa duyệt."));
      setSwitching(false);
      return;
    }
    setSwitching(false);
    await runSwitch(key);
  }

  const bridge = useMemo<EncounterBridge | null>(() => {
    if (!response || !controller) return null;
    return {
      response,
      latest: () => responseRef.current ?? response,
      publish,
      setDirty: (value) => { dirtyRef.current = value; },
      setPendingText: (value) => { pendingTextRef.current = value; },
      beforeStart: () => {
        const key = controller.getEncounterId();
        if (!key) return Promise.reject(new Error("Hãy mở lượt khám trước khi ghi âm."));
        return controller.start(key);
      },
      onCaptureReady: (handle: RecordingHandle, binding: RecordingBinding) => controller.registerCapture(handle, binding),
      onCaptureFailed: (binding: RecordingBinding) => {
        controller.cancelCapture(binding);
        void stopAndSave().catch(() => undefined);
      },
      stopAndSave,
      routeText: (binding, text) => controller.routeText(binding, text),
      setTextSink: (sink) => { sinkRef.current = sink; },
      createManualSession: async () => {
        const current = responseRef.current ?? response;
        if (controller.getBinding()) throw new Error("Đang ghi âm; hãy dừng trước khi nhập tay.");
        const started = await recordingApi.start({ encounter_id: current.record.id, expected_revision: current.record.revision, device_id: deviceId(), client_request_id: crypto.randomUUID() });
        leases.current.set(started.session.id, started.lease_token);
        publish({ ...(responseRef.current ?? current), record: started.record });
        let finalized: ClinicalResponse | null = null;
        for (let attempt = 0; attempt < 2 && !finalized; attempt++) {
          try {
            const latest = responseRef.current ?? current;
            finalized = await recordingApi.finalize({ encounter_id: latest.record.id, session_id: started.session.id, lease_token: started.lease_token, expected_revision: latest.record.revision, reason: "manual_text" });
          } catch (cause) { if (attempt === 1) throw cause; }
        }
        publish(finalized!);
        const session = finalized!.record.recording_sessions.find((item) => item.id === started.session.id);
        if (!session) throw new Error("Không tạo được phiên nhập tay.");
        return session;
      },
      discardSession: discard,
      recordingActive: response.record.recording_sessions.some((item) => OPEN_STATES.includes(item.state)),
      busy: switching,
    };
  }, [response, controller, switching, publish, stopAndSave, discard]);

  // Các hàm trong bridge chỉ đọc ref khi được gọi từ sự kiện, không đọc lúc vẽ giao diện.
  // eslint-disable-next-line react-hooks/refs
  if (!response || !bridge) {
    return <div role={error ? "alert" : "status"} className="p-6 text-sm text-ef-chu">{error || "Đang mở lượt khám…"}</div>;
  }
  const patientName = response.data.ca.ho_ten;
  return (
    <>
      <EncounterSwitcher
        open={list.open}
        available={list.available}
        current={{ appointmentId: response.record.appointment_id ?? "", patientName, status: response.record.status }}
        busy={switching}
        onSwitch={requestSwitch}
      />
      {error && <p role="alert" className="mx-4 mt-3 rounded-lg border border-ef-do bg-ef-do-nhat px-4 py-3 text-sm text-ef-do print:hidden sm:mx-6">{error}</p>}
      {pendingSwitch && (
        <div role="alertdialog" aria-label="Nội dung chưa kiểm tra" className="mx-4 mt-3 rounded-lg border border-ef-vien bg-white px-4 py-3 text-sm print:hidden sm:mx-6">
          <p className="font-semibold text-ef-dam">{pendingSwitch.reason}</p>
          <p className="text-ef-phu">Hãy bấm “Che thông tin và tạo bản nháp” để lưu phần này trước khi chuyển. Nếu chuyển ngay, phần chưa lưu sẽ được bỏ (bản đã lưu trước đó vẫn được giữ).</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className={BTN_OUTLINE} onClick={() => setPendingSwitch(null)}>Ở lại lượt này</button>
            <button type="button" className={BTN_OUTLINE} disabled={switching} onClick={() => void discardAndSwitch(pendingSwitch.key)}>Bỏ phần chưa duyệt và chuyển</button>
          </div>
        </div>
      )}
      <EformScreen key={response.record.id} data={response.data} bridge={bridge} />
    </>
  );
}
