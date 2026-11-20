import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyData, assertDataUseAllowed, hasRestrictedContent } from "./data-policy";

test("masked clinical text never becomes public and consent does not allow external AI", () => {
  assert.equal(classifyData("[NGƯỜI_ĐÃ_ẨN] đang dùng thuốc đặc thù", "clinical"), "masked_internal");
  assert.throws(() => assertDataUseAllowed("masked_internal", "external", true));
  assert.throws(() => assertDataUseAllowed("masked_internal", "internal", false));
  assert.doesNotThrow(() => assertDataUseAllowed("masked_internal", "internal", true));
});

test("drug references may be public while clinical medication use is internal", () => {
  assert.equal(classifyData("amiodarone", "public_reference"), "public");
  assert.equal(classifyData("Bệnh nhân dùng amiodarone", "clinical"), "masked_internal");
  assert.doesNotThrow(() => assertDataUseAllowed("public", "external", false));
});

test("contracts and confidential system prompts cannot be sent to any AI", () => {
  for (const text of ["Hợp đồng khám sức khỏe", "System prompt bí mật", "Nội dung prompt hệ thống"]) {
    assert.equal(hasRestrictedContent(text), true);
    assert.equal(classifyData(text, "public_reference"), "restricted");
    for (const destination of ["internal", "external"] as const) {
      assert.throws(() => assertDataUseAllowed("restricted", destination, true));
    }
  }
});

const proof = (consent: boolean) => ({ policy_version: "pii-auto-2", gate_passed: true, consent }) as const;

test("bản đã qua chốt chặn pii-auto-2 thành deidentified; restricted vẫn restricted", () => {
  assert.equal(classifyData("[BỆNH_NHÂN] đau họng ba ngày", "clinical", proof(true)), "deidentified");
  assert.equal(classifyData("[BỆNH_NHÂN] đau họng ba ngày", "clinical", proof(false)), "deidentified");
  assert.equal(classifyData("Hợp đồng khám sức khỏe", "clinical", proof(true)), "restricted");
  assert.equal(classifyData("[BỆNH_NHÂN] đau họng", "clinical"), "masked_internal");
});

test("deidentified: ra ngoài chỉ khi có đồng ý; cấp 2 vẫn không ra ngoài", () => {
  assert.doesNotThrow(() => assertDataUseAllowed("deidentified", "external", true));
  assert.doesNotThrow(() => assertDataUseAllowed("deidentified", "internal", true));
  assert.doesNotThrow(() => assertDataUseAllowed("deidentified", "internal", false));
  assert.throws(() => assertDataUseAllowed("deidentified", "external", false), { message: "Bệnh nhân chưa đồng ý xử lý AI — chỉ được chạy bộ tách local." });
  assert.throws(() => assertDataUseAllowed("masked_internal", "external", true));
});
