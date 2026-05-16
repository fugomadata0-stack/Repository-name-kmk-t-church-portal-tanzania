/**
 * Mteja wa kati wa Supabase — tumia faili hii kwa DB, Auth, na Storage.
 * Usitumie fetch wazi kwa Storage isipokuwa kupitia mteja huu.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabase as getSupabaseClient,
  getSupabaseOrThrow as getSupabaseOrThrowClient,
  getSupabaseProjectOrigin,
  isSupabaseConfigured,
  isSupabaseRealtimeEnabled,
  resetSupabaseClientForTests,
  validateSupabaseEnv,
} from "./supabaseClient";

export {
  getSupabaseProjectOrigin,
  isSupabaseConfigured,
  isSupabaseRealtimeEnabled,
  resetSupabaseClientForTests,
  validateSupabaseEnv,
};

export type { SupabaseClient };

export function getSupabase(): SupabaseClient | null {
  return getSupabaseClient();
}

export function getSupabaseOrThrow(): SupabaseClient {
  return getSupabaseOrThrowClient();
}

/**
 * Proxy ya mteja — `supabase.storage.from(bucket).upload(...)` n.k.
 * Inatupa apikey kiotomatiki kupitia supabaseClient.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseOrThrow();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
