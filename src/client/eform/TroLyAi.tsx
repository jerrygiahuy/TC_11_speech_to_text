"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MicButton } from "@/client/chung/MicButton";
import { ClinicalChanges } from "@/client/eform/ClinicalChanges";
import type { EncounterBridge } from "@/client/eform/encounter-bridge";
import { checkClinicalPrivacy, extractClinicalDraft, recordingApi, type ClinicalResponse } from "@/client/clinical-api";
import type { ClinicalExtraction, PrivacyCheckResult, SpeakerMode, TranscriptBinding } from "@/shared/clinical/api";
import { privacyReviewRisks } from "@/shared/clinical/privacy";
import { ganVaiTroChoDoan, noiChu } from "@/shared/clinical/vai-tro-nguoi-noi";
import { NHAN_CHE, RULES, TEN_LY_DO_CHAN, TEN_RULE, gioVN, nhanNer } from "@/shared/clinical/pii/nhan";
import type { RecordingSession } from "@/shared/clinical/types";
import type { InputMode } from "@/shared/metrics";

export type TabId = "phieu" | "chi_dinh" | "don_thuoc";

interface Props {
  /** Không có bridge (trang trình diễn): trợ lý lâm sàng không gắn được vào lượt khám nên chỉ hiện thông báo */
  bridge: EncounterBridge | null;
  /** Phiếu còn thay đổi chưa lưu: chưa cho quyết định đề xuất AI */
  dirty: boolean;
  onDecided: (response: ClinicalResponse) => void;
  onBatDau: (mode: InputMode, sample: boolean) => void;
  onOpenTab: (tab: TabId) => void;
  soChiDinh: number;
  vanBanDau?: string;
  hoiThoai?: { ai: "BS" | "BN"; cau: string }[];
  onGoTo?: (id: string) => void;
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tim";
const NUT_CHINH = `w-full rounded-lg bg-tim py-2.5 text-sm font-semibold text-white hover:bg-tim/90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
const NUT_PHU = `w-full rounded-lg border border-tim-vien bg-white py-2.5 text-sm font-semibold text-tim hover:bg-tim-nhat disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;

const MAU_HOI_THOAI = "BN: Đau họng 3 ngày, không sốt.\nBS: Khám thấy họng đỏ. Chẩn đoán ban đầu viêm họng cấp. Chỉ định nội soi họng, số lượng 1. Lời dặn uống đủ nước. Hẹn tái khám sau 3 ngày.";

const OPEN_STATES: RecordingSession["state"][] = ["opening", "recording", "finalizing"];

/** Bản đã che: tô các nhãn [..] để bác sĩ thấy chỗ nào đã được thay. */
function BanDaChe({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(NHAN_CHE)) {
    if (m.index > at) parts.push(text.slice(at, m.index));
    parts.push(<mark key={m.index} className="rounded bg-tim-nhat px-0.5 font-semibold text-tim ring-1 ring-tim-vien">{m[0]}</mark>);
    at = m.index + m[0].length;
  }
  parts.push(text.slice(at));
  return <p className="whitespace-pre-wrap break-words rounded-md border border-ef-vien bg-white px-3 py-2 text-sm leading-6 text-ef-chu">{parts}</p>;
}
const usable = (session: RecordingSession) => session.content_state !== "discarded";

export function TroLyAi({ bridge, dirty, onDecided, onBatDau, onOpenTab, soChiDinh, vanBanDau, hoiThoai }: Props) {
  // Ô nhập giữ chữ gốc, chỉ nằm trong bộ nhớ trình duyệt; máy chủ là nơi duy nhất che trước khi tạo bản nháp.
  const [text, setText] = useState(() => vanBanDau ?? "");
  const [mode, setMode] = useState<SpeakerMode>("conversation");
  /** Chữ tạm từ micro (chưa chốt): hiện nối sau nội dung trong ô nhập để bác sĩ thấy máy đang nghe được gì */
  const [interim, setInterim] = useState("");
  const [check, setCheck] = useState<PrivacyCheckResult | null>(null);
  const [extraction, setExtraction] = useState<ClinicalExtraction | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  /** Các phiên bản nội dung đã phát hành mã kiểm tra; sửa chữ sau đó phải tăng phiên bản trước khi kiểm tra lại. */
  const usedRevisions = useRef(new Set<string>());
  const appendRef = useRef<(chunk: string, sessionId: string) => void>(() => {});
  /** Phiên ghi âm vừa nối chữ vào ô: cùng phiên thì nối bằng dấu cách để câu không bị ngắt dòng giữa chừng */
  const lastMicSession = useRef<string | null>(null);
  /** Bản sao để vẽ: ô đang nối tiếp chữ của một phiên ghi âm (chữ tạm nối bằng dấu cách) */
  const [noiTiepMic, setNoiTiepMic] = useState(false);
  /** Đoạn chữ của lần ghi âm đang chạy bắt đầu từ vị trí này trong ô nhập; dừng ghi thì đổi nhãn người nói trong đoạn đó */
  const micBlock = useRef<{ sessionId: string; start: number } | null>(null);
  const lyDoVaiTroRef = useRef("");
  /** Người nói khớp giọng bác sĩ đã đăng ký ở lần ghi vừa dừng (STT backend báo khi chốt phiên) */
  const giongBacSiRef = useRef<number | null>(null);
  const [dangGhi, setDangGhi] = useState(false);
  /** Kết quả tự phân vai bác sĩ/bệnh nhân của lần ghi gần nhất */
  const [lyDoVaiTro, setLyDoVaiTro] = useState("");
  const encounterId = bridge?.response.record.id ?? null;
  const record = bridge?.response.record ?? null;
  const canWrite = record?.status === "dang_kham";

  function invalidate() {
    sequence.current += 1;
    setCheck(null);
    setExtraction(null);
    setReviewed(false);
    setError(null);
    setLoading(false);
  }

  function setInput(next: string) {
    invalidate();
    lastMicSession.current = null;
    setNoiTiepMic(false);
    setText(next);
  }

  function appendInput(chunk: string, sessionId: string) {
    invalidate();
    const cungLanGhi = lastMicSession.current === sessionId;
    lastMicSession.current = sessionId;
    setNoiTiepMic(true);
    // Vị trí bắt đầu chỉ biết khi updater chạy; ghi một lần (React dev gọi updater hai lần, lần sau giữ nguyên).
    const block = cungLanGhi ? null : { sessionId, start: -1 };
    if (block) micBlock.current = block;
    setText((current) => {
      if (block && block.start < 0) block.start = current ? current.length + 1 : 0;
      return noiChu(current, chunk, cungLanGhi);
    });
  }

  /** Dừng ghi: đổi "Người nói N:" trong đoạn vừa ghi thành BS/BN theo nội dung; bác sĩ không phải chọn gì. */
  function ketThucGhi() {
    setDangGhi(false);
    // Lấy đoạn ra ngoài updater: updater phải thuần (React dev gọi hai lần), không được xóa ref bên trong.
    const block = micBlock.current;
    const giongBacSi = giongBacSiRef.current;
    micBlock.current = null;
    giongBacSiRef.current = null;
    setText((current) => {
      if (!block || block.start < 0) { lyDoVaiTroRef.current = ""; return current; }
      const { text: daGan, ketQua } = ganVaiTroChoDoan(current.slice(block.start), giongBacSi);
      lyDoVaiTroRef.current = ketQua.lyDo;
      return current.slice(0, block.start) + daGan;
    });
    // Hàng đợi state xử lý theo thứ tự khai báo hook: text (ở trên) chạy trước nên ref đã có lý do.
    setLyDoVaiTro(() => lyDoVaiTroRef.current);
  }
  useEffect(() => { appendRef.current = appendInput; });

  // Chữ từ micro chỉ vào ô này khi binding thuộc đúng lượt khám đang mở.
  useEffect(() => {
    if (!bridge) return;
    // binding.encounterId là mã lịch hẹn (khóa mở lượt), không phải record.id: so theo phiên ghi âm thuộc hồ sơ đang mở.
    bridge.setTextSink((source, chunk) => {
      if (bridge.latest().record.recording_sessions.some((item) => item.id === source.recordingSessionId)) appendRef.current(chunk, source.recordingSessionId);
    });
    return () => bridge.setTextSink(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  const hasPendingText = text.trim().length > 0 && !reviewed;
  useEffect(() => { bridge?.setPendingText(hasPendingText); }, [bridge, hasPendingText]);

  /** Phiên đang làm việc: phiên mới nhất chưa bị bỏ. Chưa có thì tạo một phiên nhập tay ngay khi cần. */
  async function ensureBinding(): Promise<TranscriptBinding> {
    if (!bridge) throw new Error("Chưa mở lượt khám.");
    let latest = bridge.latest().record;
    let session = latest.recording_sessions.filter(usable).sort((a, b) => a.sequence - b.sequence).at(-1);
    if (session && OPEN_STATES.includes(session.state)) throw new Error("Hãy dừng ghi âm trước khi kiểm tra nội dung.");
    if (!session) session = await bridge.createManualSession();
    latest = bridge.latest().record;
    session = latest.recording_sessions.find((item) => item.id === session!.id) ?? session;
    const key = `${session.id}:${session.content_revision}`;
    if (session.content_revision < 1 || session.content_state !== "awaiting_review" || usedRevisions.current.has(key)) {
      const updated = await recordingApi.content({ encounter_id: latest.id, session_id: session.id, expected_revision: latest.revision, content_revision: session.content_revision, client_request_id: crypto.randomUUID(), action: "invalidate" });
      bridge.publish(updated);
      session = updated.record.recording_sessions.find((item) => item.id === session!.id)!;
    }
    usedRevisions.current.add(`${session.id}:${session.content_revision}`);
    return { encounter_id: session.encounter_id, recording_session_id: session.id, generation: session.generation, content_revision: session.content_revision };
  }

  /** Máy chủ che (R1–R8, R10) → chốt chặn R11 → đồng ý R14. Qua thì lưu bản đã che vào phiên rồi tạo bản nháp; bị chặn thì dừng, không gửi AI. */
  async function checkAndExtract() {
    if (!text.trim() || loading || !bridge) return;
    invalidate();
    const request = ++sequence.current;
    setLoading(true);
    try {
      const target = await ensureBinding();
      if (request !== sequence.current) return;
      const result = await checkClinicalPrivacy(text, mode, target);
      if (request !== sequence.current) return;
      setCheck(result);
      if (result.status === "blocked" || !result.ticket) return;
      // Lưu bản đã che vào đúng phiên trước khi tạo bản nháp; chỉ sau xác nhận của server mới coi là đã lưu.
      const latest = bridge.latest().record;
      bridge.publish(await recordingApi.content({ encounter_id: latest.id, session_id: target.recording_session_id, expected_revision: latest.revision, content_revision: target.content_revision, client_request_id: crypto.randomUUID(), action: "attach_reviewed", transcript_ticket: result.ticket }));
      if (request !== sequence.current) return;
      setReviewed(true);
      const draft = await extractClinicalDraft(result.ticket, target);
      if (request !== sequence.current) return;
      setExtraction(draft);
    } catch (err) {
      if (request === sequence.current) setError(err instanceof Error ? err.message : "Không tạo được bản nháp.");
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }

  const dirtyReason = dirty ? "Phiếu còn thay đổi chưa lưu. Hãy bấm Lưu phiếu rồi chọn các đề xuất để áp dụng." : null;

  return (
    <aside className="flex flex-col self-start rounded-xl border border-tim-vien bg-white text-[13px] shadow-[0_1px_2px_rgba(26,37,51,0.06)] lg:sticky lg:top-[calc(var(--cao-dau)+1rem)] lg:max-h-[calc(100vh-var(--cao-dau)-var(--cao-day)-2rem)] lg:overflow-y-auto">
      <div className="space-y-2 border-b border-tim-vien/60 bg-tim-nhat px-4 py-3">
        <h2 className="text-[15px] font-semibold text-tim">✨ Trợ lý lâm sàng</h2>
        <p className="text-xs text-ef-phu">Nhập nội dung. Máy chủ tự che thông tin nhận dạng (R1–R14) rồi mới tạo bản nháp; bác sĩ chọn từng đề xuất để duyệt.</p>
      </div>
      {!bridge ? (
        <div className="px-4 py-4"><p role="status" className="text-xs text-ef-phu">Trợ lý lâm sàng chỉ hoạt động trong một lượt khám đã mở. Trang trình diễn không ghi hồ sơ.</p></div>
      ) : (
      <div className="space-y-3 px-4 py-4">
        {!canWrite && <p role="status" className="rounded-md bg-ef-nen px-3 py-2 text-xs text-ef-phu">Lượt khám không ở trạng thái Đang khám nên chưa ghi âm hoặc nhập nội dung mới. Chọn Tiếp tục khám để làm tiếp.</p>}
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-xs font-semibold text-ef-chu">Cách ghi nhận</legend>
          <label className="mr-4 inline-flex items-center gap-1.5"><input type="radio" name="clinical-mode" checked={mode === "conversation"} onChange={() => { invalidate(); setMode("conversation"); }} /> Hội thoại</label>
          <label className="inline-flex items-center gap-1.5"><input type="radio" name="clinical-mode" checked={mode === "dictation"} onChange={() => { invalidate(); setMode("dictation"); }} /> Bác sĩ đọc</label>
        </fieldset>
        {canWrite && (
          <MicButton
            onStart={() => { setDangGhi(true); setLyDoVaiTro(""); onBatDau("noi", false); }}
            onInterim={setInterim}
            onGiongBacSi={(speaker) => { giongBacSiRef.current = speaker; }}
            onText={(chunk, source) => { if (source) bridge.routeText(source, chunk); }}
            beforeStart={bridge.beforeStart}
            onCaptureReady={bridge.onCaptureReady}
            onCaptureFailed={bridge.onCaptureFailed}
            onStopRequest={() => { void bridge.stopAndSave().catch((cause) => setError(cause instanceof Error ? cause.message : "Không dừng được ghi âm.")); }}
            onStop={() => { ketThucGhi(); void bridge.stopAndSave().catch(() => undefined); }}
          />
        )}
        <textarea aria-label="Nội dung buổi khám" rows={5} value={interim ? noiChu(text, interim, noiTiepMic) : text} readOnly={dangGhi || Boolean(interim)} onChange={(event) => { setInput(event.target.value); onBatDau("go", false); }} placeholder="Ghi lời bệnh nhân và bác sĩ. Máy chủ che thông tin nhận dạng trước khi tạo bản nháp." className="w-full rounded-lg border border-ef-vien bg-white px-3 py-2 text-sm leading-6 text-ef-chu outline-none placeholder:text-ef-phu/80 focus:border-tim focus:ring-2 focus:ring-tim/20" />
        {lyDoVaiTro && <p role="status" className="text-xs text-ef-phu">Tự phân vai: {lyDoVaiTro}</p>}
        {hasPendingText && <p className="text-xs text-ef-phu">Nội dung này chưa được che và lưu. Tạo bản nháp, hoặc xóa trước khi chuyển lượt khám.</p>}
        {hoiThoai && <button type="button" className="text-xs font-medium text-tim underline-offset-2 hover:underline" onClick={() => { setInput(hoiThoai.map(({ ai, cau }) => `${ai}: ${cau}`).join("\n")); onBatDau("noi", true); }}>Nạp hội thoại mẫu</button>}
        <button type="button" className="text-xs font-medium text-tim underline-offset-2 hover:underline" onClick={() => { setInput(MAU_HOI_THOAI); onBatDau("noi", true); }}>Thử hội thoại tổng hợp</button>
        <button type="button" className={NUT_CHINH} disabled={loading || !text.trim() || !canWrite || bridge.recordingActive} onClick={() => void checkAndExtract()}>{loading ? "Đang xử lý…" : "Che thông tin và tạo bản nháp"}</button>
        {check?.status === "blocked" && <div role="alert" className="space-y-1 rounded-lg border border-ef-do/40 bg-ef-do-nhat px-3 py-2 text-xs text-ef-do">
          <p className="font-semibold">Chưa gửi AI: còn sót thông tin nhận dạng</p>
          <ul className="list-disc space-y-0.5 pl-4">{check.gate.reasons.map((item, index) => <li key={index}>{TEN_LY_DO_CHAN[item.reason] ?? item.reason}{item.excerpt ? <>: <code className="break-all rounded bg-white px-1">{item.excerpt}</code></> : null}</li>)}</ul>
          <p>Hệ thống không tự che được phần này. Sửa nội dung trong ô rồi bấm lại.</p>
        </div>}
        {check && <section aria-label="Bản đã che" className="space-y-2 rounded-lg border border-tim-vien bg-tim-nhat/50 p-3">
          <h3 className="text-xs font-semibold text-ef-chu">{check.status === "passed" ? "Bản đã che (nội dung gửi AI)" : "Bản đã che (chưa gửi AI)"}</h3>
          <BanDaChe text={check.preview} />
          <p className="text-xs text-ef-phu">Đã che: {RULES.filter((rule) => check.counts[rule] > 0).map((rule, index) => <span key={rule}>{index > 0 && " · "}<abbr title={TEN_RULE[rule]} className="no-underline">{rule} × {check.counts[rule]}</abbr></span>)}{RULES.every((rule) => check.counts[rule] === 0) && (check.auto_masked.length ? "không có mục nào theo R1–R8" : "không có mục nào")}</p>
          {check.auto_masked.length > 0 && <div role="status" className="text-xs text-ef-phu">
            <p>Tự che thêm {check.auto_masked.length} mục còn sót (không cần sửa tay):</p>
            <ul className="list-disc space-y-0.5 pl-4">{check.auto_masked.map((item, index) => <li key={index}>{TEN_LY_DO_CHAN[item.reason] ?? item.reason}{item.excerpt ? <>: <code className="break-all rounded bg-white px-1">{item.excerpt}</code></> : null}</li>)}</ul>
          </div>}
          <p className="text-xs text-ef-phu">{check.dong_y.trang_thai ? `Đồng ý AI: ✓ (lúc tiếp đón, ${gioVN(check.dong_y.luc)})` : "Đồng ý AI: ✗ — chỉ chạy bộ tách trên máy chủ"}</p>
          <p className="text-xs text-ef-phu">{nhanNer(check.ner)}</p>
          {privacyReviewRisks(check.preview).includes("rare_disease_review") && <p role="status" className="text-xs text-ef-phu">Có nhắc bệnh hiếm: tuổi, giới, thời điểm và bệnh hiếm ghép lại vẫn có thể nhận ra người bệnh; hệ thống không tự xóa chẩn đoán.</p>}
        </section>}
        {error && <p role="alert" className="rounded-md bg-ef-do-nhat px-3 py-2 text-xs text-ef-do">{error}</p>}
        {extraction && <section className="space-y-3 border-t border-ef-vien pt-3" aria-label="Bản nháp lâm sàng">
          <h3 className="font-semibold text-ef-chu">Bản nháp · bác sĩ cần duyệt</h3>
          <p><span className="font-medium">Tóm tắt:</span> {extraction.draft.tom_tat || "Chưa có tóm tắt."}</p>
          {extraction.draft.phieu_kham.chan_doan.length > 0 && <div><h4 className="font-medium">Chẩn đoán được nhắc đến</h4><ul className="list-disc space-y-1 pl-5">{extraction.draft.phieu_kham.chan_doan.map((diagnosis, index) => <li key={index}>{diagnosis.giai_doan} · {diagnosis.vai_tro}: {diagnosis.mo_ta || "Chưa rõ mô tả"} ({diagnosis.muc_do_khang_dinh || "chưa rõ mức độ"})</li>)}</ul></div>}
          {(extraction.draft.phieu_kham.co_thuoc_dang_dung || extraction.draft.phieu_kham.thuoc_dang_dung.length > 0) && <div><h4 className="font-medium">Thuốc đang dùng</h4>{extraction.draft.phieu_kham.thuoc_dang_dung.length ? <ul className="list-disc space-y-1 pl-5">{extraction.draft.phieu_kham.thuoc_dang_dung.map((medication, index) => <li key={index}>{[medication.ten, medication.ham_luong, medication.cach_dung, medication.trang_thai].filter(Boolean).join(" · ") || "Thiếu chi tiết"}</li>)}</ul> : <p>Được nhắc đến nhưng chưa có chi tiết.</p>}</div>}
          {extraction.draft.phieu_kham.di_ung.trang_thai !== "chua_de_cap" && <p><span className="font-medium">Dị ứng:</span> {[extraction.draft.phieu_kham.di_ung.trang_thai, ...extraction.draft.phieu_kham.di_ung.loai, extraction.draft.phieu_kham.di_ung.mo_ta].filter(Boolean).join(" · ")}</p>}
          {extraction.draft.can_xem_lai.length > 0 && <div><h4 className="font-medium">Cần xem lại</h4><ul className="list-disc space-y-1 pl-5">{extraction.draft.can_xem_lai.map((issue, index) => <li key={`${issue.field_path}-${index}`}>{issue.mo_ta}</li>)}</ul></div>}
          {extraction.draft.bang_chung.length > 0 && <details><summary className="cursor-pointer font-medium">Bằng chứng trích từ nội dung đã lọc</summary><ul className="mt-1 list-disc space-y-1 pl-5">{extraction.draft.bang_chung.map((evidence, index) => <li key={`${evidence.field_path}-${index}`}><span className="text-ef-phu">{evidence.field_path}: </span>“{evidence.trich_doan}”</li>)}</ul></details>}
          <p className="text-xs text-ef-phu">Đơn thuốc không được tạo tự động; bác sĩ kê toa riêng.</p>
          {encounterId && <ClinicalChanges key={extraction.run_id} encounterId={encounterId} runId={extraction.run_id} latestRevision={() => bridge.latest().record.revision} blockedReason={dirtyReason} onDecided={(response) => { setExtraction(null); onDecided(response); }} />}
        </section>}
        <button type="button" className={NUT_PHU} onClick={() => onOpenTab("chi_dinh")}>{soChiDinh} chỉ định</button>
      </div>
      )}
    </aside>
  );
}
