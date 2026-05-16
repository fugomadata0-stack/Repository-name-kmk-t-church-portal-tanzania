/**
 * @deprecated Tumia MasterBranchExecutiveDashboard — hii ni wrapper ya ulinganifu wa zamani.
 */
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";
import { MasterBranchExecutiveDashboard } from "../branch-engine/MasterBranchExecutiveDashboard";

interface Props {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
}

/** Dashibodi ya tawi — sasa ni sehemu ya Injini ya Ngazi Kuu (scope = tawi). */
export function TawiBranchExecutiveDashboard(props: Props) {
  return <MasterBranchExecutiveDashboard {...props} initialScope="tawi" />;
}
