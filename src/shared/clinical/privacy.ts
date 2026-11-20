// Bộ lọc regex cũ (local-review-2) đã thay bằng pii-auto-1 (src/shared/clinical/pii/) chạy ở máy chủ.

/** Review cues, never a certificate of anonymization or an automatic rare-disease classifier. */
export function privacyReviewRisks(input: string): string[] {
  const risks = ["reidentification_review"];
  if (/(?:bệnh|hội chứng)\s+(?:rất\s+)?hiếm|rare\s+disease/iu.test(input.normalize("NFC"))) risks.push("rare_disease_review");
  return risks;
}
