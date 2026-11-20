import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { Encounter } from "@/shared/clinical/types";
import { parseEncounter } from "@/shared/clinical/schema";
import { migrateEncounter } from "./migrations";

export class ClinicalError extends Error {
  constructor(message: string, public readonly status: number, public readonly legacy = false) { super(message); }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Local synthetic-data prototype boundary. This is not a replacement for HIS authentication. */
export function assertLocalDemoRequest(request: Request) {
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new ClinicalError("Hồ sơ JSON hiện chỉ dùng cho prototype chạy trên máy cục bộ.", 403);
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((origin && origin !== url.origin) || site === "cross-site") throw new ClinicalError("Nguồn yêu cầu không hợp lệ.", 403);
}

export class ClinicalRepository {
  constructor(private readonly directory = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "clinical", "encounters")) {}

  private file(id: string) {
    if (!UUID.test(id)) throw new ClinicalError("Mã hồ sơ không hợp lệ.", 400);
    return path.join(this.directory, `${id}.json`);
  }

  read(id: string): Encounter {
    const file = this.file(id);
    if (!fs.existsSync(file)) throw new ClinicalError("Không tìm thấy hồ sơ đã lưu.", 404);
    return migrateEncounter(JSON.parse(fs.readFileSync(file, "utf8")));
  }

  /** Số hồ sơ schema 1.x (bản cũ) bị bỏ qua ở lần `list()` gần nhất. */
  skippedLegacy = 0;

  /** Hồ sơ schema 1.x còn trên đĩa không dùng được cho CardioNote: bỏ qua và đếm, không làm hỏng cả danh sách. */
  list(): Encounter[] {
    this.skippedLegacy = 0;
    if (!fs.existsSync(this.directory)) return [];
    const result: Encounter[] = [];
    for (const entry of fs.readdirSync(this.directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json") || !UUID.test(entry.name.slice(0, -5))) continue;
      try { result.push(this.read(entry.name.slice(0, -5))); }
      catch (error) {
        if (error instanceof ClinicalError && error.legacy) { this.skippedLegacy++; continue; }
        throw error;
      }
    }
    if (this.skippedLegacy) console.warn(`Bỏ qua ${this.skippedLegacy} hồ sơ cũ (schema 1.x) trong ${path.basename(this.directory)}.`);
    return result;
  }

  findByAppointment(facilityId: string, appointmentId: string): Encounter | null {
    const matches = this.list().filter(record => record.facility_id === facilityId && record.appointment_id === appointmentId);
    if (matches.length > 1) throw new ClinicalError("Có nhiều hồ sơ cho cùng mã khám. Cần kiểm tra dữ liệu đã lưu.", 409);
    return matches[0] ?? null;
  }

  /** Exclusive filesystem lock makes lookup + create one transaction, including across processes. */
  openByAppointment(seed: Encounter): Encounter {
    if (!seed.facility_id || !seed.appointment_id) throw new ClinicalError("Thiếu cơ sở hoặc mã khám.", 400);
    fs.mkdirSync(this.directory, { recursive: true });
    const key = createHash("sha256").update(JSON.stringify([seed.facility_id, seed.appointment_id])).digest("hex");
    const lock = path.join(this.directory, `.appointment-${key}.lock`);
    let handle: number;
    try { handle = fs.openSync(lock, "wx"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new ClinicalError("Mã khám đang được mở ở nơi khác. Hãy thử lại.", 409);
      throw error;
    }
    try {
      const current = this.findByAppointment(seed.facility_id, seed.appointment_id);
      if (current) {
        if (current.patient_id !== seed.patient_id) throw new ClinicalError("Mã khám đã gắn với bệnh nhân khác.", 409);
        return current;
      }
      return this.create(seed);
    } finally {
      fs.closeSync(handle);
      fs.unlinkSync(lock);
    }
  }

  private atomicWrite(file: string, data: Encounter) {
    fs.mkdirSync(this.directory, { recursive: true });
    const temporary = path.join(this.directory, `${randomUUID()}.tmp`);
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(temporary, "wx");
      fs.writeFileSync(descriptor, JSON.stringify(data, null, 2) + "\n", "utf8");
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor); descriptor = undefined;
      fs.renameSync(temporary, file);
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }

  create(seed: Encounter): Encounter {
    const record = parseEncounter({ ...seed, id: randomUUID(), revision: 1, audit: { ...seed.audit, approved_at: null, approved_by: null } });
    this.atomicWrite(this.file(record.id), record);
    return record;
  }

  update(id: string, expectedRevision: number, transform: (record: Encounter) => Encounter, doctorId: string, now: string, approval = false): Encounter {
    const file = this.file(id);
    const lock = `${file}.lock`;
    fs.mkdirSync(this.directory, { recursive: true });
    let handle: number;
    try { handle = fs.openSync(lock, "wx"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new ClinicalError("Hồ sơ đang được lưu ở nơi khác. Hãy thử lại.", 409);
      throw error;
    }
    try {
      const current = this.read(id);
      if (current.revision !== expectedRevision) throw new ClinicalError("Hồ sơ đã thay đổi ở tab khác. Hãy tải bản lưu trước khi tiếp tục.", 409);
      const changed = transform(structuredClone(current));
      const updated = parseEncounter({
        ...changed, id: current.id, revision: current.revision + 1,
        patient_id: current.patient_id, appointment_id: current.appointment_id,
        facility_id: current.facility_id, department_id: current.department_id,
        examiner_id: current.examiner_id, primary_doctor_id: current.primary_doctor_id,
        delegated_doctor_id: current.delegated_doctor_id,
        audit: { ...current.audit, updated_at: now, updated_by: doctorId, approved_at: approval ? now : null, approved_by: approval ? doctorId : null },
      });
      const history = path.join(this.directory, "revisions");
      fs.mkdirSync(history, { recursive: true });
      const previous = path.join(history, `${id}-r${current.revision}.json`);
      if (!fs.existsSync(previous)) fs.writeFileSync(previous, JSON.stringify(current, null, 2) + "\n", { flag: "wx" });
      this.atomicWrite(file, updated);
      return updated;
    } finally {
      fs.closeSync(handle);
      fs.unlinkSync(lock);
    }
  }
}
