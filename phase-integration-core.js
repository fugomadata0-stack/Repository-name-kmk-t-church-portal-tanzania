import { getSupabaseClient } from "./phase3-supabase.js";

const ERR_KEY = "kmt_integration_errors";

export function getSafeSupabase() {
  try {
    return getSupabaseClient();
  } catch (error) {
    recordIntegrationError("supabase_init_failed", error);
    return null;
  }
}

export function recordIntegrationError(action, error, extra = {}) {
  try {
    const rows = JSON.parse(localStorage.getItem(ERR_KEY) || "[]");
    rows.unshift({
      id: Date.now(),
      action,
      message: error?.message || String(error || "unknown_error"),
      at: new Date().toISOString(),
      extra,
    });
    localStorage.setItem(ERR_KEY, JSON.stringify(rows.slice(0, 300)));
  } catch (_) {
    // swallow: never crash app while logging
  }
}

/** Recent client-side integration errors (e.g. Supabase RLS or network). Newest first. */
export function getIntegrationErrors(limit = 20) {
  try {
    const rows = JSON.parse(localStorage.getItem(ERR_KEY) || "[]");
    if (!Array.isArray(rows)) return [];
    const cap = typeof limit === "number" && limit > 0 ? limit : 20;
    return rows.slice(0, cap);
  } catch (_) {
    return [];
  }
}

export function clearIntegrationErrors() {
  try {
    localStorage.removeItem(ERR_KEY);
  } catch (_) {
    // ignore
  }
}

export async function safeAsync(action, fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    recordIntegrationError(action, error);
    return fallback;
  }
}

export function safeSync(action, fn, fallback = null) {
  try {
    return fn();
  } catch (error) {
    recordIntegrationError(action, error);
    return fallback;
  }
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function installGlobalCrashGuards(context = "module") {
  window.addEventListener("error", (event) => {
    recordIntegrationError(`${context}_window_error`, event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    recordIntegrationError(`${context}_promise_rejection`, event.reason);
  });
}
