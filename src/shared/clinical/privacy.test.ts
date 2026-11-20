import assert from "node:assert/strict";
import { test } from "node:test";
import { privacyReviewRisks } from "./privacy";

test("rare disease mentions add a review cue; every text keeps the reidentification cue", () => {
  assert.ok(privacyReviewRisks("Bệnh hiếm: amyloidosis. Đang dùng tafamidis 61 mg.").includes("rare_disease_review"));
  assert.ok(privacyReviewRisks("Hội chứng rất hiếm được nhắc đến.").includes("rare_disease_review"));
  assert.deepEqual(privacyReviewRisks("Đau ngực"), ["reidentification_review"]);
});
