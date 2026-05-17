import type { MasterBranchScope } from "../services/masterBranchEngineService";
import { fetchMahudhurioPeriodTotals, type MahudhurioPeriodTotals } from "../services/branchEngineMahudhurioService";

export async function fetchMahudhurioForBranchScope(
  scope: MasterBranchScope,
  entityId: string,
): Promise<MahudhurioPeriodTotals> {
  const id = entityId.trim();
  if (scope === "tawi" && id) return fetchMahudhurioPeriodTotals({ tawiId: id });
  if (scope === "jimbo" && id) return fetchMahudhurioPeriodTotals({ jimboId: id });
  if (scope === "dayosisi" && id) return fetchMahudhurioPeriodTotals({ dayosisiId: id });
  return fetchMahudhurioPeriodTotals();
}
