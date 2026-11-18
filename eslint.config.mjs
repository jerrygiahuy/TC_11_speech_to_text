import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Ranh giới thư mục (xem docs/cau-truc-du-an.md): client và server chỉ gặp nhau qua src/shared và /api/*.
const cam = (group, message) => ({ group, message });
const CAM_SERVER = cam(["@/server/*", "**/server/*"], "Giao diện không được import code server; gọi qua /api/* (src/client/api.ts) hoặc đưa phần dùng chung vào src/shared.");
const CAM_CLIENT = cam(["@/client/*", "**/client/*"], "Không import giao diện từ đây; chuyển phần dùng chung vào src/shared.");

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/client/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [CAM_SERVER] }] },
  },
  {
    files: ["src/server/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [CAM_CLIENT] }] },
  },
  {
    // shared chạy được ở trình duyệt, server và scripts: không React, không Next, không API của Node
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            CAM_SERVER,
            CAM_CLIENT,
            cam(["react", "react-dom", "next", "next/*", "node:*"], "src/shared phải là TypeScript thuần, chạy được cả trên trình duyệt lẫn server."),
          ],
        },
      ],
    },
  },
  {
    // Test chạy bằng node:test (npm test), được import node:* kể cả trong src/shared
    files: ["src/**/*.test.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
