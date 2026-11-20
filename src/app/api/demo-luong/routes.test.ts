import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { isDemoError, type DemoEvent, type DemoPhieu } from "@/shared/demo-luong/types";
import { streamDemoFlow } from "@/client/demo-luong/api";
import { getDemoStore } from "@/server/demo-luong/get-store";
import { POST as runFlow } from "./route";
import { GET as listScripts } from "./kich-ban/route";
import { POST as createPhieu, DELETE as resetPhieu } from "./phieu/route";
import { GET as readPhieu, PATCH as patchPhieu } from "./phieu/[id]/route";
import { POST as approvePhieu } from "./phieu/[id]/duyet/route";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "demo-luong-routes-"));
process.env.DEMO_LUONG_DIR = root;
const BASE = "http://localhost:3000";
const json = (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(BASE + url, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const create = async (patient = "GIA-000123") => (await (await createPhieu(json("POST", "/api/demo-luong/phieu", { benh_nhan_id: patient }))).json()) as DemoPhieu;
async function lines(response: Response): Promise<DemoEvent[]> {
  return (await response.text()).split("\n").filter(Boolean).map(l => JSON.parse(l) as DemoEvent);
}

let stt: http.Server;
let sttBody: { transcript: string; audio_ms: number } | null = null;
before(async () => {
  stt = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      if (!sttBody) { res.writeHead(500, { "content-type": "application/json" }); res.end("{\"detail\":\"STT_FAIL\"}"); return; }
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(sttBody));
    });
  });
  await new Promise<void>(r => stt.listen(0, "127.0.0.1", r));
  process.env.STT_BACKEND_URL = `http://127.0.0.1:${(stt.address() as { port: number }).port}`;
});
after(async () => { await new Promise(r => stt.close(r)); fs.rmSync(root, { recursive: true, force: true }); });

test("POST ca chuẩn: NDJSON đủ 5 sự kiện, header đúng", async () => {
  const p = await create();
  const res = await runFlow(json("POST", `/api/demo-luong?phieu=${p.encounter_id}&kich_ban=ca-chuan&phien=1`));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /application\/x-ndjson/);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const events = await lines(res);
  assert.deepEqual(events.map(e => e.buoc), ["stt", "ban_tho", "che", "ai", "luu"]);
  const after = (await (await readPhieu(json("GET", `/api/demo-luong/phieu/${p.encounter_id}`), ctx(p.encounter_id))).json()) as DemoPhieu;
  assert.equal(after.sessions.length, 1);
  assert.ok(after.revision > p.revision);
});

test("không phải local: 403 (mọi route)", async () => {
  const remote = (m: string, u: string) => new Request("http://example.com" + u, { method: m });
  assert.equal((await runFlow(remote("POST", "/api/demo-luong?phieu=x&kich_ban=ca-chuan"))).status, 403);
  assert.equal((await listScripts(remote("GET", "/api/demo-luong/kich-ban"))).status, 403);
  assert.equal((await createPhieu(remote("POST", "/api/demo-luong/phieu"))).status, 403);
  assert.equal((await resetPhieu(remote("DELETE", "/api/demo-luong/phieu"))).status, 403);
  assert.equal((await readPhieu(remote("GET", "/x"), ctx("x"))).status, 403);
  assert.equal((await approvePhieu(remote("POST", "/x"), ctx("x"))).status, 403);
  const cross = new Request(BASE + "/api/demo-luong/kich-ban", { headers: { origin: "http://evil.test" } });
  assert.equal((await listScripts(cross)).status, 403);
});

test("kich_ban sai, phiếu sai, phiên sai: lỗi JSON trước khi mở stream", async () => {
  const p = await create();
  const bad = await runFlow(json("POST", `/api/demo-luong?phieu=${p.encounter_id}&kich_ban=..%2Fx`));
  assert.equal(bad.status, 404);
  assert.match(bad.headers.get("content-type") ?? "", /application\/json/);
  assert.ok(typeof ((await bad.json()) as { error: string }).error === "string");
  assert.equal((await runFlow(json("POST", "/api/demo-luong?phieu=khong-phai-uuid&kich_ban=ca-chuan"))).status, 400);
  assert.equal((await runFlow(json("POST", `/api/demo-luong?phieu=${p.encounter_id}&kich_ban=ca-chuan&phien=9`))).status, 400);
  assert.equal((await runFlow(json("POST", `/api/demo-luong?phieu=${p.encounter_id}`))).status, 400);
  const other = await runFlow(json("POST", `/api/demo-luong?phieu=${p.encounter_id}&kich_ban=ca-tu-che`));
  assert.equal(other.status, 409);
});

test("ca tự che: stream đủ 5 bước, bước che có auto_masked", async () => {
  const p = await create("GIA-000789");
  const events = await lines(await runFlow(json("POST", `/api/demo-luong?phieu=${p.encounter_id}&kich_ban=ca-tu-che`)));
  assert.deepEqual(events.map(e => e.buoc), ["stt", "ban_tho", "che", "ai", "luu"]);
  assert.equal(events[2].trang_thai, "xong");
  assert.deepEqual((events[2].du_lieu as { auto_masked: { reason: string }[] }).auto_masked.map(x => x.reason), ["R11c_ten_rieng_con_sot"]);
});

test("PATCH revision cũ: 409; duyệt; GET; danh sách kịch bản; xóa dữ liệu", async () => {
  const p = await create();
  const fields = { ly_do: "đau tai trái hai ngày" };
  const first = await patchPhieu(json("PATCH", `/api/demo-luong/phieu/${p.encounter_id}`, { expected_revision: p.revision, fields }), ctx(p.encounter_id));
  assert.equal(first.status, 200);
  const edited = (await first.json()) as DemoPhieu;
  const stale = await patchPhieu(json("PATCH", `/api/demo-luong/phieu/${p.encounter_id}`, { expected_revision: p.revision, fields }), ctx(p.encounter_id));
  assert.equal(stale.status, 409);
  const approved = await approvePhieu(json("POST", `/api/demo-luong/phieu/${p.encounter_id}/duyet`, { expected_revision: edited.revision }), ctx(p.encounter_id));
  assert.equal(approved.status, 200);
  assert.ok(((await approved.json()) as DemoPhieu).duyet);
  assert.equal((await patchPhieu(json("PATCH", "/x", { expected_revision: 1 }), ctx(p.encounter_id))).status, 400);
  assert.equal((await readPhieu(json("GET", "/x"), ctx("khong-hop-le"))).status, 400);
  const list = (await (await listScripts(json("GET", "/api/demo-luong/kich-ban"))).json()) as { id: string }[];
  assert.ok(list.some(k => k.id === "ca-chuan"));
  const del = await resetPhieu(json("DELETE", "/api/demo-luong/phieu"));
  assert.equal(del.status, 204);
  assert.equal((await readPhieu(json("GET", "/x"), ctx(p.encounter_id))).status >= 400, true);
  assert.ok(list.length > 0 && fs.existsSync(path.join(process.cwd(), "data", "demo-luong", "kich-ban", "ca-chuan.json")));
});

test("audio: STT trả chữ thì chạy đủ luồng; STT lỗi thì một dòng stt/loi; > 20 MB thì 413", async () => {
  const p = await create();
  const wav = (n = 64) => new Uint8Array(n);
  const audioReq = (id: string, body: Uint8Array) => new Request(`${BASE}/api/demo-luong?phieu=${id}`, { method: "POST", headers: { "content-type": "audio/wav" }, body: Buffer.from(body) });
  sttBody = { transcript: "bệnh nhân đau tai phải ba ngày", audio_ms: 1500 };
  const ok = await lines(await runFlow(audioReq(p.encounter_id, wav())));
  assert.equal(ok[0].buoc, "stt");
  assert.equal(ok[0].trang_thai, "xong");
  assert.equal((ok[0] as Extract<DemoEvent, { buoc: "stt"; trang_thai: "xong" }>).du_lieu.audio_ms, 1500);
  assert.equal(ok.at(-1)?.buoc, "luu");

  sttBody = null;
  const p2 = await create();
  const failed = await lines(await runFlow(audioReq(p2.encounter_id, wav())));
  assert.equal(failed.length, 1);
  assert.equal(failed[0].buoc, "stt");
  assert.equal(failed[0].trang_thai, "loi");
  assert.ok(isDemoError(failed[0]));
  assert.ok(!JSON.stringify(failed[0]).includes("STT_FAIL"));

  const big = await runFlow(audioReq(p2.encounter_id, new Uint8Array(20 * 1024 * 1024 + 1)));
  assert.equal(big.status, 413);
});

test("hủy request giữa chừng: stream đóng, phiếu không đổi", async () => {
  const p = await create();
  const controller = new AbortController();
  const res = await runFlow(new Request(`${BASE}/api/demo-luong?phieu=${p.encounter_id}&kich_ban=ca-chuan&phien=1`, { method: "POST", signal: controller.signal }));
  const reader = res.body!.getReader();
  await reader.read();
  controller.abort();
  // Cố đọc tiếp: nếu abort không dừng bộ sinh sự kiện thì luồng sẽ chạy tới bước lưu.
  for (let i = 0; i < 10; i++) { const r = await reader.read().catch(() => ({ done: true })); if (r.done) break; }
  await reader.cancel().catch(() => undefined);
  await new Promise(r => setTimeout(r, 200));
  const now = (await (await readPhieu(json("GET", "/x"), ctx(p.encounter_id))).json()) as DemoPhieu;
  assert.equal(now.sessions.length, 0);
  assert.equal(now.revision, p.revision);
});

test("DEMO_LUONG_DIR chỉ có hiệu lực khi NODE_ENV=test hoặc nằm dưới thư mục tạm", () => {
  const saved = { dir: process.env.DEMO_LUONG_DIR, env: process.env.NODE_ENV };
  const env = process.env as Record<string, string | undefined>;
  try {
    env.NODE_ENV = "production";
    const outside = path.join(process.cwd(), "khong-duoc-dung");
    env.DEMO_LUONG_DIR = outside;
    assert.notEqual(getDemoStore().root, path.resolve(outside));
    assert.equal(getDemoStore().root, path.join(process.cwd(), "data", "demo-luong"));
    env.DEMO_LUONG_DIR = root;
    assert.equal(getDemoStore().root, path.resolve(root));
    env.NODE_ENV = "test";
    env.DEMO_LUONG_DIR = outside;
    assert.equal(getDemoStore().root, path.resolve(outside));
  } finally { env.DEMO_LUONG_DIR = saved.dir; env.NODE_ENV = saved.env; }
});

test("audio vượt 20 MB không có Content-Length: 413 khi đang đọc", async () => {
  const p = await create();
  const chunk = new Uint8Array(1024 * 1024);
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({ pull(c) { if (sent++ >= 25) c.close(); else c.enqueue(chunk); } });
  const req = new Request(`${BASE}/api/demo-luong?phieu=${p.encounter_id}`, { method: "POST", headers: { "content-type": "audio/wav" }, body, duplex: "half" } as RequestInit);
  assert.equal(req.headers.get("content-length"), null);
  assert.equal((await runFlow(req)).status, 413);
  assert.ok(sent < 25, "phải dừng đọc sớm");
});

test("client: phản hồi ok không có body thì ném lỗi tiếng Việt", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(null, { status: 200 })) as typeof fetch;
  try {
    await assert.rejects(streamDemoFlow("x", { kichBan: "ca-chuan" }, () => {}), /không trả luồng/);
  } finally { globalThis.fetch = original; }
});
