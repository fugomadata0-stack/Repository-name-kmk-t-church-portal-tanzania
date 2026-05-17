import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { singleFlight } from "./singleFlight";

const BOOTSTRAP_KEY = "auth:bootstrap:getSession";

/**
 * Ombi moja la getSession wakati wa kuanzisha — tu ikiwa onAuthStateChange haijatoa hali bado.
 */
export function bootstrapSessionOnce(client: SupabaseClient): Promise<Session | null> {
  return singleFlight(BOOTSTRAP_KEY, async () => {
    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data.session ?? null;
  });
}
