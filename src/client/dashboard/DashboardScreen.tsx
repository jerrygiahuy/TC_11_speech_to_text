"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDashboard } from "@/client/clinic/api";
import { AppointmentDialog } from "@/client/clinic/AppointmentDialog";
import { formatClinicDate, formatClinicTime, isCompleteClinicDate, shiftClinicDate, weekdayLabel } from "@/shared/clinic/format";
import { groupAppointments } from "@/shared/clinic/layout";
import { dashboardHref, type DashboardView } from "@/shared/clinic/links";
import { toClinicDate } from "@/shared/clinic/schedule";
import type { DashboardData } from "@/shared/clinic/types";
import { AppointmentList } from "./AppointmentList";
import { DayCalendar } from "./DayCalendar";
import { EncounterGroup, OtherEncounters } from "./EncounterGroup";
import { StatusLegend } from "./StatusLegend";

interface Props {
  initialData: DashboardData;
  initialView: DashboardView;
}

const BTN =
  "rounded-sm border border-gray-300 bg-white px-3 py-1 text-[13px] text-ink hover:bg-soft disabled:cursor-wait disabled:opacity-60";

/**
 * Trang lịch khám. Ngày nằm trong URL và trang server được gắn `key` theo ngày, nên mỗi ngày là một thể hiện riêng:
 * response làm mới của ngày A bị hủy khi rời sang ngày B và không bao giờ ghi vào ngày B.
 */
export function DashboardScreen({ initialData, initialView }: Props) {
  const router = useRouter();
  const date = initialData.date;
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<DashboardView>(initialView);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;
    setRefreshing(true);
    try {
      const next = await getDashboard(date, controller.signal);
      if (seq !== seqRef.current || next.date !== date) return;
      setData(next);
      setRefreshError(null);
    } catch (error) {
      if (controller.signal.aborted || seq !== seqRef.current) return;
      setRefreshError(error instanceof Error ? error.message : "Không làm mới được lịch khám.");
    } finally {
      if (seq === seqRef.current) setRefreshing(false);
    }
  }, [date]);

  // Quay lại tab/cửa sổ thì tải lại số liệu; rời trang thì hủy request đang bay.
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      abortRef.current?.abort();
    };
  }, [refresh]);

  function changeView(next: DashboardView) {
    setView(next);
    window.history.replaceState(null, "", dashboardHref(date, next));
  }

  function goTo(target: string) {
    router.push(dashboardHref(target, view));
  }

  const groups = groupAppointments(data.appointments);
  const { totals } = data;
  const open = (id: string) => setOpenId(id);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-8 pt-4">
      <header className="space-y-1">
        <h1 className="text-[18px] font-bold text-emr-navy">Lịch khám</h1>
        <p className="text-[14px] text-ink">
          {weekdayLabel(date)}, {formatClinicDate(date)} · Bác sĩ {data.doctor.name} · {data.facility.name}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn ngày">
        <Link href={dashboardHref(shiftClinicDate(date, -1), view)} className={BTN} aria-label="Ngày trước">
          ‹ Ngày trước
        </Link>
        <button type="button" className={BTN} onClick={() => goTo(toClinicDate(new Date().toISOString()))}>
          Hôm nay
        </button>
        <Link href={dashboardHref(shiftClinicDate(date, 1), view)} className={BTN} aria-label="Ngày sau">
          Ngày sau ›
        </Link>
        <label className="flex items-center gap-1.5 text-[13px] text-ink">
          Chọn ngày
          <input
            type="date"
            value={date}
            onChange={(e) => isCompleteClinicDate(e.target.value) && goTo(e.target.value)}
            className="rounded-sm border border-gray-300 bg-white px-2 py-1 text-[13px]"
          />
        </label>
        <button type="button" className={`${BTN} ml-auto`} onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? "Đang làm mới…" : "Làm mới"}
        </button>
        <span className="text-[11px] text-muted">Cập nhật lúc {formatClinicTime(data.fetchedAt)}</span>
      </div>

      {refreshError && (
        <p role="alert" className="border border-[#c9302c]/50 bg-[#fdeceb] px-3 py-2 text-[13px] text-[#a02622]">
          Không làm mới được: {refreshError} Đang hiển thị số liệu lúc {formatClinicTime(data.fetchedAt)}.
        </p>
      )}

      <section aria-label="Số liệu lịch khám" className="space-y-3">
        <p className="text-[14px] text-ink">
          Tổng lịch trong ngày: <strong className="text-2xl tabular-nums">{totals.total}</strong>
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          <EncounterGroup
            title="Đã hoàn thành"
            items={groups.completed}
            total={totals.total}
            onOpen={open}
            emptyText="Chưa có ca nào hoàn thành."
          />
          <EncounterGroup
            title="Còn lại"
            items={groups.remaining}
            total={totals.total}
            onOpen={open}
            note="Gồm chưa khám, đang khám và chờ kết quả CLS."
            emptyText="Không còn ca nào."
          />
          <EncounterGroup
            title="Đang khám / chờ kết quả"
            items={groups.unfinished}
            total={totals.total}
            onOpen={open}
            note="Nằm trong số Còn lại, không cộng thêm."
            emptyText="Không có ca đang khám hay chờ kết quả."
          />
        </div>
        <OtherEncounters cancelled={groups.cancelled} other={groups.other} unknown={groups.unknown} onOpen={open} />
        <EncounterGroup
          title="Chưa hoàn tất từ ngày trước"
          items={data.carriedOpenItems}
          onOpen={open}
          showDate
          note="Ca đang khám hoặc chờ kết quả của ngày trước; không tính vào tổng của ngày đang xem."
          emptyText="Không có ca nào còn dở từ ngày trước."
        />
      </section>

      <section aria-label="Lịch hẹn" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-emr-navy">Lịch hẹn trong ngày</h2>
          <div role="group" aria-label="Kiểu xem" className="flex">
            {(
              [
                ["list", "Danh sách"],
                ["calendar", "Lịch theo giờ"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => changeView(key)}
                className={`border border-gray-300 px-3 py-1 text-[13px] first:rounded-l-sm last:rounded-r-sm last:border-l-0 ${
                  view === key ? "bg-emr-blue font-semibold text-white" : "bg-white text-ink hover:bg-soft"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <StatusLegend />
        {view === "list" ? (
          <AppointmentList items={data.appointments} onOpen={open} />
        ) : (
          <DayCalendar items={data.appointments} date={date} onOpen={open} />
        )}
      </section>

      <AppointmentDialog appointmentId={openId} returnTo={dashboardHref(date, view)} onClose={() => setOpenId(null)} />
    </main>
  );
}
