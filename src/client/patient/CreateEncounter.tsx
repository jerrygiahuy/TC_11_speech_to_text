"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEncounter } from "@/client/clinic/api";
import { openHref } from "@/client/clinic/open-appointment";

/** Nút "Tạo mới phiếu khám": tạo một phiếu khám ngoại trú mới cho bệnh nhân này rồi mở ở eForm. Luôn dùng được, không cần lịch hẹn. */
export function CreateEncounter({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const { encounter_id } = await createEncounter(patientId);
      router.push(openHref(encounter_id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tạo được phiếu khám.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => void create()}
        className="rounded bg-emr-blue px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Đang tạo phiếu…" : "Tạo mới phiếu khám"}
      </button>
      {error !== "" && (
        <p role="alert" className="text-xs text-[#a02622]">
          {error}
        </p>
      )}
    </div>
  );
}
