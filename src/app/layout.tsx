import type { Metadata } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./globals.css";
import { Header } from "@/client/chung/Header";
import { getProviderName, loadTheme } from "@/server/du-lieu/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CardioNote",
  description: "CardioNote: prototype trợ lý điền bệnh án cho Trung tâm Tim mạch. Bác sĩ nói hoặc gõ tắt, AI điền nháp. Chỉ dùng dữ liệu giả.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const cssVars = Object.entries(loadTheme())
    .map(([name, value]) => `--${name}:${value};`)
    .join("");
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <style>{`:root{${cssVars}}`}</style>
      </head>
      <body className="flex min-h-full flex-col">
        <Header provider={getProviderName()} />
        {children}
      </body>
    </html>
  );
}
