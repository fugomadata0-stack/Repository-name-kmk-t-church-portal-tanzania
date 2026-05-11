/**
 * Shim ya aina na bundler wakati `@sentry/react` haijasakinishwa.
 * `tsconfig` huielekeza `@sentry/react` hapa kwa `tsc`; Vite huielekeza hapa ikiwa node_modules haipo.
 * Baada ya `npm i @sentry/react`, Vite huunda paketi halisi; aina hizi zinabaki zinapatana na subset inayotumiwa.
 */
export function init(_options: {
  dsn: string;
  environment?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
}): void {}

export function captureException(_error: unknown, _hint?: { tags?: Record<string, string> }): string {
  return "";
}
