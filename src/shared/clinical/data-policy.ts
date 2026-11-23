import { PII_POLICY_VERSION } from "./pii/types";
/** User-defined data-use rules, not an automatic anonymization guarantee. */
export const DATA_POLICY_VERSION = "medical-data-use-2";
export type DataLevel = "public" | "masked_internal" | "deidentified" | "restricted";
/** Chỉ phía máy chủ, phải do chốt chặn R11 cấp; không bao giờ nhận từ body request. Bằng chứng bản đã qua chốt chặn PII tự động (chỉ luồng /demo-luong). Không chứng minh ẩn danh tuyệt đối. */
export interface DeidentificationProof { policy_version: typeof PII_POLICY_VERSION; gate_passed: true; consent: boolean }
export type AiDestination = "internal" | "external";

/** Conservative local recognition; manual classification remains mandatory. */
export function hasRestrictedContent(text: string): boolean {
  return /(?:hợp\s*đồng|\bcontracts?\b|system\s*prompts?|prompt\s*hệ\s*thống|chỉ\s*dẫn\s*hệ\s*thống)/iu.test(text.normalize("NFC"));
}

/** public_reference is an explicit provenance classification, never inferred from masking.
 * Clinical endpoints always pass clinical, including drug names within a patient record.
 */
export function classifyData(text: string, source: "clinical" | "public_reference" = "clinical", proof?: DeidentificationProof): DataLevel {
  if (hasRestrictedContent(text)) return "restricted";
  if (proof && source === "clinical" && proof.policy_version === PII_POLICY_VERSION && proof.gate_passed === true) return "deidentified";
  return source === "public_reference" ? "public" : "masked_internal";
}

export function assertDataUseAllowed(level: DataLevel, destination: AiDestination, consent: boolean): void {
  if (level === "restricted") throw new Error("Dữ liệu cấp 3 không được đưa vào AI, kể cả AI nội bộ.");
  if (level === "masked_internal" && destination !== "internal") {
    throw new Error("Bệnh án đã masking thuộc cấp 2, chỉ được xử lý nội bộ; không gửi tới AI bên ngoài.");
  }
  if (level === "deidentified" && destination === "external" && !consent) throw new Error("Bệnh nhân chưa đồng ý xử lý AI — chỉ được chạy bộ tách local.");
  if (level === "masked_internal" && !consent) throw new Error("Cần sự đồng ý rõ ràng trước khi xử lý dữ liệu cấp 2 nội bộ.");
}
