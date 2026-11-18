import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Biểu tượng của Next.js che thanh trạng thái ghim ở góc dưới trang eForm khi demo
  devIndicators: false,
  // Gói native (.node + DLL onnxruntime) nhận dạng giọng nói: để Node nạp trực tiếp, không đóng gói
  serverExternalPackages: ["sherpa-onnx-node"],
  // Trang eForm đã chuyển lên "/"; giữ đường dẫn cũ cho ai còn lưu link. Không permanent để trình duyệt không nhớ
  async redirects() {
    return [{ source: "/eform", destination: "/", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
