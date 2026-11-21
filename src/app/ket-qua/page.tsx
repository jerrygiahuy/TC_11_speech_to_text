import { ResultsView } from "@/client/ket-qua/ResultsView";
import { listSessions } from "@/server/du-lieu/sessions";

export const dynamic = "force-dynamic";

export default function Page() {
  return <ResultsView sessions={listSessions()} />;
}
