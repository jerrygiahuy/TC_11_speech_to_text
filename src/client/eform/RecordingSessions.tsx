"use client";

import { BTN_OUTLINE } from "@/client/eform/fields";
import type { RecordingSession } from "@/shared/clinical/types";

const PHIEN: Record<RecordingSession["state"], string> = { opening: "Đang mở", recording: "Đang ghi âm", finalizing: "Đang chốt", stopped: "Đã dừng", interrupted: "Bị gián đoạn" };
const NOI_DUNG: Record<RecordingSession["content_state"], string> = { empty: "Chưa có nội dung", awaiting_review: "Chưa kiểm tra", reviewed: "Đã kiểm tra", discarded: "Đã bỏ" };

function gio(value: string | null): string {
  if (!value) return "…";
  return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Mỗi lần ghi âm là một phiên riêng, không nối đồng hồ qua khoảng chờ. Không có nút nghe lại: âm thanh không được lưu. */
export function RecordingSessions({ sessions, busy, onDiscard }: { sessions: RecordingSession[]; busy: boolean; onDiscard: (session: RecordingSession) => void }) {
  if (sessions.length === 0) return <p className="text-xs text-ef-phu">Chưa có phiên ghi âm nào trong lượt khám này.</p>;
  return (
    <details open className="rounded-lg border border-ef-vien bg-white px-4 py-3 text-[13px]">
      <summary className="cursor-pointer font-semibold text-ef-dam">Các phiên ghi âm ({sessions.length})</summary>
      <ol className="mt-2 space-y-2">
        {[...sessions].sort((a, b) => a.sequence - b.sequence).map((session) => {
          const reviewed = session.reviewed_transcripts.at(-1);
          return (
            <li key={session.id} className="rounded border border-ef-vien/70 px-3 py-2">
              <p className="font-medium">Phiên {session.sequence} · {PHIEN[session.state]} · {NOI_DUNG[session.content_state]}</p>
              <p className="text-xs text-ef-phu">{gio(session.started_at)} → {gio(session.ended_at)}{session.stop_reason ? ` · ${session.stop_reason}` : ""}</p>
              {reviewed && <p className="text-xs text-ef-phu">Bản chép lời đã kiểm tra: bản {reviewed.transcript_revision}, lúc {gio(reviewed.reviewed_at)}, mã {reviewed.digest.slice(0, 8)}</p>}
              {session.discarded_at && <p className="text-xs text-ef-phu">Đã bỏ lúc {gio(session.discarded_at)}; bản đã kiểm tra trước đó vẫn được giữ.</p>}
              {session.content_state === "awaiting_review" && session.state !== "recording" && session.state !== "opening" && (
                <button type="button" className={`${BTN_OUTLINE} mt-1`} disabled={busy} onClick={() => { if (window.confirm("Bỏ phần nội dung chưa kiểm tra của phiên này? Bản đã kiểm tra trước đó vẫn được giữ.")) onDiscard(session); }}>Bỏ phần chưa duyệt</button>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
