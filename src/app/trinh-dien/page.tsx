import { notFound } from "next/navigation";

// Trang Trình diễn tạm ẩn từ 2026-11-12 (đã gỡ link ở thanh đầu). Code vẫn giữ ở src/client/trinh-dien/ và
// src/server/du-lieu/trinh-dien.ts; muốn bật lại thì trả về <TrinhDienScreen data={await loadTrinhDienData()} />.
export default function Page() {
  notFound();
}
