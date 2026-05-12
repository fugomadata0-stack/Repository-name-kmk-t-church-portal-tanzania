/**
 * Anzisha Sentry kwenye uzalishaji ikiwa `VITE_SENTRY_DSN` imewekwa.
 * Paketi hupakiwa kwa njia ya dynamic ili kupunguza mzigo wa hatua ya kwanza.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn || !import.meta.env.PROD) return;

  void import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  });
}
