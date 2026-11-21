import type { ClinicalExtraction } from "../clinical/api";
import type { EformSnapshot } from "../clinical/eform";
import type { AiRoute, GateReason, GateResult, NerTrangThai, PiiAuditEntry, PiiRule, PiiSpan } from "../clinical/pii";

export type DemoSource = { kind: "kich_ban"; id: string; phien?: number } | { kind: "audio" };

export interface KichBan {
  id: string;
  ten: string;
  benh_nhan_id: string;
  mode: "conversation" | "dictation";
  dong_y_override?: boolean;
  doan: { phien?: number; vai_tro: "bac_si" | "benh_nhan" | "nguoi_nha"; text: string }[];
  /** `bi_chan`: còn bị chặn sau khi tự che. `tu_che`: mã lý do R11 của phần còn sót được tự che (thiếu = không có). */
  expected: { phai_che: string[]; phai_giu: string[]; bi_chan: boolean; tu_che?: GateReason[] };
}

/** Dòng danh sách kịch bản cho màn hình: `phien` là các phần có trong kịch bản (rỗng = chỉ chạy cả kịch bản). */
export type KichBanTomTat = Pick<KichBan, "id" | "ten" | "benh_nhan_id"> & { phien: number[] };

export type DemoStep = "stt" | "ban_tho" | "che" | "ai" | "luu";

export interface DemoFieldSource { nguon: "ai" | "bac_si"; phien: number | null; xung_dot?: { phien: number; gia_tri_ai: string } }

export interface DemoPhieu {
  encounter_id: string;
  appointment_id: string;
  revision: number;
  status: string;
  duyet: { luc: string; boi: string } | null;
  /** `auto_masked`: chỉ mã lý do (không có đoạn chữ), vì phiên được ghi đĩa. */
  sessions: { sequence: number; at: string; counts: Record<PiiRule, number>; clean: string; auto_masked?: GateReason[] }[];
  snapshot: EformSnapshot;
  sources: Record<string, DemoFieldSource>;
}

/** Sự kiện lỗi chung của mọi bước. Lỗi `ai`/`luu` từ bộ điều phối mang thêm ngữ cảnh (đều tùy chọn). */
export interface DemoErrorEvent {
  buoc: DemoStep; trang_thai: "loi"; ms: number;
  du_lieu: { loi: string; provider?: string; model?: string; prompt_version?: string; payload_preview?: string; phieu?: DemoPhieu; file?: string; sha256?: string; audit?: PiiAuditEntry };
}

export type DemoEvent =
  | { buoc: "stt"; trang_thai: "xong"; ms: number; du_lieu: { engine: string; text: string; audio_ms: number | null } }
  | { buoc: "ban_tho"; trang_thai: "xong"; ms: number; du_lieu: { raw: string; spans: PiiSpan[]; mode: "conversation" | "dictation" } }
  /** `auto_masked`: phần chốt chặn R11 thấy còn sót và đã tự che (đoạn chữ chỉ trong stream). `gate`: chốt chặn chạy lại sau khi tự che. */
  | { buoc: "che"; trang_thai: "xong" | "bi_chan"; ms: number; du_lieu: { clean: string; counts: Record<PiiRule, number>; auto_masked: GateResult["reasons"]; gate: GateResult; ai_route: AiRoute; dong_y: { trang_thai: boolean; luc: string | null }; ner: { trang_thai: NerTrangThai; so_doan: number } } }
  | { buoc: "ai"; trang_thai: "xong"; ms: number; du_lieu: { provider: string; model: string; prompt_version: string; payload_preview: string; extraction: ClinicalExtraction } }
  | { buoc: "luu"; trang_thai: "xong" | "loi"; ms: number; du_lieu: { phieu: DemoPhieu; file: string; sha256: string; audit: PiiAuditEntry } }
  | DemoErrorEvent;

export function isDemoError(event: DemoEvent): event is DemoErrorEvent { return event.trang_thai === "loi"; }
