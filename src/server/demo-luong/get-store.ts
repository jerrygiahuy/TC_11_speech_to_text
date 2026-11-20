import "server-only";
import os from "node:os";
import path from "node:path";
import { demoStore, type DemoStore } from "./store";

/** Kho demo dùng chung cho mọi route. `DEMO_LUONG_DIR` (đường dẫn thư mục) chỉ để test, và chỉ có hiệu lực khi NODE_ENV=test hoặc đường dẫn nằm dưới thư mục tạm của hệ điều hành. */
export function getDemoStore(): DemoStore {
  const dir = process.env.DEMO_LUONG_DIR ? path.resolve(process.env.DEMO_LUONG_DIR) : "";
  const tmp = path.resolve(os.tmpdir());
  const allowed = process.env.NODE_ENV === "test" || dir.startsWith(tmp + path.sep);
  return dir && allowed ? demoStore(dir) : demoStore();
}
