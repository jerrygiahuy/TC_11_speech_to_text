import "server-only";
import { ClinicHttpError } from "./errors";
import { assertLocalDemoRequest } from "./guard";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Bọc một handler GET: guard local, JSON no-store, lỗi 400/403/404 giữ mã, còn lại 500 không lộ chi tiết. */
export async function handleClinicRequest<T>(
  request: Request,
  fn: () => T | Promise<T>,
): Promise<Response> {
  try {
    assertLocalDemoRequest(request);
    return Response.json(await fn(), { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ClinicHttpError) {
      return Response.json({ error: error.message }, { status: error.status, headers: NO_STORE });
    }
    console.error("Lỗi API lịch khám:", error);
    return Response.json(
      { error: "Không đọc được dữ liệu lịch khám." },
      { status: 500, headers: NO_STORE },
    );
  }
}
