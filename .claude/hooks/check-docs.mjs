// Stop hook: chặn Claude kết thúc lượt nếu có file (không phải tài liệu) thay đổi
// mà docs/CHANGELOG.md chưa được cập nhật sau thay đổi đó.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CHANGELOG = "docs/CHANGELOG.md";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {}
// Đã nhắc một lần trong lượt này thì không chặn nữa, tránh lặp vô hạn.
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

let status;
try {
  status = execSync("git -c core.quotePath=false status --porcelain -uall", {
    cwd: root,
    encoding: "utf8",
  });
} catch {
  process.exit(0); // Không phải repo git thì bỏ qua.
}

const isDoc = (p) => p.startsWith("docs/") || p.endsWith(".md") || p.startsWith(".claude/");

const changed = status
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const raw = line.slice(3);
    const path = raw.includes(" -> ") ? raw.split(" -> ")[1] : raw;
    return { code: line.slice(0, 2), path: path.replace(/^"|"$/g, "") };
  });

const code = changed.filter((f) => !isDoc(f.path));
if (code.length === 0) process.exit(0);

const changelogPath = join(root, CHANGELOG);
const changelogTouched = changed.some((f) => f.path === CHANGELOG);
const changelogTime = existsSync(changelogPath) ? statSync(changelogPath).mtimeMs : 0;

// File còn tồn tại: phải sửa sau CHANGELOG thì mới tính là chưa ghi.
// File bị xóa: không có mtime, chỉ cần CHANGELOG có thay đổi chưa commit.
const undocumented = code.filter((f) => {
  const abs = join(root, f.path);
  if (!existsSync(abs)) return !changelogTouched;
  return statSync(abs).mtimeMs > changelogTime;
});

if (undocumented.length === 0) process.exit(0);

const list = undocumented.map((f) => `- ${f.path}`).join("\n");
console.log(
  JSON.stringify({
    decision: "block",
    reason:
      `Quy tắc dự án: mọi thay đổi đều phải ghi tài liệu. Các file sau đã đổi nhưng chưa được ghi vào ${CHANGELOG}:\n${list}\n\n` +
      `Hãy dùng skill "ghi-tai-lieu": thêm mục vào ${CHANGELOG} (thay đổi gì, vì sao, file nào, cách kiểm tra) ` +
      `và cập nhật README.md hoặc docs/ liên quan nếu hành vi, cấu hình hay cách dùng thay đổi.`,
  }),
);
