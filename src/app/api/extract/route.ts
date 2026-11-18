import { z } from "zod";
import {
  getProviderName,
  loadCases,
  loadCatalogs,
  loadForms,
  loadRules,
  loadVietTat,
} from "@/server/du-lieu/config";
import { runPipeline } from "@/server/ai/pipeline";
import { timMauGoc } from "@/server/du-lieu/phieu-mau";

const requestSchema = z.object({ text: z.string().trim().min(1).max(10000), mau_id: z.string().max(100).optional() });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Chưa có nội dung để AI điền nháp." }, { status: 400 });
  }
  const mau = parsed.data.mau_id ? timMauGoc(parsed.data.mau_id) : undefined;
  if (parsed.data.mau_id && !mau) {
    return Response.json({ error: "Không tìm thấy mẫu này, hãy tải lại trang." }, { status: 400 });
  }
  const context = {
    forms: loadForms(),
    catalogs: loadCatalogs(),
    vietTat: loadVietTat(),
    rules: loadRules(),
    cases: loadCases(),
  };
  try {
    const result = await runPipeline(parsed.data.text, context, { provider: getProviderName(), mau: mau?.nhap });
    return Response.json(result);
  } catch (error) {
    console.error("Lỗi khi AI điền nháp:", error);
    const detail = error instanceof Error ? error.message : "Không rõ nguyên nhân";
    return Response.json(
      { error: `AI không điền được nháp: ${detail}. Có thể đặt LLM_PROVIDER=mock để demo không cần mạng.` },
      { status: 502 },
    );
  }
}
