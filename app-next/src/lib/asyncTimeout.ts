/**
 * Muda wa juu kwa ahadi — epuka loading isiyoisha (Supabase polepole / ombi lililosimama).
 */
export class AsyncTimeoutError extends Error {
  readonly label?: string;

  constructor(label?: string) {
    super(label ? `timeout:${label}` : "timeout");
    this.name = "TimeoutError";
    this.label = label;
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new AsyncTimeoutError(label)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function runWithTimeout<T>(fn: () => Promise<T>, ms: number, label?: string): Promise<T> {
  return withTimeout(fn(), ms, label);
}
