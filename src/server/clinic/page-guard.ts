import "server-only";
import { assertLocalDemoRequest } from "./guard";

/**
 * Guard local cho page server (không đi qua route handler): dựng Request tối thiểu mang header
 * Host/Origin/Sec-Fetch-Site rồi dùng lại đúng guard của API. Thiếu Host hoặc Host không phải máy local
 * thì ném ClinicHttpError 403.
 */
export function assertLocalDemoPage(h: Headers, path: string): void {
  const headers = new Headers();
  for (const name of ["host", "origin", "sec-fetch-site"]) {
    const v = h.get(name);
    if (v !== null) headers.set(name, v);
  }
  assertLocalDemoRequest(new Request(`http://localhost${path}`, { headers }));
}
