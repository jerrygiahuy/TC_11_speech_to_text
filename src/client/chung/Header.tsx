"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// `cungNhom`: các đường dẫn con coi như đang ở mục này (hồ sơ bệnh nhân luôn đi từ lịch khám).
const LINKS: { href: string; label: string; cungNhom?: string[] }[] = [
  { href: "/", label: "eForm ngoại trú" },
  { href: "/phieu-kham-ngoai-tru", label: "Phiếu khám Tim mạch" },
  { href: "/dashboard", label: "Lịch khám", cungNhom: ["/benh-nhan"] },
  { href: "/ket-qua", label: "Kết quả thử nghiệm" },
  { href: "/stt", label: "Thử nghiệm STT" },
  { href: "/giong-bac-si", label: "Giọng bác sĩ" },
  { href: "/demo-luong", label: "Demo luồng dữ liệu" },
];

export function Header({ provider }: { provider: string }) {
  const pathname = usePathname();
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-1 bg-primary px-4 py-2.5 text-white">
      <h1 className="text-lg font-semibold">CardioNote – Trung tâm Tim mạch (prototype)</h1>
      <nav className="flex flex-wrap gap-1">
        {LINKS.map((link) => {
          const active =
            pathname === link.href || (link.cungNhom ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded px-3 py-1 text-sm ${active ? "bg-white/20 font-medium" : "hover:bg-white/10"}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <span className="ml-auto rounded bg-white/15 px-2 py-0.5 text-xs">
        Chế độ AI: <strong>{provider}</strong>
      </span>
    </header>
  );
}
