import "server-only";

// Cổng giữa phần đọc lịch khám/bệnh nhân (ưu tiên 2) và lớp clinical (ưu tiên 1).
// Nhánh này CHƯA có lớp clinical nên chỉ có adapter demo; khi gộp, thay adapter bằng cái đọc Encounter thật.

/**
 * Tác nhân đang xem. ADAPTER DEMO, tạm thời: thay bằng `ClinicalActor` của ưu tiên 1.
 * Luôn lấy phía server (xem `demo-actor.ts`), không bao giờ lấy từ client.
 */
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
}
