import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const THONG_BAO_TMH = "Hồ sơ TMH cũ (schema 1.x) không dùng được cho CardioNote.";

test("hồ sơ 2.0.0 đi qua migrateEncounter không đổi", async () => {
  const { migrateEncounter } = await import("./migrations");
  const record = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter.example.json", "utf8"));
  const before = structuredClone(record);
  const result = migrateEncounter(record);
  assert.equal(result.schema_version, "2.0.0");
  assert.deepEqual(result, record);
  assert.deepEqual(record, before, "migration is pure");
});

test("hồ sơ TMH 1.1.0 và 1.2.0 bị từ chối với đúng thông báo", async () => {
  const { migrateEncounter } = await import("./migrations");
  const record = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter.example.json", "utf8"));
  for (const version of ["1.0.0", "1.1.0", "1.2.0", "1.9.9"]) {
    assert.throws(() => migrateEncounter({ ...record, schema_version: version }), { message: THONG_BAO_TMH });
  }
});

test("unsupported or malformed records are rejected rather than silently migrated", async () => {
  const { migrateEncounter } = await import("./migrations");
  assert.throws(() => migrateEncounter({ schema_version: "0.9.0" }), { message: "Phiên bản hồ sơ không được hỗ trợ." });
  assert.throws(() => migrateEncounter({ schema_version: "2.0.0", audit: {} }));
  assert.throws(() => migrateEncounter(null), { message: "Hồ sơ không hợp lệ." });
});

test("repository từ chối hồ sơ TMH 1.2.0 trên đĩa và không ghi đè file", async () => {
  const { ClinicalRepository } = await import("./repository");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "clinical-migration-"));
  const id = "d55423b5-1782-4e2f-98fc-3474aec69ace";
  const record = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter.example.json", "utf8"));
  Object.assign(record, { id, schema_version: "1.2.0" });
  const serialized = JSON.stringify(record);
  const file = path.join(directory, `${id}.json`);
  fs.writeFileSync(file, serialized);
  assert.throws(() => new ClinicalRepository(directory).read(id), { message: THONG_BAO_TMH });
  assert.equal(fs.readFileSync(file, "utf8"), serialized);
});
