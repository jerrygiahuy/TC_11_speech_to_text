import type { Metadata } from "next";
import { EncounterWorkspace } from "@/client/eform/EncounterWorkspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "eForm ngoại trú",
  description: "Mô phỏng phiếu khám ngoại trú có điểm AI hỗ trợ. Chỉ dùng dữ liệu giả.",
};

/**
 * Lượt khám chọn theo mã khám ở thanh trên cùng; ?ho_so=<mã hồ sơ> mở lại đúng hồ sơ đó.
 * Danh tính bác sĩ và dữ liệu bệnh nhân do server quyết định theo từng mã khám, không lấy từ đường dẫn.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { ho_so } = await searchParams;
  return <EncounterWorkspace initialRecordId={typeof ho_so === "string" ? ho_so : undefined} />;
}
