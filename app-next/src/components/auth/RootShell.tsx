import { lazy, Suspense } from "react";
import { GlobalMaintenanceGate } from "./GlobalMaintenanceGate";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { PortalBootShell } from "../common/PortalSkeleton";
import { buildBranchEnginePortalUrl } from "../../lib/branchEnginePortalUrl";
import {
  isAcceptInvitePath,
  isSignupRequestPath,
  isStandaloneMatawiHtmlPath,
  isVerifyLeadershipPath,
  isVerifyMemberPath,
  usePublicPath,
} from "../../hooks/usePublicPath";
import { AcceptInvitePage } from "../../pages/auth/AcceptInvitePage";
import { LoginPage } from "../../pages/LoginPage";
import { SignupRequestPage } from "../../pages/SignupRequestPage";
import { VerifyLeadershipPage } from "../../pages/VerifyLeadershipPage";
import { VerifyMemberPage } from "../../pages/VerifyMemberPage";
import { PortalDirectoryLoadError } from "./PortalDirectoryLoadError";
import { ProfileGateBlocked } from "./ProfileGateBlocked";
import { SupabaseEnvMissing } from "./SupabaseEnvMissing";
import { usePortal } from "../../context/PortalContext";

const AppLayout = lazy(async () => {
  const m = await import("../layout/AppLayout");
  return { default: m.AppLayout };
});

function AuthBootFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-[#eef2f7]" role="status" aria-busy="true" aria-label="Inaandaa portal">
      <div className="flex min-h-0 flex-1 flex-col">
        <PortalBootShell className="mx-auto w-full max-w-[min(100%,96rem)]" />
      </div>
    </div>
  );
}

export function RootShell() {
  const { pathname } = usePublicPath();
  const { supabaseReady, authInitialized, session, profileGateBlocked, portalDirectoryLoadError, role, portalProfile } = usePortal();
  const adminLoginRequested = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("maintenance-admin-login") === "1";

  const withMaintenance = (node: JSX.Element) => adminLoginRequested ? node : (
    <GlobalMaintenanceGate authenticated={Boolean(session)} role={role} profileRole={portalProfile?.role_key}>
      {node}
    </GlobalMaintenanceGate>
  );

  if (typeof window !== "undefined" && isStandaloneMatawiHtmlPath(pathname)) {
    const params = new URLSearchParams(window.location.search);
    window.location.replace(
      buildBranchEnginePortalUrl({
        recordId: params.get("entityId") || params.get("recordId") || undefined,
        engineModuleId: params.get("module") || params.get("engineModuleId") || undefined,
      }),
    );
    return <AuthBootFallback />;
  }
  if (!authInitialized) return <AuthBootFallback />;
  if (!supabaseReady) return <SupabaseEnvMissing />;
  if (isSignupRequestPath(pathname)) return withMaintenance(<SignupRequestPage />);
  if (isAcceptInvitePath(pathname)) return withMaintenance(<AcceptInvitePage />);
  if (isVerifyMemberPath(pathname)) {
    const memberId = pathname.split("/").filter(Boolean).pop() ?? "";
    return withMaintenance(<VerifyMemberPage memberId={memberId} />);
  }
  if (isVerifyLeadershipPath(pathname)) return withMaintenance(<VerifyLeadershipPage />);
  if (!session) return withMaintenance(<LoginPage />);
  if (portalDirectoryLoadError) return withMaintenance(<PortalDirectoryLoadError />);
  if (profileGateBlocked) return withMaintenance(<ProfileGateBlocked />);
  return withMaintenance(
    <ErrorBoundary>
      <Suspense fallback={<AuthBootFallback />}>
        <AppLayout />
      </Suspense>
    </ErrorBoundary>,
  );
}
