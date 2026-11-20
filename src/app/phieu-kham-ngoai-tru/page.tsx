import type { Metadata } from "next";
import { PhieuKhamNgoaiTru } from "@/client/phieu-kham-ngoai-tru/PhieuKhamNgoaiTru";

export const metadata: Metadata = {
  title: "Phiếu khám Tim mạch",
  description: "Phiếu khám ngoại trú (Tim mạch) lưu mọi trường ra file JSON. Chỉ dùng dữ liệu giả.",
};

export default function Page() {
  return <PhieuKhamNgoaiTru />;
}
