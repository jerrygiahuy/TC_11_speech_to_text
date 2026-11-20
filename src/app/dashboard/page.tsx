import type { Metadata } from "next";
import { headers } from "next/headers";
import { DashboardScreen } from "@/client/dashboard/DashboardScreen";
import { ClinicDateSchema } from "@/shared/clinic/schema";
import type { DashboardView } from "@/shared/clinic/links";
import { toClinicDate } from "@/shared/clinic/schedule";
import { getClinicActor } from "@/server/clinic/demo-actor";
import { assertLocalDemoPage } from "@/server/clinic/page-guard";
import { loadDashboard } from "@/server/clinic/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lịch khám – CardioNote",
  description: "Lịch khám theo ngày của bác sĩ. Chỉ dùng dữ liệu giả.",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  assertLocalDemoPage(await headers(), "/dashboard");
  const params = await searchParams;
  const rawDate = first(params.date);
  // Mặc định hôm nay theo giờ Việt Nam; ngày sai định dạng/không có thật quay về hôm nay.
  const date = rawDate !== undefined && ClinicDateSchema.safeParse(rawDate).success
    ? rawDate
    : toClinicDate(new Date().toISOString());
  const view: DashboardView = first(params.view) === "calendar" ? "calendar" : "list";
  const data = loadDashboard(getClinicActor(), date);
  return <DashboardScreen key={data.date} initialData={data} initialView={view} />;
}
