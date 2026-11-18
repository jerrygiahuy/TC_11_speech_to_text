// Lưu kết quả các lượt thử thành file JSON trong data/sessions/.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { SessionInput, SessionRecord } from "@/shared/metrics";

const SESSIONS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "sessions");

export function saveSession(input: SessionInput): SessionRecord {
  const now = new Date();
  const record: SessionRecord = { ...input, id: randomUUID(), thoi_diem: now.toISOString() };
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  // Tên file do server tạo, không lấy từ dữ liệu người dùng gửi lên
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(SESSIONS_DIR, `${stamp}-${record.id}.json`), JSON.stringify(record, null, 2));
  return record;
}

/** Danh sách lượt thử, mới nhất lên đầu */
export function listSessions(): SessionRecord[] {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  return fs
    .readdirSync(SESSIONS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse()
    .map((file) => JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), "utf8")) as SessionRecord);
}
