import "server-only";
import type { Encounter } from "@/shared/clinical/types";

// Cổng giữa phần đọc lịch khám/bệnh nhân (ưu tiên 2) và lớp clinical (ưu tiên 1).
// Bản chạy thật dùng `clinical-source.ts` và actor của lớp clinical; test dùng nguồn fixture.

/** Tác nhân đang xem, quy đổi từ `ClinicalActor`. Luôn lấy phía server, không bao giờ từ client. */
export interface ClinicActor {
  doctor_id: string;
  facility_id: string;
}

/** Phần tối thiểu của một Encounter (phiếu khám đã lưu) mà màn đọc cần. */
export interface EncounterRef {
  id: string;
  /** Mã lượt khám ngoài hệ thống; null với phiếu cũ không gắn lịch. */
  appointment_id: string | null;
  patient_id: string;
  facility_id: string;
  doctor_id: string;
  encounter_at: string;
  /** Chuỗi trạng thái gốc của Encounter (`dang_kham`, `cho_kq_cls`, ...), map bằng `displayStatus`. */
  status: string;
  /** Tóm tắt đã có sẵn; null nếu chưa có (màn đọc không tự bịa). */
  summary: string | null;
}

/** Nguồn Encounter chỉ đọc. Mọi kết quả phải thuộc đúng `facilityId`. */
export interface EncounterSource {
  listByFacility(facilityId: string): EncounterRef[];
  /** Phiếu đầy đủ để xem lại; null nếu không có hoặc ngoài cơ sở. Nguồn fixture không có phiếu đầy đủ. */
  read?(facilityId: string, encounterId: string): Encounter | null;
}

/** Phần định danh của một ngữ cảnh khám (không kèm dữ liệu phiếu). Ngữ cảnh là nguồn chủ sở hữu bệnh nhân/bác sĩ/cơ sở. */
export interface ContextMeta {
  appointment_id: string;
  patient_id: string;
  facility_id: string;
  doctor_id: string;
}

export interface ContextLookup {
  /** null nếu cơ sở này không có ngữ cảnh cho mã lịch. */
  find(actor: ClinicActor, appointmentId: string): ContextMeta | null;
}
