import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PatientScreen } from "@/client/patient/PatientScreen";
import { safeReturnTo } from "@/shared/clinic/links";
import { toClinicDate } from "@/shared/clinic/schedule";
import { getClinicActor } from "@/server/clinic/demo-actor";
import { ClinicHttpError } from "@/server/clinic/errors";
import { assertLocalDemoPage } from "@/server/clinic/page-guard";
import { loadPatientPage } from "@/server/clinic/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Hồ sơ bệnh nhân" };

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === undefined || v === "" ? undefined : v;
}

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<Query>;
}) {
  // 403 ném thẳng vào error boundary (không notFound) để không lẫn với hồ sơ không tồn tại.
  assertLocalDemoPage(await headers(), "/benh-nhan");
  const { patientId } = await params;
  const query = await searchParams;
  const appointmentId = first(query.appointment_id);
  const returnTo = safeReturnTo(first(query.return_to));

  let data;
  try {
    // Gọi thẳng service với actor demo phía server, không đi vòng qua API nội bộ.
    data = loadPatientPage(getClinicActor(), patientId, appointmentId);
  } catch (error) {
    // 404 cho id giả hoặc cơ sở khác; mọi lỗi khác để error boundary xử lý, không dựng dữ liệu giả.
    if (error instanceof ClinicHttpError && error.status === 404) notFound();
    throw error;
  }

  // Ngày đối chiếu tuổi và hạn bảo hiểm: ngày hẹn đang chọn nếu thấy được, không thì hôm nay.
  const selected = data.eligibleAppointments.find((i) => i.appointment.id === data.selectedAppointmentId);
  const referenceDate = toClinicDate(selected?.appointment.starts_at ?? new Date().toISOString());

  return <PatientScreen data={data} returnTo={returnTo} referenceDate={referenceDate} />;
}
