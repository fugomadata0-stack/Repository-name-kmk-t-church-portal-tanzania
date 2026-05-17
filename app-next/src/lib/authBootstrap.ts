import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { withTimeout } from "./asyncTimeout";
import { PORTAL_LOAD_TIMEOUTS } from "./portalLoadTimeouts";
import { singleFlight } from "./singleFlight";

const BOOTSTRAP_KEY = "auth:bootstrap:getSession";

/**
 * Ombi moja la getSession wakati wa kuanzisha — tu ikiwa onAuthStateChange haijatoa hali bado.
 */
export function bootstrapSessionOnce(client: SupabaseClient): Promise<Session | null> {
  return singleFlight(BOOTSTRAP_KEY, async () => {
    try {
      const { data, error } = await withTimeout(
        client.auth.getSession(),
        PORTAL_LOAD_TIMEOUTS.authSessionMs,
        "auth:getSession",
      );
      if (error) return null;
      return data.session ?? null;
    } catch {
      return null;
    }
  });
}
