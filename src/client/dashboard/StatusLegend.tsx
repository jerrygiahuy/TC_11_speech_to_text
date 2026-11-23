import { LEGEND_ORDER, STATUS_META } from "@/client/clinic/status";

/** Chú giải trạng thái: luôn hiển thị cạnh khu vực lịch, mỗi màu kèm nhãn chữ. */
export function StatusLegend() {
  return (
    <div aria-label="Chú giải trạng thái" role="group" className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[11px] font-semibold text-muted">Chú giải:</span>
      {LEGEND_ORDER.map((status) => {
        const meta = STATUS_META[status];
        return (
          <span
            key={status}
            className={`inline-block whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
          >
            {status === "cancelled" ? "Hủy khám / Không khám" : meta.label}
          </span>
        );
      })}
    </div>
  );
}
