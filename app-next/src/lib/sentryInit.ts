import * as Sentry from "@sentry/react";

/**
 * Anzisha Sentry kwenye uzalishaji ikiwa `VITE_SENTRY_DSN` imewekwa.
 * Ikiwa `@sentry/react` haipo kwenye node_modules, Vite inatumia shim (hakuna kitendo).
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn || !import.meta.env.PROD) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

/** Ripoti kwa Sentry (au shim) — tumia kabla ya kuonyesha toast ya makosa. */
export function captureClientException(err: unknown, context?: string): void {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN?.trim()) return;
  const ex = err instanceof Error ? err : new Error(String(err ?? "unknown"));
  Sentry.captureException(ex, context ? { tags: { portal_context: context.slice(0, 200) } } : undefined);
}
