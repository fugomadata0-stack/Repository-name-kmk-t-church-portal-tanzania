/**
 * Kikomo cha ombi za Supabase zinazoendeshwa kwa wakati mmoja — kuepuka AbortError
 * kutokana na msongamano wa muunganisho (browser ~6 kwa host).
 */
const MAX_CONCURRENT = 5;
let active = 0;
const waiters: Array<() => void> = [];

function releaseSlot(): void {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      active += 1;
      resolve();
    });
  });
}

export function runSupabaseFetchQueued<T>(fn: () => Promise<T>): Promise<T> {
  return acquireSlot().then(() =>
    fn().finally(() => {
      releaseSlot();
    })
  );
}
