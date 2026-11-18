"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Hộp thoại modal dùng `<dialog>` gốc: trình duyệt lo focus trap, Escape và `aria-modal`.
 * Thêm ở đây: khôi phục focus về phần tử đã mở, khóa cuộn nền, cuộn nội dung riêng, và chỉ đóng khi bấm đúng vào nền.
 * Gần toàn màn hình ở màn hẹp.
 */
export function ClinicDialog({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      // Escape: để cha quyết định đóng (open=false), tránh dialog tự đóng lệch state.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Nền (::backdrop) trả target là chính <dialog>; vùng nội dung nằm trong div con nên không bị tính nhầm.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto h-dvh max-h-dvh w-full max-w-none border-0 bg-white p-0 text-ink backdrop:bg-black/40 open:flex open:flex-col sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-lg"
    >
      {open && (
        <>
          <div className="flex items-center justify-between gap-2 border-b border-gray-300 px-4 py-3">
            <h2 id={titleId} className="min-w-0 text-lg font-bold text-emr-navy">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-sm border border-gray-300 bg-white px-3 py-1 text-[13px] text-ink hover:bg-soft"
            >
              Đóng
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
        </>
      )}
    </dialog>
  );
}
