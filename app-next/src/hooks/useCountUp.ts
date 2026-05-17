import { useEffect, useState } from "react";

/** Hesabu ya kuongezeka kwa KPI za umma — laini, haijaribu ikiwa thamani haijapatikana. */
export function useCountUp(value: number | null, opts?: { durationMs?: number; enabled?: boolean }) {
  const durationMs = opts?.durationMs ?? 900;
  const enabled = opts?.enabled ?? true;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!enabled || value == null || !Number.isFinite(value)) {
      setDisplay(0);
      return;
    }
    const target = Math.max(0, Math.floor(value));
    if (target === 0) {
      setDisplay(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, enabled]);

  return display;
}
