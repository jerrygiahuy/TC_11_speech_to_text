import type { ClinicalResponse } from "@/client/clinical-api";
import type { RecordingBinding, RecordingHandle } from "@/shared/clinical/recording";
import type { RecordingSession } from "@/shared/clinical/types";

export type TextSink = (binding: RecordingBinding, text: string) => void;

/**
 * Cầu nối giữa bộ điều phối lượt khám (EncounterWorkspace) và màn phiếu/trợ lý.
 * Mọi lần ghi lên server ở bất kỳ đâu đều phải gọi publish(kết quả) để phiên bản hồ sơ luôn mới nhất.
 */
export interface EncounterBridge {
  /** Bản hồ sơ mới nhất lúc vẽ giao diện */
  response: ClinicalResponse;
  /** Bản mới nhất ngay lúc gọi (dùng trong hàm bất đồng bộ) */
  latest(): ClinicalResponse;
  publish(next: ClinicalResponse): void;
  /** Phiếu còn thay đổi chưa lưu: chặn chuyển lượt và đóng tab */
  setDirty(value: boolean): void;
  /** Còn nội dung gõ hoặc nói chưa được máy chủ che và chưa lưu */
  setPendingText(value: boolean): void;
  beforeStart(): Promise<RecordingBinding>;
  onCaptureReady(handle: RecordingHandle, binding: RecordingBinding): void;
  onCaptureFailed(binding: RecordingBinding): void;
  stopAndSave(): Promise<void>;
  /** Chữ từ micro đi qua bộ điều phối: chỉ binding đã đăng ký lúc bắt đầu thu mới được nhận */
  routeText(binding: RecordingBinding, text: string): void;
  /** Nơi nhận chữ từ micro; gắn theo binding nên chữ của lượt khác bị bỏ */
  setTextSink(sink: TextSink | null): void;
  /** Tạo phiên nhập tay đã chốt để gắn nội dung gõ vào đúng một phiên của lượt này */
  createManualSession(): Promise<RecordingSession>;
  discardSession(session: RecordingSession): Promise<void>;
  recordingActive: boolean;
  busy: boolean;
}
