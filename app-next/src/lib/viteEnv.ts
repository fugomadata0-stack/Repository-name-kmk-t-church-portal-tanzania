/**
 * Typed accessors for Vite `import.meta.env` (browser bundle only).
 * Usitumie `process.env` kwenye `src/` — Vite haibadilishi thamani hizo kwenye kivinjari.
 */

const meta = import.meta.env;

export const appMode = meta.MODE;
export const isDev = meta.DEV;
export const isProd = meta.PROD;

/** Trimmed VITE_* string; keys not set become `""`. */
export function viteEnv(key: keyof ImportMetaEnv): string {
  return String(meta[key] ?? "").trim();
}

/** Case-insensitive match against a single active value (default `"true"`). */
export function viteEnvFlag(key: keyof ImportMetaEnv, active = "true"): boolean {
  return viteEnv(key).toLowerCase() === active.toLowerCase();
}

export function supabaseRealtimeEnabled(): boolean {
  const raw = String(meta.VITE_SUPABASE_REALTIME_ENABLED ?? "true").trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(raw);
}

export function readSupabaseBrowserEnv(): {
  url: string;
  anonKey: string;
  serviceRoleLeak: string;
} {
  const extended = meta as ImportMetaEnv & Record<string, string | undefined>;
  return {
    url: viteEnv("VITE_SUPABASE_URL"),
    anonKey: viteEnv("VITE_SUPABASE_ANON_KEY"),
    serviceRoleLeak: String(extended.VITE_SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
  };
}
