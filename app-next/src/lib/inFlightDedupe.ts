import { withTimeout } from "./asyncTimeout";

const inflight = new Map<string, Promise<unknown>>();

type DedupeOptions = { timeoutMs?: number };

/** Ombi moja kwa funguo — epuka kupakia mara 2/3 kwa pamoja (realtime + dashibodi). */
export function dedupeInFlight<T>(key: string, fn: () => Promise<T>, options?: DedupeOptions): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const run = () => {
    const work = fn();
    return options?.timeoutMs ? withTimeout(work, options.timeoutMs, key) : work;
  };
  const promise = run().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}