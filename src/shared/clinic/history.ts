// Thứ tự và điều hướng lịch sử khám: hàm thuần, không I/O, không mutate input.

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Giảm dần theo encounter_at (mới nhất trước); trùng thời điểm thì ID giảm dần. */
export function sortHistory<T extends { id: string; encounter_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const d = Date.parse(b.encounter_at) - Date.parse(a.encounter_at);
    return d !== 0 ? d : cmpStr(b.id, a.id);
  });
}

export interface HistoryNavigation {
  /** -1 nếu currentId không có trong danh sách. */
  index: number;
  /** Lượt mới hơn (đứng trước trong danh sách giảm dần). */
  previousId: string | null;
  /** Lượt cũ hơn (đứng sau). */
  nextId: string | null;
}

/** `ordered` là danh sách đã qua `sortHistory`. */
export function historyNavigation(ordered: { id: string }[], currentId: string): HistoryNavigation {
  const index = ordered.findIndex((x) => x.id === currentId);
  if (index < 0) return { index: -1, previousId: null, nextId: null };
  return {
    index,
    previousId: index > 0 ? ordered[index - 1].id : null,
    nextId: index < ordered.length - 1 ? ordered[index + 1].id : null,
  };
}
