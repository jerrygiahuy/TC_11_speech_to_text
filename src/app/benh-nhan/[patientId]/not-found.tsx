import Link from "next/link";

export default function PatientNotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-3 px-4 py-8">
      <h1 className="text-lg font-semibold">Không tìm thấy bệnh nhân</h1>
      <p className="text-[13px] text-muted">
        Mã bệnh nhân hoặc lịch hẹn không tồn tại, hoặc không thuộc bác sĩ và cơ sở đang đăng nhập.
      </p>
      <Link href="/dashboard" className="inline-block rounded border border-gray-300 bg-white px-4 py-2 text-[13px] hover:bg-gray-50">
        Về dashboard
      </Link>
    </main>
  );
}
