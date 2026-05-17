import { useEffect } from "react";

type Options = {
  enabled?: boolean;
  /** Chini ya muda huu hakuna callback (baada ya rAF throttle). */
  minIntervalMs?: number;
};

/**
 * Scroll listener nyepesi — passive + rAF + interval cap (hakuna setState kwa kila pixel).
 */
export function useThrottledElementScroll(
  elementId: string,
  onScroll: (el: HTMLElement) => void,
  options?: Options,
): void {
  const enabled = options?.enabled ?? true;
  const minIntervalMs = options?.minIntervalMs ?? 600;

  useEffect(() => {
    if (!enabled) return;
    const el = document.getElementById(elementId);
    if (!el) return;

    let raf = 0;
    let lastRun = 0;

    const handler = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const now = Date.now();
        if (now - lastRun < minIntervalMs) return;
        lastRun = now;
        onScroll(el);
      });
    };

    el.addEventListener("scroll", handler, { passive: true });
    return () => {
      el.removeEventListener("scroll", handler);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [elementId, onScroll, enabled, minIntervalMs]);
}
