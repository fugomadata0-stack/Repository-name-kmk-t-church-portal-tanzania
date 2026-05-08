import { AppLayout } from "../layout/AppLayout";
import { isAcceptInvitePath, isSignupRequestPath, isVerifyMemberPath, usePublicPath } from "../../hooks/usePublicPath";
import { AcceptInvitePage } from "../../pages/auth/AcceptInvitePage";
import { LoginPage } from "../../pages/LoginPage";
import { SignupRequestPage } from "../../pages/SignupRequestPage";
import { VerifyMemberPage } from "../../pages/VerifyMemberPage";
import { PortalDirectoryLoadError } from "./PortalDirectoryLoadError";
import { ProfileGateBlocked } from "./ProfileGateBlocked";
import { SupabaseEnvMissing } from "./SupabaseEnvMissing";
import { usePortal } from "../../context/PortalContext";

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

  if (!authInitialized) {
    return <AuthSpinner />;
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

  if (!supabaseReady) {
    return <SupabaseEnvMissing />;
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

  return <AppLayout />;
}
