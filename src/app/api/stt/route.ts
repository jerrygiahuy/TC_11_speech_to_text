import { proxyStt } from "@/lib/stt/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyStt(request);
}

export async function POST(request: Request) {
  return proxyStt(request);
}
