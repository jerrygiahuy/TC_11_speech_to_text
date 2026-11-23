import type { Metadata } from "next";
import { DemoLuongScreen } from "@/client/demo-luong/DemoLuongScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demo luồng dữ liệu – CardioNote",
  description: "STT → bản thô → che PII tự động → AI → phiếu đã lưu, hai chế độ xem. Chỉ dùng dữ liệu giả.",
};

export default function Page() {
  return <DemoLuongScreen />;
}
