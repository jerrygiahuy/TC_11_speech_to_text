// Điều phối tải chi tiết phiếu cũ: load mới hủy load trước, kết quả/lỗi của load cũ không bao giờ lộ ra.
// Thuần TypeScript, không phụ thuộc React; kiểu chi tiết phiếu truyền vào qua generic.

export interface HistoryLoader<T extends { id: string }> {
  /** Trả `{id, value}` của lần tải hiện tại; trả null nếu đã bị lần tải mới hơn hoặc dispose thay thế. Lỗi của lần hiện tại thì throw. */
  load(patientId: string, encounterId: string): Promise<{ id: string; value: T } | null>;
  dispose(): void;
}

export function createHistoryLoader<T extends { id: string }>(
  fetchDetail: (patientId: string, encounterId: string, signal: AbortSignal) => Promise<T>,
): HistoryLoader<T> {
  let current: AbortController | null = null;
  let disposed = false;

  return {
    async load(patientId, encounterId) {
      if (disposed) return null;
      current?.abort();
      const controller = new AbortController();
      current = controller;
      // Hết hiệu lực khi đã bị hủy (load mới hoặc dispose); kiểm cả signal lẫn đối tượng hiện tại.
      const stale = () => disposed || controller.signal.aborted || current !== controller;
      try {
        const value = await fetchDetail(patientId, encounterId, controller.signal);
        if (stale()) return null;
        return { id: value.id, value };
      } catch (error) {
        if (stale()) return null;
        throw error;
      }
    },
    dispose() {
      disposed = true;
      current?.abort();
      current = null;
    },
  };
}
