// Chạy toàn bộ ca mẫu qua pipeline, so với expected và in bảng độ chính xác.
//   npm run eval                     dùng LLM_PROVIDER trong .env.local (mặc định mock)
//   npm run eval -- --rule-only      chỉ chạy bộ tách bằng quy tắc, làm mốc so sánh
//   npm run eval -- --provider=anthropic   (hoặc openai, gemini)
import { loadCases, loadCatalogs, loadForms, loadRules, loadVietTat } from "@/server/du-lieu/config";
import { runPipeline } from "@/server/ai/pipeline";
import { fillDraft } from "@/server/ai/schema";
import { chamNhap, emptyTally, printTable, type Outcome, type Tally } from "./cham-diem";

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Không có .env.local thì dùng mock
  }
  const args = process.argv.slice(2);
  const ruleOnly = args.includes("--rule-only");
  const providerArg = args.find((arg) => arg.startsWith("--provider="))?.split("=")[1];
  const provider = ruleOnly ? "mock" : providerArg || process.env.LLM_PROVIDER?.trim() || "mock";

  const forms = loadForms();
  const cases = loadCases();
  const context = { forms, catalogs: loadCatalogs(), vietTat: loadVietTat(), rules: loadRules(), cases };

  const variants = [
    { key: "input_noi", label: "nói" },
    { key: "input_go_tat", label: "gõ tắt" },
  ] as const;

  const bySection = new Map<string, Tally>();
  const byField = new Map<string, Tally>();
  const failures: string[] = [];
  let extraRows = 0;

  const add = (map: Map<string, Tally>, key: string, outcome: Outcome) => {
    const tally = map.get(key) ?? emptyTally();
    tally[outcome]++;
    map.set(key, tally);
  };

  console.log(`Chế độ: ${ruleOnly ? "mock, chỉ bộ tách quy tắc" : provider} · ${cases.length} ca x ${variants.length} kiểu nhập`);

  for (const item of cases) {
    for (const variant of variants) {
      let result;
      try {
        result = await runPipeline(item[variant.key], context, { provider, ruleOnly });
      } catch (error) {
        failures.push(`${item.id} (${variant.label}): ${error instanceof Error ? error.message : error}`);
        continue;
      }
      const expected = fillDraft(item.expected, forms);
      extraRows += chamNhap(forms, expected, result.draft, (phan, truong, outcome) => {
        add(bySection, `${phan} (${variant.label})`, outcome);
        add(byField, truong, outcome);
      });
    }
  }

  const sections = forms.flatMap((form) => variants.map((variant) => `${form.title} (${variant.label})`));
  printTable("Theo từng phần", sections.map((name) => [name, bySection.get(name) ?? emptyTally()]));
  printTable("Theo từng trường", [...byField.entries()]);

  console.log(`\nDòng thừa (dịch vụ/thuốc không có trong kết quả mong muốn): ${extraRows}`);
  console.log(`Chính xác = Đúng / (Đúng + Sai + Thiếu + Thừa). Thừa nghĩa là pipeline điền trường mà bác sĩ không nói.`);
  if (provider === "mock" && !ruleOnly) {
    console.log("Lưu ý: mock trả kết quả soạn sẵn cho ca mẫu nên điểm gần 100% là đương nhiên, chỉ để kiểm tra pipeline. Dùng --rule-only hoặc LLM thật để có số đo có ý nghĩa.");
  }
  if (failures.length > 0) {
    console.log(`\nCó ${failures.length} lượt lỗi:`);
    failures.forEach((failure) => console.log(`- ${failure}`));
    process.exitCode = 1;
  }
}

main();
