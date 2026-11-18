import "server-only";
import { ClinicHttpError } from "./errors";

// Guard tối thiểu cho prototype chạy local. Sẽ thay bằng `assertLocalDemoRequest` của lớp clinical (ưu tiên 1)
// khi gộp nhánh. Không phải xác thực.
//
// Phạm vi bảo vệ thật: chặn trình duyệt gọi chéo origin và DNS rebinding (Host/Origin/Sec-Fetch-Site do
// trình duyệt đặt, trang web không tự sửa được). KHÔNG chặn client không phải trình duyệt (curl, script)
// vì họ tự đặt được header Host. Không dùng `request.url`: Next dựng nó từ hostname cấu hình của server,
// không phải từ header Host. Muốn không cho máy khác trong LAN vào hãy chạy `next dev -H 127.0.0.1`.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseHost(hostWithPort: string): URL | null {
  try {
    return new URL(`http://${hostWithPort}`);
  } catch {
    return null;
  }
}

function deny(): never {
  throw new ClinicHttpError(403, "Chỉ cho phép truy cập từ máy đang chạy ứng dụng.");
}

export function assertLocalDemoRequest(request: Request): void {
  const rawHost = request.headers.get("host");
  if (rawHost === null) return deny();
  const host = parseHost(rawHost);
  if (host === null || !LOCAL_HOSTS.has(host.hostname.toLowerCase())) deny();

  const origin = request.headers.get("origin");
  if (origin !== null) {
    let o: URL;
    try {
      o = new URL(origin);
    } catch {
      return deny();
    }
    if (!LOCAL_HOSTS.has(o.hostname.toLowerCase()) || o.host.toLowerCase() !== host.host.toLowerCase()) deny();
  }

  if (request.headers.get("sec-fetch-site") === "cross-site") deny();
}
