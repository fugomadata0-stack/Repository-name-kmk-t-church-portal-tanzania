import { useCallback, useEffect, useState } from "react";

/** Inasaidia SPA bila react-router: njia ya umma kama `/auth/signup-request`. */
export function usePublicPath() {
  const [pathname, setPathname] = useState(() => (typeof window !== "undefined" ? window.location.pathname : "/"));

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, "", to);
    setPathname(to);
  }, []);

  return { pathname, navigate };
}

export function isSignupRequestPath(path: string): boolean {
  const p = path.replace(/\/+$/, "") || "/";
  return p === "/auth/signup-request";
}

/** Ukurasa wa kukubali mwaliko — huna haja ya kuingia. */
export function isAcceptInvitePath(path: string): boolean {
  const p = path.replace(/\/+$/, "") || "/";
  return p === "/auth/accept-invite";
}

export function isPublicAuthPath(path: string): boolean {
  return isSignupRequestPath(path) || isAcceptInvitePath(path);
}

export function isVerifyMemberPath(path: string): boolean {
  const p = path.replace(/\/+$/, "") || "/";
  return /^\/verify\/member\/[0-9a-f-]{36}$/i.test(p);
}

/** Uhakiki wa umma wa wasifu wa uongozi (QR kutoka PDF). */
export function isVerifyLeadershipPath(path: string): boolean {
  const p = path.replace(/\/+$/, "") || "/";
  return p === "/verify/leadership";
}
