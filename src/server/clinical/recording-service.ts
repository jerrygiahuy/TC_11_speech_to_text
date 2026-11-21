import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ClinicalActor, ClinicalResponse } from "@/shared/clinical/api";
import type { Encounter, RecordingSession } from "@/shared/clinical/types";
import type { StartRecordingRequest, HeartbeatRecordingRequest, FinalizeRecordingRequest, UpdateRecordingContentRequest, RecordingTicketValidator, ReviewedTranscriptTicket } from "@/shared/clinical/recording";
import { projectEform } from "@/shared/clinical/eform";
import { ClinicalError, ClinicalRepository } from "./repository";
import { resolveEncounterContextForRecord } from "./encounter-context";
import { createRecordingTicketValidator } from "./reviewed-transcripts";

export const RECORDING_LEASE_TTL_MS = 30_000;
export const RECORDING_HEARTBEAT_INTERVAL_MS = 10_000;
const id = z.string().min(1).max(200);
const revision = z.number().int().nonnegative();
const startSchema = z.object({ encounter_id: z.uuid(), expected_revision: revision.positive(), device_id: id, client_request_id: id }).strict();
const heartbeatSchema = z.object({ encounter_id: z.uuid(), session_id: z.uuid(), lease_token: z.string().min(32).max(256) }).strict();
const finalizeSchema = heartbeatSchema.extend({ expected_revision: revision.positive(), reason: z.string().trim().min(1).max(200), transcript_ticket: id.optional() }).strict();
const contentSchema = z.object({ encounter_id: z.uuid(), session_id: z.uuid(), expected_revision: revision.positive(), content_revision: revision, client_request_id: id,
  action: z.enum(["invalidate", "attach_reviewed", "discard"]), transcript_ticket: id.optional() }).strict();

type Lease = { device_id: string; encounter_id: string; session_id: string; doctor_id: string; facility_id: string; token: string;
  expires_at: string; state: "reservation" | "active" | "closed" };
export type RecordingWriteStage = "reservation" | "metadata" | "published" | "finalized";
export interface RecordingServiceOptions {
  store: ClinicalRepository;
  leaseDirectory: string;
  tickets: RecordingTicketValidator;
  now?: () => number;
  newId?: () => string;
  /** Fault boundary observer; throws leave a recoverable reservation or committed metadata. */
  onWrite?: (stage: RecordingWriteStage) => void;
}
export interface StartRecordingResult { record: Encounter; session: RecordingSession; lease_token: string }
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isOpen = (session: RecordingSession) => ["opening", "recording", "finalizing"].includes(session.state);
function conflict(message = "Phiên ghi âm đã thay đổi. Hãy tải lại hồ sơ."): never { throw new ClinicalError(message, 409); }
function sessionOf(record: Encounter, sessionId: string) {
  const session = record.recording_sessions.find(item => item.id === sessionId);
  if (!session) conflict("Phiên ghi âm không thuộc hồ sơ này.");
  return session;
}
function assertMutable(record: Encounter) {
  if (!["dang_kham", "cho_kq_cls"].includes(record.status)) conflict("Lượt khám đã kết thúc, không thể cập nhật ghi âm.");
}
function response(actor: ClinicalActor, record: Encounter): ClinicalResponse {
  const context = resolveEncounterContextForRecord(actor, record);
  return { record, context, data: context.data, snapshot: projectEform(record) };
}

/** All lease transactions acquire the device lock before the repository's encounter lock. */
export function createRecordingService(options: RecordingServiceOptions) {
  const { store, leaseDirectory, tickets, onWrite } = options;
  const now = options.now ?? Date.now;
  const newId = options.newId ?? randomUUID;
  const timestamp = () => new Date(now()).toISOString();
  const deviceFile = (deviceId: string) => path.join(leaseDirectory, `${hash(deviceId)}.json`);
  const secretFile = (sessionId: string) => path.join(leaseDirectory, `session-${sessionId}.json`);
  function readLease(file: string): Lease | undefined {
    if (!fs.existsSync(file)) return undefined;
    return JSON.parse(fs.readFileSync(file, "utf8")) as Lease;
  }
  function writeLease(file: string, lease: Lease) {
    fs.mkdirSync(leaseDirectory, { recursive: true });
    const temporary = path.join(leaseDirectory, `${randomUUID()}.tmp`);
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(temporary, "wx", 0o600);
      fs.writeFileSync(descriptor, JSON.stringify(lease) + "\n", "utf8"); fs.fsyncSync(descriptor);
      fs.closeSync(descriptor); descriptor = undefined;
      fs.renameSync(temporary, file);
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  function withDevice<T>(deviceId: string, action: () => T): T {
    fs.mkdirSync(leaseDirectory, { recursive: true });
    const lock = `${deviceFile(deviceId)}.lock`;
    const owner = JSON.stringify({ pid: process.pid, nonce: randomUUID() });
    let descriptor: number;
    try { descriptor = fs.openSync(lock, "wx", 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      // Age is never evidence that a writer stopped. Only a dead OS process permits reclamation.
      const held = fs.readFileSync(lock, "utf8");
      let dead = false;
      try {
        const holder = JSON.parse(held) as { pid?: number };
        if (Number.isSafeInteger(holder.pid) && holder.pid! > 0) {
          try { process.kill(holder.pid!, 0); } catch (cause) { dead = (cause as NodeJS.ErrnoException).code === "ESRCH"; }
        }
      } catch { /* An incompletely published lock may belong to a live writer. */ }
      if (!dead || fs.readFileSync(lock, "utf8") !== held) conflict("Thiết bị đang được cập nhật ở tab khác. Hãy thử lại.");
      fs.unlinkSync(lock);
      try { descriptor = fs.openSync(lock, "wx", 0o600); }
      catch { conflict("Thiết bị đang được cập nhật ở tab khác. Hãy thử lại."); }
    }
    try { fs.writeFileSync(descriptor, owner, "utf8"); return action(); }
    finally {
      fs.closeSync(descriptor);
      if (fs.existsSync(lock) && fs.readFileSync(lock, "utf8") === owner) fs.unlinkSync(lock);
    }
  }
  function authorized(actor: ClinicalActor, encounterId: string) {
    const record = store.read(encounterId);
    resolveEncounterContextForRecord(actor, record);
    return record;
  }
  function secret(actor: ClinicalActor, request: HeartbeatRecordingRequest, session: RecordingSession) {
    const lease = readLease(secretFile(session.id));
    const supplied = Buffer.from(request.lease_token);
    const expected = Buffer.from(lease?.token ?? "");
    if (!lease || lease.encounter_id !== request.encounter_id || lease.session_id !== request.session_id || lease.device_id !== session.device_id
      || lease.doctor_id !== actor.doctorId || lease.facility_id !== actor.facilityId || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) conflict("Mã giữ phiên không hợp lệ.");
    return lease;
  }
  function active(lease: Lease) {
    const device = readLease(deviceFile(lease.device_id));
    if (!device || device.session_id !== lease.session_id || device.token !== lease.token || device.state === "closed" || Date.parse(device.expires_at) <= now()) conflict("Phiên giữ microphone đã hết hạn.");
    return device;
  }
  function recoverDevice(actor: ClinicalActor, deviceId: string) {
    const lease = readLease(deviceFile(deviceId));
    if (!lease || lease.state === "closed" || Date.parse(lease.expires_at) > now()) return;
    if (lease.doctor_id !== actor.doctorId || lease.facility_id !== actor.facilityId) conflict("Thiết bị còn phiên của người dùng khác cần được khôi phục.");
    const current = authorized(actor, lease.encounter_id);
    const session = current.recording_sessions.find(item => item.id === lease.session_id);
    if (session && isOpen(session)) {
      store.update(current.id, current.revision, record => {
        const old = sessionOf(record, lease.session_id);
        old.state = "interrupted"; old.ended_at = timestamp(); old.stop_reason = "lease_expired";
        if (old.content_state === "empty") old.content_state = "awaiting_review";
        return record;
      }, actor.doctorId, timestamp());
    }
    const closed: Lease = { ...lease, state: "closed" };
    writeLease(secretFile(lease.session_id), closed); writeLease(deviceFile(deviceId), closed);
  }
  function journalReplay(record: Encounter, requestId: string, digest: string) {
    for (const session of record.recording_sessions) {
      const request = session.requests.find(item => item.request_id === requestId);
      if (!request) continue;
      if (request.payload_digest !== digest) conflict("Mã yêu cầu đã được dùng cho nội dung khác.");
      return session;
    }
  }
  function receipt(session: RecordingSession, ticket: string): ReviewedTranscriptTicket {
    const expected = { encounter_id: session.encounter_id, recording_session_id: session.id, generation: session.generation, content_revision: session.content_revision };
    const reviewed = tickets.validate(ticket, expected);
    if (hash(reviewed.binding) !== hash(expected) || !/^[a-f0-9]{64}$/i.test(reviewed.digest) || !reviewed.artifact_id || !reviewed.transcript_id || !Number.isSafeInteger(reviewed.transcript_revision) || reviewed.transcript_revision <= 0) conflict("Bản chép lời không khớp phiên hiện tại.");
    return reviewed;
  }
  function attach(session: RecordingSession, reviewed: ReviewedTranscriptTicket, actor: ClinicalActor) {
    const existing = session.reviewed_transcripts.find(item => item.content_revision === session.content_revision);
    if (existing && (existing.digest !== reviewed.digest || existing.artifact_id !== reviewed.artifact_id)) conflict("Phiên bản nội dung đã có bản chép lời được duyệt.");
    if (!existing) session.reviewed_transcripts.push({ content_revision: session.content_revision, digest: reviewed.digest, transcript_id: reviewed.transcript_id,
      transcript_revision: reviewed.transcript_revision, artifact_id: reviewed.artifact_id, reviewed_at: timestamp(), reviewed_by: actor.doctorId });
    session.reviewed_content_revision = session.content_revision; session.reviewed_digest = reviewed.digest; session.content_state = "reviewed";
  }

  function startRecording(actor: ClinicalActor, value: StartRecordingRequest): StartRecordingResult {
    const request = startSchema.parse(value); const digest = hash({ action: "start", ...request });
    authorized(actor, request.encounter_id);
    return withDevice(request.device_id, () => {
      let current = authorized(actor, request.encounter_id);
      const replay = journalReplay(current, request.client_request_id, digest);
      if (replay) {
        const stored = readLease(secretFile(replay.id));
        if (!stored) conflict("Không tìm thấy mã giữ phiên đã mở.");
        return { record: current, session: replay, lease_token: stored.token };
      }
      assertMutable(current);
      if (current.status !== "dang_kham") conflict("Lượt khám đang chờ kết quả; hãy tiếp tục khám trước khi ghi âm.");
      if (current.revision !== request.expected_revision) conflict();
      recoverDevice(actor, request.device_id);
      const existing = readLease(deviceFile(request.device_id));
      if (existing && existing.state !== "closed") conflict("Thiết bị đang ghi âm ở một tab khác.");
      // Recovery can advance this same encounter; require the caller to reload instead of overwriting edits.
      current = authorized(actor, request.encounter_id);
      if (current.revision !== request.expected_revision) conflict();
      if (current.recording_sessions.some(isOpen)) conflict("Lượt khám đã có một phiên ghi âm đang mở.");
      const sessionId = z.uuid().parse(newId());
      const token = randomBytes(32).toString("base64url");
      const reservation: Lease = { device_id: request.device_id, encounter_id: current.id, session_id: sessionId, doctor_id: actor.doctorId, facility_id: actor.facilityId,
        token, expires_at: new Date(now() + RECORDING_LEASE_TTL_MS).toISOString(), state: "reservation" };
      writeLease(secretFile(sessionId), reservation); writeLease(deviceFile(request.device_id), reservation); onWrite?.("reservation");
      const record = store.update(current.id, request.expected_revision, draft => {
        resolveEncounterContextForRecord(actor, draft); assertMutable(draft);
        if (draft.recording_sessions.some(isOpen)) conflict("Lượt khám đã có một phiên ghi âm đang mở.");
        const sequence = Math.max(0, ...draft.recording_sessions.map(item => item.sequence)) + 1;
        draft.recording_sessions.push({ id: sessionId, encounter_id: draft.id, sequence, device_id: request.device_id, generation: sequence, started_at: timestamp(), ended_at: null,
          state: "recording", stop_reason: null, content_state: "empty", content_revision: 0, reviewed_content_revision: null, reviewed_digest: null, reviewed_transcripts: [],
          requests: [{ request_id: request.client_request_id, payload_digest: digest, action: "start", result_id: sessionId }], discarded_at: null, discarded_by: null });
        return draft;
      }, actor.doctorId, timestamp());
      onWrite?.("metadata");
      const published: Lease = { ...reservation, state: "active" };
      writeLease(secretFile(sessionId), published); writeLease(deviceFile(request.device_id), published); onWrite?.("published");
      return { record, session: sessionOf(record, sessionId), lease_token: token };
    });
  }
  function heartbeatRecording(actor: ClinicalActor, value: HeartbeatRecordingRequest): { expires_at: string } {
    const request = heartbeatSchema.parse(value);
    const current = authorized(actor, request.encounter_id); const session = sessionOf(current, request.session_id);
    secret(actor, request, session);
    return withDevice(session.device_id, () => {
      const latest = authorized(actor, request.encounter_id); assertMutable(latest);
      if (!isOpen(sessionOf(latest, session.id))) conflict("Phiên ghi âm đã dừng.");
      const lease = active(secret(actor, request, session));
      const refreshed = { ...lease, expires_at: new Date(now() + RECORDING_LEASE_TTL_MS).toISOString(), state: "active" as const };
      writeLease(secretFile(session.id), refreshed); writeLease(deviceFile(session.device_id), refreshed);
      return { expires_at: refreshed.expires_at };
    });
  }
  function finalizeRecording(actor: ClinicalActor, value: FinalizeRecordingRequest): ClinicalResponse {
    const request = finalizeSchema.parse(value);
    const current = authorized(actor, request.encounter_id); const session = sessionOf(current, request.session_id);
    secret(actor, request, session);
    return withDevice(session.device_id, () => {
      const latest = authorized(actor, request.encounter_id); const latestSession = sessionOf(latest, session.id);
      const lease = secret(actor, request, latestSession);
      // A committed stop is idempotent independently of content updates and lease ownership afterward.
      if (!isOpen(latestSession)) {
        // Retry after a stop that committed but failed before the leases were closed: release them now.
        const held = readLease(deviceFile(session.device_id));
        if (held && held.session_id === session.id && held.state !== "closed") {
          const closed: Lease = { ...held, state: "closed" };
          writeLease(secretFile(session.id), closed); writeLease(deviceFile(session.device_id), closed);
        }
        return response(actor, latest);
      }
      assertMutable(latest); active(lease);
      if (latest.revision !== request.expected_revision) conflict();
      const reviewed = request.transcript_ticket ? receipt(latestSession, request.transcript_ticket) : undefined;
      const record = store.update(latest.id, request.expected_revision, draft => {
        resolveEncounterContextForRecord(actor, draft); assertMutable(draft);
        const target = sessionOf(draft, session.id);
        target.state = "stopped"; target.ended_at = timestamp(); target.stop_reason = request.reason;
        if (reviewed) attach(target, reviewed, actor);
        else if (target.content_state === "empty") target.content_state = "awaiting_review";
        return draft;
      }, actor.doctorId, timestamp());
      onWrite?.("finalized");
      const closed: Lease = { ...lease, state: "closed" };
      writeLease(secretFile(session.id), closed); writeLease(deviceFile(session.device_id), closed);
      return response(actor, record);
    });
  }
  function updateRecordingContent(actor: ClinicalActor, value: UpdateRecordingContentRequest): ClinicalResponse {
    const request = contentSchema.parse(value);
    if ((request.action === "attach_reviewed") !== Boolean(request.transcript_ticket)) throw new ClinicalError("Chỉ thao tác gắn nội dung đã duyệt được nhận mã kiểm tra.", 400);
    const digest = hash({ kind: "content", ...request });
    const initial = authorized(actor, request.encounter_id); const initialSession = sessionOf(initial, request.session_id);
    return withDevice(initialSession.device_id, () => {
      const current = authorized(actor, request.encounter_id);
      if (journalReplay(current, request.client_request_id, digest)) return response(actor, current);
      assertMutable(current);
      const session = sessionOf(current, request.session_id);
      if (current.revision !== request.expected_revision || session.content_revision !== request.content_revision) conflict();
      const reviewed = request.transcript_ticket ? receipt(session, request.transcript_ticket) : undefined;
      if (request.action === "attach_reviewed" && session.content_state === "discarded") conflict("Nội dung đã bỏ; hãy tạo phiên bản nội dung mới trước khi duyệt.");
      const record = store.update(current.id, request.expected_revision, draft => {
        resolveEncounterContextForRecord(actor, draft); assertMutable(draft);
        const target = sessionOf(draft, session.id);
        if (target.content_revision !== request.content_revision) conflict();
        if (request.action === "invalidate") { target.content_revision++; target.content_state = "awaiting_review"; }
        else if (request.action === "attach_reviewed") attach(target, reviewed!, actor);
        else { target.content_state = "discarded"; target.discarded_at = timestamp(); target.discarded_by = actor.doctorId; }
        target.requests.push({ request_id: request.client_request_id, payload_digest: digest, action: request.action, result_id: `${target.id}:${target.content_revision}` });
        return draft;
      }, actor.doctorId, timestamp());
      return response(actor, record);
    });
  }
  function recoverInterruptedRecordings(actor: ClinicalActor, deviceId: string): void {
    const device = id.parse(deviceId);
    withDevice(device, () => recoverDevice(actor, device));
  }
  return { startRecording, heartbeatRecording, finalizeRecording, updateRecordingContent, recoverInterruptedRecordings };
}

const defaultService = () => createRecordingService({ store: new ClinicalRepository(), leaseDirectory: path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "clinical", "recording-leases"), tickets: createRecordingTicketValidator() });
export const startRecording = (actor: ClinicalActor, request: StartRecordingRequest) => defaultService().startRecording(actor, request);
export const heartbeatRecording = (actor: ClinicalActor, request: HeartbeatRecordingRequest) => defaultService().heartbeatRecording(actor, request);
export const finalizeRecording = (actor: ClinicalActor, request: FinalizeRecordingRequest) => defaultService().finalizeRecording(actor, request);
export const updateRecordingContent = (actor: ClinicalActor, request: UpdateRecordingContentRequest) => defaultService().updateRecordingContent(actor, request);
export const recoverInterruptedRecordings = (actor: ClinicalActor, deviceId: string) => defaultService().recoverInterruptedRecordings(actor, deviceId);
