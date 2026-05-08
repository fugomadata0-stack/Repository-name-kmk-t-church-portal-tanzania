import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function normalizeEnvUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

function validateSupabaseUrl(url: string): string | null {
  const u = normalizeEnvUrl(url);
  if (!u) return "VITE_SUPABASE_URL ni tupu.";
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:") return "VITE_SUPABASE_URL lazima ianze na https://";
    return null;
  } catch {
    return "VITE_SUPABASE_URL si URL sahihi.";
  }
}

function validateAnonKey(key: string): string | null {
  const k = key.trim();
  if (!k) return "VITE_SUPABASE_ANON_KEY ni tupu.";
  if (k.length < 20) return "VITE_SUPABASE_ANON_KEY inaonekana fupi sana.";
  if (k.toLowerCase().includes("service_role")) {
    return "Usitumie service role key kwenye frontend.";
  }
  return null;
}

/**
 * Thibitisha mazingira kabla ya kutengeneza mteja (inaweza kuitwa kwenye UI).
 */
export function validateSupabaseEnv(): { ok: true } | { ok: false; message: string } {
  const env = import.meta.env as ImportMeta["env"] & Record<string, string | undefined>;
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleLeak = env.VITE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRoleLeak) return { ok: false, message: "VITE_SUPABASE_SERVICE_ROLE_KEY hairuhusiwi kwenye frontend." };
  const uErr = validateSupabaseUrl(url ?? "");
  if (uErr) return { ok: false, message: uErr };
  const kErr = validateAnonKey(key ?? "");
  if (kErr) return { ok: false, message: kErr };
  return { ok: true };
}

/**
 * Mteja mmoja wa kivinjari. Funguo kutoka Vite tu — kamwe usiweke kwenye msimbo.
 */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const url = normalizeEnvUrl(String(import.meta.env.VITE_SUPABASE_URL ?? ""));
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !key) return null;
  if (validateSupabaseUrl(url) || validateAnonKey(key)) return null;

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: { "X-Client-Info": "kmkt-portal-app-next" },
    },
    db: { schema: "public" },
  });
  return _client;
}

export function getSupabaseOrThrow(): SupabaseClient {
  const c = getSupabase();
  if (!c) {
    const v = validateSupabaseEnv();
    throw new Error(v.ok ? "Muunganisho umeshindwa." : v.message);
  }
  return c;
}

export function isSupabaseConfigured(): boolean {
  const v = validateSupabaseEnv();
  return v.ok;
}

/** Safisha singleton (hasa kwa majaribio / hot reload) */
export function resetSupabaseClientForTests(): void {
  _client = null;
}
