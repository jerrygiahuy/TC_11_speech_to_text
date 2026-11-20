import "server-only";
import { z } from "zod";
import type { NerKetQua } from "@/shared/clinical/pii";

/**
 * Gọi lớp NER local (`POST /ner` của dịch vụ STT) trước khi che PII.
 * Mặc định bật (từ 18/11/2026); chỉ `PII_NER=off` mới tắt và không gọi mạng (`tat`). Lỗi, quá giờ (`PII_NER_TIMEOUT_MS`, mặc định 2000), 503 hay phản hồi
 * sai dạng đều là `khong_chay`: bộ che vẫn chạy bằng rule như trước. Không bao giờ log nội dung.
 */
const span = z.object({ start: z.number().int(), end: z.number().int(), nhan: z.string(), diem: z.number() }).strict();
const response = z.object({ model_sha256: z.string(), nguong: z.number().min(0).max(1), ket_qua: z.array(z.array(span)) });

export async function goiNer(texts: readonly string[], opts: { send?: typeof fetch; env?: Readonly<Record<string, string | undefined>> } = {}): Promise<NerKetQua> {
  const env = opts.env ?? process.env;
  if (env.PII_NER?.trim().toLowerCase() === "off") return { trang_thai: "tat" };
  if (texts.length === 0) return { trang_thai: "chay", nguong: 1, model_sha256: "", spans: [] };
  const base = (env.NER_BACKEND_URL || env.STT_BACKEND_URL || "http://127.0.0.1:8765").replace(/\/$/, "");
  const timeout = Number(env.PII_NER_TIMEOUT_MS) > 0 ? Number(env.PII_NER_TIMEOUT_MS) : 2000;
  try {
    const res = await (opts.send ?? fetch)(`${base}/ner`, {
      method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: texts.map((t) => t.normalize("NFC")) }), signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return { trang_thai: "khong_chay" };
    const parsed = response.safeParse(await res.json());
    if (!parsed.success || parsed.data.ket_qua.length !== texts.length) return { trang_thai: "khong_chay" };
    return { trang_thai: "chay", spans: parsed.data.ket_qua, nguong: parsed.data.nguong, model_sha256: parsed.data.model_sha256 };
  } catch {
    return { trang_thai: "khong_chay" };
  }
}
