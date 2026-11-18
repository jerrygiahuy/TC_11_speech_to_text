import { FinishReason, GoogleGenAI } from "@google/genai";
import type { LlmRequest } from "./types";

export async function callGemini(request: LlmRequest): Promise<string> {
  const model = process.env.GEMINI_MODEL?.trim();
  if (!model) throw new Error("Chưa đặt GEMINI_MODEL trong .env.local");
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Chưa đặt GEMINI_API_KEY trong .env.local");

  const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: 90_000 } });
  const response = await client.models.generateContent({
    model,
    contents: request.user,
    config: {
      systemInstruction: request.system,
      responseMimeType: "application/json",
      responseJsonSchema: request.schema,
    },
  });

  if (response.promptFeedback?.blockReason) {
    throw new Error(`Gemini chặn yêu cầu này (${response.promptFeedback.blockReason})`);
  }
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === FinishReason.SAFETY) throw new Error("Gemini từ chối xử lý nội dung này");
  if (finishReason === FinishReason.MAX_TOKENS) throw new Error("Kết quả bị cắt do vượt giới hạn token");

  const text = response.text;
  if (!text) throw new Error("Gemini không trả về nội dung");
  return text;
}
