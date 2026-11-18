// Chế độ dự phòng khi demo: không cần internet hay API key.
import { isSameText, ruleExtract } from "./rules";
import type { CaseData, Catalogs, Draft, FormConfig, VietTat } from "@/shared/types";

export interface MockContext {
  forms: FormConfig[];
  catalogs: Catalogs;
  vietTat: VietTat;
  cases: CaseData[];
}

/** Câu trùng ca mẫu thì trả kết quả soạn sẵn, còn lại tách bằng quy tắc */
export function mockExtract(text: string, ctx: MockContext, ruleOnly = false): Partial<Draft> {
  const found = ruleOnly
    ? undefined
    : ctx.cases.find((c) => isSameText(c.input_noi, text) || isSameText(c.input_go_tat, text));
  if (found) return found.expected;
  return ruleExtract(text, ctx.forms, ctx.catalogs, ctx.vietTat);
}
