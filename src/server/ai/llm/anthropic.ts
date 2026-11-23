import Anthropic from "@anthropic-ai/sdk";
import type { LlmRequest } from "./types";

/** Các model nhận tham số fallbacks; model khác đặt trong .env thì không gửi tham số này */
const SUPPORTS_FALLBACKS = /^claude-(fable-5-1|opus-5|sonnet-5-5)/;

export async function callAnthropic(request: LlmRequest): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL?.trim();
  if (!model) throw new Error("Chưa đặt ANTHROPIC_MODEL trong .env.local");

  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    system: request.system,
    messages: [{ role: "user", content: request.user }],
    output_config: {
      ...(model.includes("haiku") ? {} : { effort: "medium" as const }),
      format: { type: "json_schema", schema: request.schema },
    },
    // Bộ lọc an toàn có thể từ chối nhầm nội dung y khoa; khi đó server tự chuyển sang model dự phòng
    ...(SUPPORTS_FALLBACKS.test(model)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  });

  if (response.stop_reason === "refusal") throw new Error("Claude từ chối xử lý nội dung này");
  if (response.stop_reason === "max_tokens") throw new Error("Kết quả bị cắt do vượt max_tokens");

  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new Error("Claude không trả về nội dung");
  return text.text;
}
