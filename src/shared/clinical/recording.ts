import type { RecordingContext, RecordingSession } from "./types";

export type { RecordingSession, ReviewedTranscriptRevision, RecordingRequestResult } from "./types";
export type TranscriptBinding = RecordingContext;
/** Captured before async microphone start; never replace with the currently selected patient. */
export interface RecordingBinding { encounterId: string; recordingSessionId: string; generation: number }
export interface RecordingHandle { stop(): Promise<void>; cancel(): void }
export type RecordingState = RecordingSession["state"];
export type RecordingContentState = RecordingSession["content_state"];

export interface StartRecordingRequest { encounter_id: string; expected_revision: number; device_id: string; client_request_id: string }
export interface HeartbeatRecordingRequest { encounter_id: string; session_id: string; lease_token: string }
export interface FinalizeRecordingRequest extends HeartbeatRecordingRequest { expected_revision: number; reason: string; transcript_ticket?: string }
export interface UpdateRecordingContentRequest {
  encounter_id: string; session_id: string; expected_revision: number; content_revision: number; client_request_id: string;
  action: "invalidate" | "attach_reviewed" | "discard"; transcript_ticket?: string;
}
export type InvalidateContentRequest = UpdateRecordingContentRequest & { action: "invalidate" };
export type AttachTranscriptRequest = UpdateRecordingContentRequest & { action: "attach_reviewed"; transcript_ticket: string };
export type DiscardContentRequest = UpdateRecordingContentRequest & { action: "discard" };

/** Inject ticket checking to keep recording transactions independent of privacy services. */
export interface ReviewedTranscriptTicket {
  binding: TranscriptBinding;
  digest: string;
  transcript_id: string;
  transcript_revision: number;
  artifact_id: string;
}
export interface RecordingTicketValidator { validate(ticket: string, expected: TranscriptBinding): ReviewedTranscriptTicket }
