import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runSupabaseFetchQueued } from "./supabaseFetchQueue";
import {
  normalizeSupabaseEnvUrl,
  validateSupabaseAnonKeyForBuild,
  validateSupabaseUrlForBuild,
} from "./supabaseEnvPolicy";

let _client: SupabaseClient | null = null;
/** Funguo na asili zilizofungwa wakati mteja unapotengenezwa — hutumika na fetch guard (hakuna ombi bila apikey). */
let _boundSupabaseOrigin = "";
let _boundSupabaseAnonKey = "";
const SUPABASE_FETCH_RETRIES = 2;
const REALTIME_ENABLED_RAW = String(import.meta.env.VITE_SUPABASE_REALTIME_ENABLED ?? "true").trim().toLowerCase();

function validateSupabaseUrl(url: string): string | null {
  return validateSupabaseUrlForBuild(url);
}

function validateAnonKey(key: string): string | null {
  return validateSupabaseAnonKeyForBuild(key);
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function resolvedSupabaseCredentials(): { origin: string; key: string } | null {
  const origin = _boundSupabaseOrigin || normalizeSupabaseEnvUrl(String(import.meta.env.VITE_SUPABASE_URL ?? ""));
  const key = (_boundSupabaseAnonKey || String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")).trim();
  if (!origin || !key || validateSupabaseUrl(origin) || validateAnonKey(key)) return null;
  return { origin, key };
}

/** Ombi la REST/Auth/Storage kwa mradi huu (pamoja na custom domain inayolingana). */
function isSupabaseProjectRequest(urlStr: string, projectOrigin: string): boolean {
  try {
    const u = new URL(urlStr);
    const base = new URL(projectOrigin);
    if (u.origin === base.origin) return true;
    const ref = base.hostname.split(".")[0];
    return u.hostname.endsWith(".supabase.co") && u.hostname.startsWith(`${ref}.`);
  } catch {
    return urlStr.startsWith(projectOrigin);
  }
}

/**
 * Rudisha URL + init iliyounganishwa — epuka kupoteza header/body wakati `fetch(Request, init)`.
 * Huongeza `apikey` kwa kila ombi la Supabase (sababu kuu ya "No API key found").
 */
function normalizeSupabaseFetch(input: RequestInfo | URL, init?: RequestInit): { url: string; init: RequestInit } {
  const creds = resolvedSupabaseCredentials();
  const url = resolveRequestUrl(input);
  let method =
    init?.method ??
    (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
  const headers = new Headers(init?.headers);
  let body: BodyInit | null | undefined = init?.body;

  if (typeof Request !== "undefined" && input instanceof Request) {
    input.headers.forEach((value, key) => {
      if (!headers.has(key)) headers.set(key, value);
    });
    if (body === undefined) body = input.body;
    if (!init?.method) method = input.method;
  }

  if (creds && isSupabaseProjectRequest(url, creds.origin)) {
    if (!headers.has("apikey")) headers.set("apikey", creds.key);
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${creds.key}`);
  }

  return {
    url,
    init: {
      ...init,
      method,
      headers,
      body,
    },
  };
}

function shouldRetryNetworkError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  const msg = String((err as { message?: unknown } | null)?.message ?? err ?? "").toLowerCase();
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("signal is aborted") ||
    msg.includes("connection reset") ||
    msg.includes("err_connection_reset") ||
    msg.includes("err_quic_protocol_error")
  );
}

function canRetryRequest(input: RequestInfo | URL, init: RequestInit | undefined): boolean {
  const method = String(
    init?.method ??
      (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")
  ).toUpperCase();
  if (method === "GET" || method === "HEAD") return true;
  const url = resolveRequestUrl(input);
  // Auth token refresh POST is safe to retry and helps unstable connections.
  return method === "POST" && url.includes("/auth/v1/token");
}

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Hakuna intaneti kwa sasa.");
  }

  const retryable = canRetryRequest(input, init);
  const maxAttempts = retryable ? SUPABASE_FETCH_RETRIES + 1 : 1;
  let lastErr: unknown = null;
  const normalized = normalizeSupabaseFetch(input, init);

  return runSupabaseFetchQueued(async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const res = await fetch(normalized.url, normalized.init);
        if (res.ok || !retryable || attempt >= maxAttempts) return res;
        if (res.status < 500 && res.status !== 408 && res.status !== 429) return res;
        await new Promise((r) => window.setTimeout(r, 250 * attempt));
      } catch (err) {
        lastErr = err;
        if (!retryable || attempt >= maxAttempts || !shouldRetryNetworkError(err)) {
          throw err;
        }
        await new Promise((r) => window.setTimeout(r, 300 * attempt));
      }
    }
    throw lastErr ?? new Error("Mtandao haupatikani kwa sasa.");
  });
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
  const url = normalizeSupabaseEnvUrl(String(import.meta.env.VITE_SUPABASE_URL ?? ""));
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !key) return null;
  if (validateSupabaseUrl(url) || validateAnonKey(key)) return null;

  _boundSupabaseOrigin = url;
  _boundSupabaseAnonKey = key;

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      headers: {
        apikey: key,
        "X-Client-Info": "kmkt-portal-app-next",
      },
      fetch: fetchWithRetry,
    },
    db: { schema: "public" },
    realtime: {
      params: { eventsPerSecond: 12 },
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

/**
 * Realtime (websocket) kwa postgres_changes — chaguomsingi imewashwa.
 * Zima kwa mazingira yenye vizuizi vya websocket: VITE_SUPABASE_REALTIME_ENABLED=false
 */
export function isSupabaseRealtimeEnabled(): boolean {
  return (
    REALTIME_ENABLED_RAW !== "false" &&
    REALTIME_ENABLED_RAW !== "0" &&
    REALTIME_ENABLED_RAW !== "off" &&
    REALTIME_ENABLED_RAW !== "no"
  );
}

/** Asili ya mradi (kwa diagnostics / upload guards). */
export function getSupabaseProjectOrigin(): string {
  return _boundSupabaseOrigin || normalizeSupabaseEnvUrl(String(import.meta.env.VITE_SUPABASE_URL ?? ""));
}

/** Safisha singleton (hasa kwa majaribio / hot reload) */
export function resetSupabaseClientForTests(): void {
  _client = null;
  _boundSupabaseOrigin = "";
  _boundSupabaseAnonKey = "";
  void import("./authSessionCache").then((m) => m.clearAuthSessionCache());
}
