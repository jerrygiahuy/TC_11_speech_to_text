"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { openAppointment } from "./api";
import { openHref } from "./open-appointment";

const BASE = "rounded-sm border px-3 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed";
const PRIMARY = `${BASE} border-emr-blue bg-emr-blue text-white hover:opacity-90 disabled:border-gray-300 disabled:bg-gray-100 disabled:text-muted`;

/**
 * Mở (hoặc dùng lại) phiếu của một lịch rồi chuyển sang eForm. Chỉ gửi mã lịch; server quyết định quyền và danh tính.
 * Đang gửi thì tắt nút (không gửi hai lần); lỗi hiện rõ và bấm lại được, không sinh mã mới ở client.
 */
export function OpenAppointmentButton({ appointmentId, label }: { appointmentId: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setPending(true);
    setError("");
    try {
      const { encounter_id } = await openAppointment(appointmentId);
      router.push(openHref(encounter_id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không mở được phiếu khám.");
      setPending(false);
    }
    // Thành công: giữ trạng thái đang mở cho tới khi trang chuyển, tránh bấm lại.
  }

  return (
    <div className="space-y-1">
      <button type="button" onClick={open} disabled={pending} className={PRIMARY}>
        {pending ? "Đang mở phiếu…" : label}
      </button>
      {error !== "" && (
        <p role="alert" className="text-[12px] text-[#a02622]">
          {error}
        </p>
      )}
    </div>
  );
}
