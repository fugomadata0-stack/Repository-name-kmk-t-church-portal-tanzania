import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
const SUPABASE_FETCH_TIMEOUT_MS = 15000;
const SUPABASE_FETCH_RETRIES = 2;

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

function shouldRetryNetworkError(err: unknown): boolean {
  const msg = String((err as { message?: unknown } | null)?.message ?? err ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("connection reset") ||
    msg.includes("err_connection_reset") ||
    msg.includes("err_quic_protocol_error")
  );
}

function canRetryRequest(input: RequestInfo | URL, init: RequestInit | undefined): boolean {
  const method = String(init?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return true;
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  // Auth token refresh POST is safe to retry and helps unstable connections.
  return method === "POST" && url.includes("/auth/v1/token");
}

async function fetchWithTimeoutAndRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Hakuna intaneti kwa sasa.");
  }

  const retryable = canRetryRequest(input, init);
  const maxAttempts = retryable ? SUPABASE_FETCH_RETRIES + 1 : 1;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
    try {
      const merged: RequestInit = { ...init, signal: controller.signal };
      const res = await fetch(input, merged);
      window.clearTimeout(timer);
      if (res.ok || !retryable || attempt >= maxAttempts) return res;
      if (res.status < 500 && res.status !== 408 && res.status !== 429) return res;
      await new Promise((r) => window.setTimeout(r, 250 * attempt));
    } catch (err) {
      window.clearTimeout(timer);
      lastErr = err;
      if (!retryable || attempt >= maxAttempts || !shouldRetryNetworkError(err)) {
        throw err;
      }
      await new Promise((r) => window.setTimeout(r, 300 * attempt));
    }
  }

  throw lastErr ?? new Error("Mtandao haupatikani kwa sasa.");
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
      fetch: fetchWithTimeoutAndRetry,
    },
    db: { schema: "public" },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
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
