import { proxySttSession } from "@/lib/stt/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return proxySttSession(request, (await context.params).id);
}

export async function DELETE(request: Request, context: Context) {
  return proxySttSession(request, (await context.params).id);
}
