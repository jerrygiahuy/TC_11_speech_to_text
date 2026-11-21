import type { GiaoDienMic } from "./MicButton";

/** Biểu tượng micro, nét đầy */
export function MicIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="12" rx="3" fill="currentColor" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3.5" />
    </svg>
  );
}

function StopIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Kiểu nút mặc định: nút đặc màu tím của Trợ lý, chuyển đỏ khi đang nghe */
export const GIAO_DIEN_MIC: GiaoDienMic = {
  nut: "w-full rounded-xl px-4 py-2.5 text-white shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait",
  dangNghe: "bg-ef-do hover:brightness-110 focus-visible:outline-ef-do",
  cho: "bg-tim hover:bg-tim/90 focus-visible:outline-tim disabled:bg-tim/80",
};

export type PhaMic = "idle" | "opening" | "recording" | "processing";

/** Nội dung nút: biểu tượng trong vòng tròn bên trái, hai dòng chữ bên phải */
export function NoiDungMic({ pha, clock }: { pha: PhaMic; clock: string }) {
  const { bieuTuong, chinh, phu } = {
    idle: { bieuTuong: <MicIcon />, chinh: "Bấm để nói", phu: "Chữ hiện dần trong ô bên dưới" },
    opening: { bieuTuong: <Spinner />, chinh: "Đang mở micro…", phu: "Chờ trình duyệt cấp quyền micro" },
    recording: {
      bieuTuong: (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
          <StopIcon />
        </>
      ),
      chinh: `Đang nghe · ${clock}`,
      phu: "Bấm để dừng",
    },
    processing: { bieuTuong: <Spinner />, chinh: "Đang chốt câu cuối…", phu: "Khử nhiễu và nhận dạng phần còn lại" },
  }[pha];
  return (
    <span className="flex items-center gap-3">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/40">{bieuTuong}</span>
      <span className="text-left leading-tight">
        <span className="block text-[15px] font-semibold tabular-nums">{chinh}</span>
        <span className="block text-xs text-white/80">{phu}</span>
      </span>
    </span>
  );
}
