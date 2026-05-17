import { useEffect, useRef, useState } from "react";

type Options = {
  rootMargin?: string;
  threshold?: number;
  /** Onyesha mara moja bila kusubiri scroll (mf. moduli iliyofichwa). */
  disabled?: boolean;
};

/** IntersectionObserver — pakia chati/maudhui nzito tu inapoonekana. */
export function useInViewport<T extends HTMLElement = HTMLDivElement>(options?: Options): {
  ref: (node: T | null) => void;
  inView: boolean;
} {
  const nodeRef = useRef<T | null>(null);
  const ref = (node: T | null) => {
    nodeRef.current = node;
  };
  const [inView, setInView] = useState(Boolean(options?.disabled));

  useEffect(() => {
    if (options?.disabled) {
      setInView(true);
      return;
    }
    const el = nodeRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: options?.rootMargin ?? "120px 0px", threshold: options?.threshold ?? 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [options?.disabled, options?.rootMargin, options?.threshold]);

  return { ref, inView };
}
