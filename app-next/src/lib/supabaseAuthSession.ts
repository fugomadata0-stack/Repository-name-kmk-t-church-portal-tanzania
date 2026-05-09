import { getSupabase } from "./supabaseClient";

let inFlightUserIdPromise: Promise<string | null> | null = null;

/**
 * Returns current user id while deduplicating concurrent auth reads.
 * This reduces parallel auth requests that can trigger lock contention.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (inFlightUserIdPromise) return inFlightUserIdPromise;

  inFlightUserIdPromise = (async () => {
    const client = getSupabase();
    if (!client) return null;

    const { data: sessionData } = await client.auth.getSession();
    const fromSession = sessionData.session?.user?.id ?? null;
    if (fromSession) return fromSession;

    const { data: userData } = await client.auth.getUser();
    return userData.user?.id ?? null;
  })();

  try {
    return await inFlightUserIdPromise;
  } finally {
    inFlightUserIdPromise = null;
  }
}
