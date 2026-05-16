/**
 * Sera moja ya mazingira ya Supabase — Vite build, runtime, na CI.
 * Usiongeze ukaguzi wa placeholder mahali pengine; tumia exports hapa.
 */

/** Thamani salama za CI/GitHub Actions (hazina neno "placeholder" / YOUR_PROJECT_REF). */
export const CI_SUPABASE_URL = "https://kmktciunit.supabase.co";
export const CI_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttY3RjaXVuaXQifQ.VmFsaWRGb3JDaUJ1aWxkT25seU5vdEFSZWFsS2V5";

export function normalizeSupabaseEnvUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function isCiSyntheticSupabaseUrl(url: string): boolean {
  return normalizeSupabaseEnvUrl(url) === CI_SUPABASE_URL;
}

export function looksLikePlaceholderSupabaseUrl(
  raw: string,
  options?: { allowCiSynthetic?: boolean },
): boolean {
  const u = normalizeSupabaseEnvUrl(raw).toLowerCase();
  if (!u) return false;
  if (options?.allowCiSynthetic && isCiSyntheticSupabaseUrl(raw)) return false;
  return (
    u.includes("your_project_ref") ||
    u.includes("placeholder") ||
    /\/your[-_]/.test(u) ||
    u.includes("example.supabase.co")
  );
}

export function looksLikePlaceholderSupabaseKey(
  raw: string,
  options?: { allowCiSynthetic?: boolean },
): boolean {
  const k = raw.trim().toLowerCase();
  if (!k) return false;
  if (options?.allowCiSynthetic && k === CI_SUPABASE_ANON_KEY.toLowerCase()) return false;
  return (
    k.includes("your_publishable") ||
    k.includes("your_anon") ||
    k.includes("your_") ||
    k.includes("changeme") ||
    k.includes("placeholder") ||
    k.includes("dummy") ||
    k === "your_publishable_or_anon_key"
  );
}

export function validateSupabaseUrlForBuild(
  url: string,
  options?: { allowCiSynthetic?: boolean },
): string | null {
  const u = normalizeSupabaseEnvUrl(url);
  if (!u) return "VITE_SUPABASE_URL ni tupu.";
  if (looksLikePlaceholderSupabaseUrl(u, options)) {
    return "VITE_SUPABASE_URL inaonekana ni mfano — weka URL halisi ya Supabase (GitHub Secret / Vercel).";
  }
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:") return "VITE_SUPABASE_URL lazima ianze na https://";
    return null;
  } catch {
    return "VITE_SUPABASE_URL si URL sahihi.";
  }
}

export function validateSupabaseAnonKeyForBuild(
  key: string,
  options?: { allowCiSynthetic?: boolean },
): string | null {
  const k = key.trim();
  if (!k) return "VITE_SUPABASE_ANON_KEY ni tupu.";
  if (looksLikePlaceholderSupabaseKey(k, options)) {
    return "VITE_SUPABASE_ANON_KEY inaonekana ni mfano — weka funguo halisi ya anon/publishable.";
  }
  if (k.length < 20) return "VITE_SUPABASE_ANON_KEY inaonekana fupi sana.";
  if (k.toLowerCase().includes("service_role")) {
    return "Service role key hairuhusiwi kwenye frontend.";
  }
  if (k.startsWith("eyJ")) {
    const parts = k.split(".");
    if (parts.length !== 3) return "VITE_SUPABASE_ANON_KEY si JWT sahihi.";
  }
  return null;
}

export type SupabaseEnvBuildCheck = {
  ok: boolean;
  missing: string[];
  errors: string[];
  source: "secrets" | "ci-synthetic" | "local" | "unknown";
};

export function evaluateSupabaseEnvForProductionBuild(
  env: Record<string, string | undefined>,
  options?: { allowCiSynthetic?: boolean },
): SupabaseEnvBuildCheck {
  const url = String(env.VITE_SUPABASE_URL ?? "").trim();
  const key = String(env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  const missing: string[] = [];
  const errors: string[] = [];
  const allowCi = options?.allowCiSynthetic === true;

  if (!url) missing.push("VITE_SUPABASE_URL");
  if (!key) missing.push("VITE_SUPABASE_ANON_KEY");

  if (url && /localhost|127\.0\.0\.1/i.test(url)) {
    errors.push("VITE_SUPABASE_URL haiwezi kuwa localhost kwenye production build.");
  }

  const uErr = url ? validateSupabaseUrlForBuild(url, { allowCiSynthetic: allowCi }) : null;
  const kErr = key ? validateSupabaseAnonKeyForBuild(key, { allowCiSynthetic: allowCi }) : null;
  if (uErr) errors.push(uErr);
  if (kErr) errors.push(kErr);

  let source: SupabaseEnvBuildCheck["source"] = "unknown";
  if (url && key) {
    if (isCiSyntheticSupabaseUrl(url)) source = "ci-synthetic";
    else if (allowCi) source = "secrets";
    else source = "local";
  }

  return {
    ok: missing.length === 0 && errors.length === 0,
    missing,
    errors,
    source,
  };
}
