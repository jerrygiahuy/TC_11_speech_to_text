import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { RecordingTicketValidator, TranscriptBinding } from "@/shared/clinical/recording";
import type { Transcript } from "@/shared/clinical/types";
import { parseTranscript } from "@/shared/clinical/schema";
import { ClinicalError } from "./repository";
import { PrivacyTickets, privacyTickets } from "./privacy";

const defaultDirectory = () => path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "clinical", "reviewed-transcripts");
const artifactPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}-r[1-9]\d*$/i;
const digestOf = (transcript: Transcript) => createHash("sha256").update(JSON.stringify(transcript)).digest("hex");

function verifyBinding(actual: Transcript["binding"], expected: TranscriptBinding) {
  if (!actual || actual.encounter_id !== expected.encounter_id || actual.recording_session_id !== expected.recording_session_id
    || actual.generation !== expected.generation || actual.content_revision !== expected.content_revision) {
    throw new ClinicalError("Bản chép lời không thuộc phiên khám hiện tại.", 409);
  }
}

/** Caller must authorize the encounter before loading its immutable reviewed artifact. */
export function readReviewedTranscript(artifactId: string, binding: TranscriptBinding, directory = defaultDirectory()): Transcript {
  if (!artifactPattern.test(artifactId)) throw new ClinicalError("Mã bản chép lời không hợp lệ.", 400);
  const value = JSON.parse(fs.readFileSync(path.join(directory, `${artifactId}.json`), "utf8")) as { digest: string; transcript: unknown };
  const transcript = parseTranscript(value.transcript);
  verifyBinding(transcript.binding, binding);
  if (transcript.privacy.trang_thai !== "passed" || value.digest !== digestOf(transcript)
    || artifactId !== `${transcript.transcript_id}-r${transcript.revision}`) {
    throw new ClinicalError("Bản chép lời đã lưu không đạt kiểm tra toàn vẹn.", 409);
  }
  return transcript;
}

/** Persist only server-reviewed text, independently of whether AI is ever invoked. */
export function createRecordingTicketValidator(tickets: PrivacyTickets = privacyTickets, directory = defaultDirectory()): RecordingTicketValidator {
  return { validate(ticket, expected) {
    const { transcript, digest } = tickets.reviewed(ticket, expected);
    const artifactId = `${transcript.transcript_id}-r${transcript.revision}`;
    if (!artifactPattern.test(artifactId)) throw new ClinicalError("Mã bản chép lời không hợp lệ.", 400);
    fs.mkdirSync(directory, { recursive: true });
    const file = path.join(directory, `${artifactId}.json`);
    if (!fs.existsSync(file)) {
      const temporary = path.join(directory, `${randomUUID()}.tmp`);
      let descriptor: number | undefined;
      try {
        descriptor = fs.openSync(temporary, "wx", 0o600);
        fs.writeFileSync(descriptor, JSON.stringify({ digest, transcript }) + "\n", "utf8");
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor); descriptor = undefined;
        try { fs.linkSync(temporary, file); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
      } finally {
        if (descriptor !== undefined) fs.closeSync(descriptor);
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      }
    }
    const persisted = readReviewedTranscript(artifactId, expected, directory);
    if (digestOf(persisted) !== digest) throw new ClinicalError("Bản chép lời đã tồn tại với nội dung khác.", 409);
    return { binding: structuredClone(expected), digest, transcript_id: transcript.transcript_id,
      transcript_revision: transcript.revision, artifact_id: artifactId };
  } };
}
