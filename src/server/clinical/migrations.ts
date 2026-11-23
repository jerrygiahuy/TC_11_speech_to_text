import { parseEncounter } from "@/shared/clinical/schema";
import type { Encounter } from "@/shared/clinical/types";
import { ClinicalError } from "./repository";

/** Đọc hồ sơ (hồ sơ 1.x bị từ chối bằng ClinicalError 409 để thông báo đến được UI): chỉ nhận schema 2.0.0 (CardioNote). Hồ sơ schema 1.x bị từ chối, không ghi lại. */
export function migrateEncounter(value: unknown): Encounter {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Hồ sơ không hợp lệ.");
  const version = (value as Record<string, unknown>).schema_version;
  if (version === "2.0.0") return parseEncounter(value);
  if (typeof version === "string" && version.startsWith("1.")) throw new ClinicalError("Hồ sơ schema 1.x không dùng được cho CardioNote.", 409, true);
  throw new Error("Phiên bản hồ sơ không được hỗ trợ.");
}
