import "server-only";
import fs from "node:fs";
import path from "node:path";
import { buildAuditEntry, type PiiAuditEntry } from "@/shared/clinical/pii";
import { ClinicalError } from "./repository";

/** Giá trị provider/model khi R11 chặn và không gọi AI. */
export const AUDIT_NOT_CALLED = "khong_goi";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultDirectory = () => path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "clinical", "audit");

/** R13: thêm một dòng nhật ký cho lượt khám. Dựng lại qua buildAuditEntry để không trường lạ (bản thô) nào lọt vào file. */
export function appendPiiAudit(encounterId: string, entry: PiiAuditEntry, directory = defaultDirectory()): void {
  if (!UUID.test(encounterId)) throw new ClinicalError("Mã lượt khám không hợp lệ.", 400);
  const { at, ...rest } = entry;
  const safe = buildAuditEntry({ ...rest, now: at });
  fs.mkdirSync(directory, { recursive: true });
  fs.appendFileSync(path.join(directory, `${encounterId}.ndjson`), JSON.stringify(safe) + "\n", "utf8");
}
