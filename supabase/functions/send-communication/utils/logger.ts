/** Structured logs for Edge Function (visible in Supabase function logs). */

export function logInfo(msg: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", msg, ...meta, at: new Date().toISOString() }));
}

export function logWarn(msg: string, meta?: Record<string, unknown>) {
  console.warn(JSON.stringify({ level: "warn", msg, ...meta, at: new Date().toISOString() }));
}

export function logError(msg: string, err: unknown, meta?: Record<string, unknown>) {
  const detail =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { raw: String(err) };
  console.error(JSON.stringify({ level: "error", msg, err: detail, ...meta, at: new Date().toISOString() }));
}
