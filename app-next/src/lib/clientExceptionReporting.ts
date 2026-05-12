/**
 * Ripoti kwa Sentry bila kuunganisha @sentry/react kwenye parcel kuu — hupakia chunk ya sentry wakati wa hitaji tu.
 */
export function captureClientException(err: unknown, context?: string): void {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN?.trim()) return;
  void import("@sentry/react").then((Sentry) => {
    const ex = err instanceof Error ? err : new Error(String(err ?? "unknown"));
    Sentry.captureException(ex, context ? { tags: { portal_context: context.slice(0, 200) } } : undefined);
  });
}
