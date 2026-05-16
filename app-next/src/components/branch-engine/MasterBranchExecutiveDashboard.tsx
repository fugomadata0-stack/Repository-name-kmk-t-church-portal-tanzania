import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";
import type { MasterBranchScope } from "../../services/masterBranchEngineService";
import { MatawiModuleDdFrame } from "./MatawiModuleDdFrame";

interface Props {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  initialScope?: MasterBranchScope;
  initialEntityId?: string;
}

/**
 * Injini ya Ngazi Kuu — UI rasmi (MATAWI MODULE DD.html) + Supabase.
 */
export function MasterBranchExecutiveDashboard({
  dayosisi,
  majimbo,
  matawi,
  initialScope = "kitaifa",
  initialEntityId = "",
}: Props) {
  return (
    <MatawiModuleDdFrame
      dayosisi={dayosisi}
      majimbo={majimbo}
      matawi={matawi}
      initialScope={initialScope}
      initialEntityId={initialEntityId}
    />
  );
}
