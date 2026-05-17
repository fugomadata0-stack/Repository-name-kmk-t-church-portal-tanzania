import { useEffect, useState } from "react";

/**
 * Onyesha loading UI kwa muda mfupi tu — baada ya cap, acha maudhui yaonekane (hata ikiwa bado inapakia nyuma).
 */
export function useBoundedLoading(active: boolean, maxMs: number): boolean {
  const [withinCap, setWithinCap] = useState(true);

  useEffect(() => {
    if (!active) {
      setWithinCap(true);
      return;
    }
    setWithinCap(true);
    const timer = window.setTimeout(() => setWithinCap(false), maxMs);
    return () => window.clearTimeout(timer);
  }, [active, maxMs]);

  return active && withinCap;
}
