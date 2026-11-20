import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PatientsFixtureSchema } from "@/shared/clinic/schema";
import { getDemoClinicalActor, resolveEncounterContext } from "./encounter-context";
import { knownIdentifiersForContext, patientKnownIdentifiers } from "./known-identifiers";
import { clinicalAllowlist } from "./pii-allowlist";
import { foldVietnamese } from "@/shared/clinical/pii";

const readPatients = () => PatientsFixtureSchema.parse(JSON.parse(readFileSync(path.join(process.cwd(), "data/clinic/patients.json"), "utf8")));

test("context identifiers merge encounter, patient fixture and staff without duplicates", () => {
  const context = resolveEncounterContext(getDemoClinicalActor(), "000123");
  const { known, consent } = knownIdentifiersForContext(context);
  const patient = readPatients().find(p => p.id === "GIA-000456")!;
  assert.ok(known.some(k => k.kind === "BỆNH_NHÂN" && k.value === context.data.ca.ho_ten));
  assert.ok(known.some(k => k.kind === "NGƯỜI_NHÀ" && k.value === patient.nguoi_nha![0].ho_ten));
  assert.ok(known.some(k => k.kind === "BÁC_SĨ" && k.value === context.data.ca.bac_si_kham));
  assert.ok(known.some(k => k.kind === "MÃ_ĐỊNH_DANH" && k.value === context.data.ca.ma_luot_kham));
  assert.equal(new Set(known.map(k => `${k.kind}|${k.value}`)).size, known.length);
  assert.ok(known.every(k => k.value.trim().length > 0));
  assert.equal(consent.trang_thai, false);
});

test("consent comes from the patient record when the patient agreed", () => {
  const context = resolveEncounterContext(getDemoClinicalActor(), "LK-GIA-0456");
  assert.equal(knownIdentifiersForContext(context).consent.trang_thai, true);
});

test("patient missing from fixture falls back to encounter identifiers and no consent", () => {
  assert.equal(patientKnownIdentifiers("GIA-KHONG-CO"), null);
  const context = { ...resolveEncounterContext(getDemoClinicalActor(), "000123"), patientId: "GIA-KHONG-CO" };
  const { known, consent } = knownIdentifiersForContext(context);
  assert.ok(known.some(k => k.kind === "BỆNH_NHÂN"));
  assert.deepEqual(consent, { trang_thai: false, luc: null });
});

test("clinical allowlist contains catalog drug names and clinical terms", () => {
  const allow = clinicalAllowlist();
  assert.ok(allow.has(foldVietnamese("Paracetamol")) || [...allow].some(item => item.startsWith("paracetamol")));
  assert.ok(allow.size > 10);
});
