// Luồng xử lý chung cho API và script chấm điểm:
// tách văn bản -> chỉ giữ trường AI được điền -> khớp danh mục -> tính tổng số lượng.
import "server-only";
import type { PipelineResult } from "@/shared/api";
import { applyCatalogMatch } from "@/shared/match";
import type { CaseData, Catalogs, Draft, FormConfig, VietTat, WarningRules } from "@/shared/types";
import { applyTotals } from "@/shared/validate";
import { extractDraft } from "./llm";
import { fillDraft, keepAiFieldsOnly } from "./schema";

export interface PipelineContext {
  forms: FormConfig[];
  catalogs: Catalogs;
  vietTat: VietTat;
  rules: WarningRules;
  cases: CaseData[];
}

export async function runPipeline(
  text: string,
  ctx: PipelineContext,
  options: { provider: string; ruleOnly?: boolean; mau?: Draft },
): Promise<PipelineResult> {
  const startedAt = Date.now();
  const extracted = await extractDraft(text, ctx, options);
  // Dù nguồn nào trả về, mã và tổng số lượng luôn bị xóa rồi mới tính lại ở server
  const draft = fillDraft(keepAiFieldsOnly(extracted, ctx.forms), ctx.forms);
  const matches = applyCatalogMatch(draft, ctx.forms, ctx.catalogs, ctx.vietTat);
  applyTotals(draft, ctx.rules);
  return { draft, matches, provider: options.provider, duration_ms: Date.now() - startedAt };
}
