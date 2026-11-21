import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { clinicalAllowlist } from "@/server/clinical/pii-allowlist";
import type { KichBan, KichBanTomTat } from "@/shared/demo-luong/types";
import { ClinicalError } from "@/server/clinical/repository";

const dir = () => path.join(process.cwd(), "data", "demo-luong", "kich-ban");
const ID = /^[a-z0-9-]+$/;

export function listKichBan(): KichBanTomTat[] {
  return readdirSync(dir())
    .filter((f) => f.endsWith(".json") && ID.test(f.slice(0, -5)))
    .map((f) => loadKichBan(f.slice(0, -5)))
    .map(({ id, ten, benh_nhan_id, doan }) => ({
      id, ten, benh_nhan_id,
      phien: [...new Set(doan.map((d) => d.phien).filter((n): n is number => typeof n === "number"))].sort((a, b) => a - b),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function loadKichBan(id: string): KichBan {
  if (!ID.test(id)) throw new ClinicalError("Không tìm thấy kịch bản.", 404);
  const file = path.join(dir(), `${id}.json`);
  if (!existsSync(file)) throw new ClinicalError("Không tìm thấy kịch bản.", 404);
  return JSON.parse(readFileSync(file, "utf8")) as KichBan;
}

/** Các đoạn của một phiên; không truyền `phien` thì lấy tất cả. */
export function doanForPhien(k: KichBan, phien?: number): KichBan["doan"] {
  return phien === undefined ? k.doan : k.doan.filter((d) => d.phien === phien);
}

/** Allowlist R11c cho demo: dùng chung với eForm (src/server/clinical/pii-allowlist.ts). */
export function demoAllowlist(): ReadonlySet<string> {
  return clinicalAllowlist();
}
