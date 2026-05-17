/**
 * Unganisha matukio mengi ya Supabase Realtime katika msongozo mmoja — epuka flicker na reload storms.
 */
export function coalesceRealtimeCallback(handler: () => void, delayMs = 480): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        handler();
      } catch (e) {
        console.error("[realtime-coalesce]", e);
      }
    }, delayMs);
  };
}
