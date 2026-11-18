import type { Metadata } from "next";
import { EformScreen } from "@/client/eform/EformScreen";
import { loadEformData } from "@/server/du-lieu/eform";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "eForm ngoại trú",
  description: "Mô phỏng phiếu khám ngoại trú có điểm AI hỗ trợ. Chỉ dùng dữ liệu giả.",
};

/** ?bs=user_bs02 đổi tài khoản bác sĩ, để nhiều bác sĩ thử chung một máy mà gợi ý theo thói quen không lẫn nhau */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { bs } = await searchParams;
  return <EformScreen data={loadEformData(typeof bs === "string" ? bs : undefined)} />;
}
