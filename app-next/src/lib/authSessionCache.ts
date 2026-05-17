import type { Session } from "@supabase/supabase-js";

/** Hali ya kikao inayosimamiwa na PortalContext pekee — hakuna getSession/getUser kwenye huduma. */
let cachedSession: Session | null = null;

export function syncAuthSessionCache(session: Session | null): void {
  cachedSession = session;
}

export function getCachedSession(): Session | null {
  return cachedSession;
}

export function getCachedAuthUserId(): string | null {
  return cachedSession?.user?.id ?? null;
}

export function getCachedAuthUserEmail(): string | null {
  return cachedSession?.user?.email ?? null;
}

export function getCachedAccessToken(): string | null {
  return cachedSession?.access_token ?? null;
}

/** Inahitaji mtumiaji aliyeingia — tumia badala ya supabase.auth.getUser() kwenye huduma. */
export function requireAuthUserId(): string {
  const id = getCachedAuthUserId();
  if (!id) {
    throw new Error("Ingia kwenye akaunti ili kuendelea.");
  }
  return id;
}

export function clearAuthSessionCache(): void {
  cachedSession = null;
}
