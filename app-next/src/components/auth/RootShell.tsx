import { lazy, Suspense } from "react";
import { ErrorBoundary } from "../common/ErrorBoundary";
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

/** Dashibodi na moduli — lazy ili ukurasa wa kuingia usibebe bundle kubwa (haraka zaidi). */
const AppLayout = lazy(async () => {
  const m = await import("../layout/AppLayout");
  return { default: m.AppLayout };
});

function AuthSpinner() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-100"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" aria-hidden />
      <p className="mt-4 text-sm text-slate-600">Inapakia akaunti…</p>
    </div>
  );
}

export function RootShell() {
  const { pathname } = usePublicPath();
  const { supabaseReady, authInitialized, session, rbacLoading, profileGateBlocked, portalDirectoryLoadError } =
    usePortal();

  if (typeof window !== "undefined" && isStandaloneMatawiHtmlPath(pathname)) {
    const params = new URLSearchParams(window.location.search);
    window.location.replace(
      buildBranchEnginePortalUrl({
        recordId: params.get("entityId") || params.get("recordId") || undefined,
        engineModuleId: params.get("module") || params.get("engineModuleId") || undefined,
      }),
    );
    return <AuthSpinner />;
  }

  if (!authInitialized) {
    return <AuthSpinner />;
  }

  if (!supabaseReady) {
    return <SupabaseEnvMissing />;
  }

  if (isSignupRequestPath(pathname)) {
    return <SignupRequestPage />;
  }

  if (isAcceptInvitePath(pathname)) {
    return <AcceptInvitePage />;
  }
  if (isVerifyMemberPath(pathname)) {
    const memberId = pathname.split("/").filter(Boolean).pop() ?? "";
    return <VerifyMemberPage memberId={memberId} />;
  }
  if (isVerifyLeadershipPath(pathname)) {
    return <VerifyLeadershipPage />;
  }

  if (!session) {
    return <LoginPage />;
  }

  if (rbacLoading) {
    return <AuthSpinner />;
  }

  if (portalDirectoryLoadError) {
    return <PortalDirectoryLoadError />;
  }

  if (profileGateBlocked) {
    return <ProfileGateBlocked />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<AuthSpinner />}>
        <AppLayout />
      </Suspense>
    </ErrorBoundary>
  );
}
