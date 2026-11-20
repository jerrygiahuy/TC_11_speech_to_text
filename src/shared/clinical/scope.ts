import type { PipelineResult } from "../api";

/** Apply at the UI boundary too: templates and mock fallbacks can bypass the API. */
export function clinicalOnlyResult(result: PipelineResult): PipelineResult {
  return {
    ...result,
    draft: Object.fromEntries(Object.entries(result.draft).filter(([key]) => key === "phieu_kham" || key === "chi_dinh")),
    matches: Object.fromEntries(Object.entries(result.matches).filter(([key]) => key === "chi_dinh")),
  };
}
