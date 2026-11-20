import { createHash } from "node:crypto";
import { parseEncounter } from "@/shared/clinical/schema";
import type { Encounter, JsonValue } from "@/shared/clinical/types";

/** Pure read migration. No fabricated recordings and no write-on-read side effect. */
export function migrateEncounter(value: unknown): Encounter {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Hồ sơ không hợp lệ.");
  const record = value as Record<string, unknown>;
  if (record.schema_version === "1.2.0") return parseEncounter(value);
  if (record.schema_version !== "1.1.0") throw new Error("Phiên bản hồ sơ không được hỗ trợ.");
  if (["recording_sessions", "approval_versions", "change_decisions"].some(key => key in record)) throw new Error("Hồ sơ legacy có metadata phiên bản mới.");
  // Validate all original clinical fields before retaining the immutable legacy snapshot.
  const migrated = parseEncounter({ ...record, schema_version: "1.2.0", recording_sessions: [], approval_versions: [], change_decisions: [] });
  if (migrated.audit.approved_at !== null) {
    const snapshot = structuredClone(value) as JsonValue;
    const digest = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
    migrated.approval_versions.push({
      id: `legacy-${migrated.id}-r${migrated.revision}`, scope: "legacy", snapshot, digest,
      approved_by: migrated.audit.approved_by!, approved_at: migrated.audit.approved_at,
      sources: structuredClone(migrated.nguon_du_lieu),
    });
  }
  return parseEncounter(migrated);
}
