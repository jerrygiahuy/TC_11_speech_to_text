// Sinh schema từ config/forms/*.json. Chỉ các trường ai_fill: true mới có mặt,
// nên LLM không có chỗ để trả về mã dịch vụ/thuốc.
import { z } from "zod";
import type { Draft, FieldDef, FormConfig, Values } from "@/shared/types";

function aiFields(form: FormConfig): FieldDef[] {
  return form.fields.filter((field) => field.ai_fill);
}

function fieldZod(field: FieldDef): z.ZodType {
  if (field.type === "number") return z.number().nullable();
  if (field.type === "select" && field.options?.length) {
    return z.enum(field.options as [string, ...string[]]).nullable();
  }
  return z.string().nullable();
}

function formZod(form: FormConfig): z.ZodType {
  const shape: Record<string, z.ZodType> = {};
  for (const field of aiFields(form)) shape[field.id] = fieldZod(field);
  const object = z.object(shape);
  return form.mode === "rows" ? z.array(object) : object;
}

export function buildDraftZod(forms: FormConfig[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const form of forms) shape[form.id] = formZod(form);
  return z.object(shape);
}

function fieldJsonSchema(field: FieldDef): Record<string, unknown> {
  const description = [field.label, field.hint].filter(Boolean).join(". ");
  const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }], description });
  if (field.type === "number") return nullable({ type: "number" });
  if (field.type === "select" && field.options?.length) {
    return nullable({ type: "string", enum: field.options });
  }
  return nullable({ type: "string" });
}

function objectJsonSchema(form: FormConfig): Record<string, unknown> {
  const fields = aiFields(form);
  return {
    type: "object",
    additionalProperties: false,
    required: fields.map((field) => field.id),
    properties: Object.fromEntries(fields.map((field) => [field.id, fieldJsonSchema(field)])),
  };
}

/** JSON schema cho structured output, dùng chung cho Anthropic, OpenAI và Gemini */
export function buildJsonSchema(forms: FormConfig[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: forms.map((form) => form.id),
    properties: Object.fromEntries(
      forms.map((form) => [
        form.id,
        form.mode === "rows"
          ? { type: "array", items: objectJsonSchema(form) }
          : objectJsonSchema(form),
      ]),
    ),
  };
}

function fillRow(row: Values | undefined, form: FormConfig): Values {
  const filled: Values = {};
  for (const field of form.fields) filled[field.id] = row?.[field.id] ?? null;
  return filled;
}

/** Bổ sung đủ khóa cho mọi trường, giá trị thiếu là null */
export function fillDraft(draft: Partial<Draft>, forms: FormConfig[]): Draft {
  const filled: Draft = {};
  for (const form of forms) {
    const value = draft[form.id];
    filled[form.id] =
      form.mode === "rows"
        ? ((value as Values[] | undefined) ?? []).map((row) => fillRow(row, form))
        : fillRow(value as Values | undefined, form);
  }
  return filled;
}

/** Xóa các trường AI không được phép điền (mã, tổng số lượng) */
export function keepAiFieldsOnly(draft: Partial<Draft>, forms: FormConfig[]): Draft {
  const pickRow = (row: Values, form: FormConfig): Values =>
    Object.fromEntries(aiFields(form).map((field) => [field.id, row?.[field.id] ?? null]));
  const result: Draft = {};
  for (const form of forms) {
    const value = draft[form.id];
    result[form.id] =
      form.mode === "rows"
        ? ((value as Values[] | undefined) ?? []).map((row) => pickRow(row, form))
        : pickRow((value as Values | undefined) ?? {}, form);
  }
  return result;
}
