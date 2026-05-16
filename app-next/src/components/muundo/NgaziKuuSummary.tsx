import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";
import { MasterBranchExecutiveDashboard } from "../branch-engine/MasterBranchExecutiveDashboard";

interface Props {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
}

/**
 * @deprecated Tumia Muundo → Injini ya Ngazi — Executive.
 * Wrapper ya ulinganifu — PDF na ripoti ziko ndani ya injini.
 */
export function NgaziKuuSummary(props: Props) {
  return <MasterBranchExecutiveDashboard {...props} initialScope="kitaifa" />;
}
