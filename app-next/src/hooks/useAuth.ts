import { usePortal } from "../context/PortalContext";

/**
 * Kikao na mtumiaji — chanzo kimoja (PortalContext).
 * Usitumie supabase.auth.getSession/getUser nje ya PortalProvider.
 */
export function useAuth() {
  const {
    session,
    authUser,
    authInitialized,
    loading,
    authBusy,
    portalProfile,
    role,
    signInWithEmailPassword,
    signOut,
    refreshPortalAccess,
  } = usePortal();

  return {
    session,
    user: authUser,
    authUser,
    loading: loading || !authInitialized,
    authInitialized,
    authBusy,
    portalProfile,
    role,
    signInWithEmailPassword,
    signOut,
    refreshPortalAccess,
  };
}
