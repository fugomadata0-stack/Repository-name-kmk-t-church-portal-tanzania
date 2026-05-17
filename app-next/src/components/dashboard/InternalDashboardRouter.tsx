import { Suspense, lazy, memo } from "react";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import type {
  DayosisiRecord,
  FedhaRecord,
  IncomeManagementRecord,
  JimboRecord,
  PortalDirectoryProfile,
  TawiRecord,
} from "../../types";
import { resolveBranchEngineRoute } from "../../lib/branchEngineRoute";
import {
  DASHBOARD_COMMAND_CENTER_SUBMODULE,
  DASHBOARD_PENDING_APPROVALS_SUBMODULE,
} from "../../lib/internalPortalConfig";
import { normalizeDashboardSubmodule } from "../../lib/dashboardSubmodules";
import { dashboardKpiFingerprint } from "../../lib/portalHardening/kpiSnapshotFingerprint";
import { PortalBootShell, PortalPanelSkeleton } from "../common/PortalSkeleton";

const MasterBranchExecutiveDashboard = lazy(async () => {
  const m = await import("../branch-engine/MasterBranchExecutiveDashboard");
  return { default: m.MasterBranchExecutiveDashboard };
});

const EnterpriseCommandPanel = lazy(async () => {
  const m = await import("./EnterpriseCommandPanel");
  return { default: m.EnterpriseCommandPanel };
});

const PendingApprovalsDashboard = lazy(async () => {
  const m = await import("./PendingApprovalsDashboard");
  return { default: m.PendingApprovalsDashboard };
});

type Props = {
  activeSubmodule: string;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  fedha: FedhaRecord[];
  incomeManagement: IncomeManagementRecord[];
  kpiLive: DashboardKpiSnapshot;
  kpiRefreshing?: boolean;
  wauminiCounts?: { families: number; members: number; activeMembers: number; baptized: number };
  matawiRegistryPendingReviewKpi?: number | null;
  matawiRegistryPendingReviewKpiFailed?: boolean;
  portalProfile: PortalDirectoryProfile | null;
  highlightRecordId?: string | null;
  branchEngineModuleId?: string | null;
  canViewModule: (moduleKey: string) => boolean;
  onNavigateModule: (moduleKey: string, submodule: string) => void;
  onRefreshKpis?: () => void;
  branchEngineMountEnabled?: boolean;
};

function InternalDashboardRouterInner(props: Props) {
  const sub = normalizeDashboardSubmodule(props.activeSubmodule);

  if (sub === DASHBOARD_COMMAND_CENTER_SUBMODULE) {
    return (
      <div className="mx-auto w-full max-w-[min(100%,96rem)]">
        <Suspense fallback={<PortalPanelSkeleton rows={6} />}>
          <EnterpriseCommandPanel
            canViewModule={props.canViewModule}
            kpiLive={props.kpiLive}
            kpiRefreshing={props.kpiRefreshing}
            wauminiCounts={props.wauminiCounts}
            onNavigateModule={props.onNavigateModule}
            onRefreshKpis={props.onRefreshKpis}
          />
        </Suspense>
      </div>
    );
  }

  if (sub === DASHBOARD_PENDING_APPROVALS_SUBMODULE) {
    return (
      <div className="mx-auto w-full max-w-[min(100%,96rem)]">
        <Suspense fallback={<PortalPanelSkeleton rows={5} />}>
          <PendingApprovalsDashboard
            incomeManagement={props.incomeManagement}
            fedha={props.fedha}
            majimbo={props.majimbo}
            matawi={props.matawi}
            tawiRegistryPendingReviewKpi={props.matawiRegistryPendingReviewKpi}
            tawiRegistryPendingReviewKpiFailed={props.matawiRegistryPendingReviewKpiFailed}
          />
        </Suspense>
      </div>
    );
  }

  const branchProps = resolveBranchEngineRoute(sub, props.portalProfile, {
    recordId: props.highlightRecordId,
    engineModuleId: props.branchEngineModuleId,
  });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <Suspense fallback={<PortalBootShell className="min-h-[min(72vh,640px)]" />}>
        <MasterBranchExecutiveDashboard
          dayosisi={props.dayosisi}
          majimbo={props.majimbo}
          matawi={props.matawi}
          kpiLive={props.kpiLive}
          mountEnabled={props.branchEngineMountEnabled ?? true}
          {...branchProps}
        />
      </Suspense>
    </div>
  );
}

function dashboardRouterPropsEqual(prev: Props, next: Props): boolean {
  if (prev.activeSubmodule !== next.activeSubmodule) return false;
  if (prev.kpiRefreshing !== next.kpiRefreshing) return false;
  if (prev.branchEngineMountEnabled !== next.branchEngineMountEnabled) return false;
  if (prev.highlightRecordId !== next.highlightRecordId) return false;
  if (prev.branchEngineModuleId !== next.branchEngineModuleId) return false;
  if (dashboardKpiFingerprint(prev.kpiLive) !== dashboardKpiFingerprint(next.kpiLive)) return false;
  if (
    prev.wauminiCounts?.members !== next.wauminiCounts?.members ||
    prev.wauminiCounts?.families !== next.wauminiCounts?.families
  ) {
    return false;
  }
  if (prev.matawiRegistryPendingReviewKpi !== next.matawiRegistryPendingReviewKpi) return false;
  if (prev.matawiRegistryPendingReviewKpiFailed !== next.matawiRegistryPendingReviewKpiFailed) return false;
  if (prev.portalProfile?.id !== next.portalProfile?.id) return false;
  const sub = normalizeDashboardSubmodule(prev.activeSubmodule);
  if (sub === DASHBOARD_PENDING_APPROVALS_SUBMODULE) {
    if (
      prev.fedha.length !== next.fedha.length ||
      prev.incomeManagement.length !== next.incomeManagement.length ||
      prev.majimbo.length !== next.majimbo.length ||
      prev.matawi.length !== next.matawi.length
    ) {
      return false;
    }
  } else if (sub !== DASHBOARD_COMMAND_CENTER_SUBMODULE) {
    if (
      prev.dayosisi.length !== next.dayosisi.length ||
      prev.majimbo.length !== next.majimbo.length ||
      prev.matawi.length !== next.matawi.length
    ) {
      return false;
    }
  }
  return (
    prev.onNavigateModule === next.onNavigateModule &&
    prev.canViewModule === next.canViewModule &&
    prev.onRefreshKpis === next.onRefreshKpis
  );
}

export const InternalDashboardRouter = memo(InternalDashboardRouterInner, dashboardRouterPropsEqual);
