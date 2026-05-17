type FlightEntry = {
  promise: Promise<unknown>;
  generation: number;
};

const flights = new Map<string, FlightEntry>();
let globalGeneration = 0;

/**
 * Ombi moja kwa funguo — epuka kupakia mara kwa mara (auth lock, workspace, KPI).
 * `replace: true` inaanzisha ombi jipya na kuacha majibu ya zamani yasitumike.
 */
export function singleFlight<T>(
  key: string,
  fn: () => Promise<T>,
  options?: { replace?: boolean },
): Promise<T> {
  if (options?.replace) {
    globalGeneration += 1;
    flights.delete(key);
  }

  const existing = flights.get(key);
  if (existing) return existing.promise as Promise<T>;

  const generation = globalGeneration;
  const promise = fn().finally(() => {
    const cur = flights.get(key);
    if (cur?.promise === promise && cur.generation === generation) {
      flights.delete(key);
    }
  });

  flights.set(key, { promise, generation });
  return promise as Promise<T>;
}

/** Batilisha ombi linaloendelea kwa funguo (mf. scope mpya). */
export function cancelSingleFlight(keyPrefix: string): void {
  globalGeneration += 1;
  for (const key of [...flights.keys()]) {
    if (key.startsWith(keyPrefix)) flights.delete(key);
  }
}
