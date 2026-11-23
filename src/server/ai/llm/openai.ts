import OpenAI from "openai";
import type { LlmRequest } from "./types";

export async function callOpenAI(request: LlmRequest): Promise<string> {
  const model = process.env.OPENAI_MODEL?.trim();
  if (!model) throw new Error("Chưa đặt OPENAI_MODEL trong .env.local");

  const client = new OpenAI({ timeout: 90_000, maxRetries: 1 });
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "ban_nhap_benh_an", strict: true, schema: request.schema },
    },
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) throw new Error("OpenAI từ chối xử lý nội dung này");
  if (!message?.content) throw new Error("OpenAI không trả về nội dung");
  return message.content;
}
