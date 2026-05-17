import { useEffect, useRef, useState } from "react";

/** Hesabu ya kuongezeka kwa KPI za umma — haijaribu kurudisha 0 wakati thamani inasasishwa tu. */
export function useCountUp(value: number | null, opts?: { durationMs?: number; enabled?: boolean }) {
  const durationMs = opts?.durationMs ?? 900;
  const enabled = opts?.enabled ?? true;
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (!enabled || value == null || !Number.isFinite(value)) {
      setDisplay(0);
      displayRef.current = 0;
      return;
    }
    const target = Math.max(0, Math.floor(value));
    const startVal = displayRef.current;
    if (target === startVal) return;
    if (target === 0) {
      setDisplay(0);
      displayRef.current = 0;
      return;
    }
    const from = Math.min(startVal, target);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (target - from) * eased);
      setDisplay(next);
      displayRef.current = next;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, enabled]);

  return display;
}
