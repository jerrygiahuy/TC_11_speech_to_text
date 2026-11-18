// Chọn nhà cung cấp theo biến LLM_PROVIDER; kiểm tra schema và thử lại 1 lần khi sai.
import "server-only";
import { callAnthropic } from "./anthropic";
import { callGemini } from "./gemini";
import { mockExtract, type MockContext } from "./mock";
import { callOpenAI } from "./openai";
import type { LlmCall } from "./types";
import { buildSystemPrompt, buildUserPrompt } from "../prompt";
import { buildDraftZod, buildJsonSchema } from "../schema";
import { dienChoTrongNhap } from "@/shared/eform/phieu-mau";
import type { Draft } from "@/shared/types";

const MAX_ATTEMPTS = 2;

const PROVIDERS: Record<string, LlmCall> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  gemini: callGemini,
};

export interface ExtractOptions {
  provider: string;
  /** Bỏ qua kết quả soạn sẵn của mock, chỉ chạy bộ tách bằng quy tắc */
  ruleOnly?: boolean;
  /** Phiếu mẫu bác sĩ gọi (data/eform/phieu-mau.json › nhap): text là phần chi tiết nói thêm sau tên mẫu */
  mau?: Draft;
}

function parseDraft(json: string, ctx: MockContext): { draft: Draft } | { error: string } {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { error: "không phải JSON hợp lệ" };
  }
  const result = buildDraftZod(ctx.forms).safeParse(value);
  if (result.success) return { draft: result.data as Draft };
  return { error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

export async function extractDraft(
  text: string,
  ctx: MockContext,
  options: ExtractOptions,
): Promise<Partial<Draft>> {
  if (options.provider === "mock") {
    return options.mau ? dienChoTrongNhap(options.mau, text, ctx.vietTat) : mockExtract(text, ctx, options.ruleOnly);
  }

  const call = PROVIDERS[options.provider];
  if (!call) throw new Error(`LLM_PROVIDER không hợp lệ: ${options.provider}`);

  const system = buildSystemPrompt(ctx.forms, ctx.vietTat);
  const schema = buildJsonSchema(ctx.forms);
  let previousError: string | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const parsed = parseDraft(await call({ system, user: buildUserPrompt(text, previousError, options.mau), schema }), ctx);
    // Có mẫu: chỗ trống LLM còn để nguyên ngoặc (model nhẹ hay bỏ sót "tai T") thì điền tiếp bằng quy tắc
    if ("draft" in parsed) return options.mau ? dienChoTrongNhap(parsed.draft, text, ctx.vietTat) : parsed.draft;
    previousError = parsed.error;
  }
  throw new Error(`Kết quả không đúng schema sau ${MAX_ATTEMPTS} lần thử: ${previousError}`);
}
