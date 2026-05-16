const inflight = new Map<string, Promise<unknown>>();

/** Ombi moja kwa funguo — epuka kupakia mara 2/3 kwa pamoja (realtime + dashibodi). */
export function dedupeInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
