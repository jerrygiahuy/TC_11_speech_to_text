import { parseEncounter } from "@/shared/clinical/schema";
import type { Encounter } from "@/shared/clinical/types";

/** Đọc hồ sơ: chỉ nhận schema 2.0.0 (CardioNote). Hồ sơ schema 1.x (bản cũ) bị từ chối, không chuyển đổi, không ghi lại. */
export function migrateEncounter(value: unknown): Encounter {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Hồ sơ không hợp lệ.");
  const version = (value as Record<string, unknown>).schema_version;
  if (version === "2.0.0") return parseEncounter(value);
  if (typeof version === "string" && version.startsWith("1.")) throw new Error("Hồ sơ TMH cũ (schema 1.x) không dùng được cho CardioNote.");
  throw new Error("Phiên bản hồ sơ không được hỗ trợ.");
}
