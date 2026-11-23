export interface LlmRequest {
  system: string;
  user: string;
  schema: Record<string, unknown>;
}

/** Gọi LLM và trả về chuỗi JSON */
export type LlmCall = (request: LlmRequest) => Promise<string>;
