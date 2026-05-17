import { memo } from "react";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";
import type { MasterBranchScope } from "../../services/masterBranchEngineService";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import { MatawiModuleDdFrame } from "./MatawiModuleDdFrame";

interface Props {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  initialScope?: MasterBranchScope;
  initialEntityId?: string;
  initialModuleId?: string;
  kpiLive?: DashboardKpiSnapshot | null;
  mountEnabled?: boolean;
}

/**
 * Injini ya Ngazi Kuu — UI rasmi (MATAWI MODULE DD.html) + Supabase.
 */
function MasterBranchExecutiveDashboardInner({
  dayosisi,
  majimbo,
  matawi,
  initialScope = "kitaifa",
  initialEntityId = "",
  initialModuleId = "",
  kpiLive = null,
  mountEnabled = true,
}: Props) {
  return (
    <MatawiModuleDdFrame
      dayosisi={dayosisi}
      majimbo={majimbo}
      matawi={matawi}
      initialScope={initialScope}
      initialEntityId={initialEntityId}
      initialModuleId={initialModuleId}
      kpiLive={kpiLive}
      mountEnabled={mountEnabled}
    />
  );
}

export const MasterBranchExecutiveDashboard = memo(MasterBranchExecutiveDashboardInner);
