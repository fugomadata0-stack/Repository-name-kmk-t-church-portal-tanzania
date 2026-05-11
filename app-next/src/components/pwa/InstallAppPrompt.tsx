import { useCallback, useEffect, useRef, useState } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";

const LS_SNOOZE = "kmkt_pwa_install_snooze_until";
const LS_INSTALLED = "kmkt_pwa_installed_v1";
const FALLBACK_DELAY_MS = 4000;

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function readSnoozeUntil(): number {
  try {
    const raw = localStorage.getItem(LS_SNOOZE);
    if (!raw) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function isSnoozed(): boolean {
  return Date.now() < readSnoozeUntil();
}

function markInstalled(): void {
  try {
    localStorage.setItem(LS_INSTALLED, "1");
  } catch {
    /* ignore */
  }
}

function wasInstalled(): boolean {
  try {
    return localStorage.getItem(LS_INSTALLED) === "1";
  } catch {
    return false;
  }
}

function snooze24h(): void {
  try {
    const until = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(LS_SNOOZE, String(until));
  } catch {
    /* ignore */
  }
}

export function InstallAppPrompt() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"install" | "fallback">("install");
  const [installing, setInstalling] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const onLater = useCallback(() => {
    snooze24h();
    close();
    deferredRef.current = null;
  }, [close]);

  const onInstallClick = useCallback(async () => {
    const ev = deferredRef.current;
    if (!ev) return;
    setInstalling(true);
    try {
      await ev.prompt();
      const choice = await ev.userChoice.catch(() => ({ outcome: "dismissed" as const }));
      if (choice.outcome === "accepted") markInstalled();
    } catch {
      /* browsers may throw; stay friendly */
    } finally {
      setInstalling(false);
      deferredRef.current = null;
      close();
    }
  }, [close]);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    if (isStandaloneDisplay() || wasInstalled()) {
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (isSnoozed()) return;
      const bip = e as BeforeInstallPromptEvent;
      deferredRef.current = bip;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      setMode("install");
      setOpen(true);
    };

    const onAppInstalled = () => {
      markInstalled();
      deferredRef.current = null;
      close();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    fallbackTimerRef.current = setTimeout(() => {
      if (isSnoozed() || isStandaloneDisplay() || wasInstalled()) return;
      if (deferredRef.current) return;
      setMode("fallback");
      setOpen(true);
    }, FALLBACK_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [close]);

  if (!import.meta.env.PROD) return null;

  if (!open) return null;

  const showInstallButton = mode === "install" && deferredRef.current !== null;

  return (
    <ModalScrollLayer
      onBackdropClick={onLater}
      maxWidthClass="max-w-md"
      overlayClassName="fixed inset-0 z-[130] overflow-y-auto overflow-x-hidden bg-slate-950/60 px-3 py-4 opacity-0 backdrop-blur-[6px] animate-kmkt-pwa-backdrop sm:px-4 sm:py-10"
    >
      <div
        className="opacity-0 animate-kmkt-pwa-panel rounded-2xl border border-[#D4AF37]/45 bg-gradient-to-br from-[#071018] via-[#0f2447] to-[#0b1a33] p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kmkt-pwa-install-title"
        aria-describedby="kmkt-pwa-install-desc"
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent opacity-90" aria-hidden />

        <div className="mt-4 flex flex-col items-center gap-4 text-center sm:mt-5 sm:flex-row sm:items-start sm:gap-5 sm:text-left">
          <img
            src="/pwa-192.png"
            width={76}
            height={76}
            alt="Nembo ya KMK(T) Tanzania Portal"
            className="h-[76px] w-[76px] shrink-0 rounded-[1.1rem] shadow-lg shadow-black/30 ring-2 ring-[#D4AF37]/40"
            decoding="async"
          />
          <div className="min-w-0 flex-1">
            <h2 id="kmkt-pwa-install-title" className="text-lg font-bold tracking-tight text-white sm:text-xl">
              Sakinisha KMK(T) Portal kwenye simu au kompyuta yako
            </h2>
            <p id="kmkt-pwa-install-desc" className="mt-2 text-sm leading-relaxed text-slate-200/95">
              Tumia mfumo haraka kama app bila kufungua browser kila mara.
            </p>
          </div>
        </div>

        {!showInstallButton ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3.5 text-left text-xs leading-relaxed text-slate-200 sm:mt-5 sm:text-sm">
            <p className="font-semibold text-[#e6cc6a]">Jinsi ya kusakinisha (ikiwa kitufe hakipo):</p>
            <ul className="mt-2.5 list-disc space-y-2.5 pl-5 marker:text-[#D4AF37]/85">
              <li>
                <span className="font-medium text-white">Android (Chrome):</span> menyu ⋮ juu →{" "}
                <span className="text-slate-100">Add to Home screen</span> / <span className="text-slate-100">Sakinisha app</span>.
              </li>
              <li>
                <span className="font-medium text-white">iPhone / iPad (Safari):</span> kitufe{" "}
                <span className="text-slate-100">Share</span> → <span className="text-slate-100">Add to Home Screen</span>.
              </li>
              <li>
                <span className="font-medium text-white">Desktop (Chrome / Edge):</span> tazama ikoni ya kusakinisha kwenye upau wa anwani → bonyeza{" "}
                <span className="text-slate-100">Install</span>.
              </li>
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:mt-6 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onLater}
            disabled={installing}
            className="min-h-[44px] w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/12 disabled:opacity-50 sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
          >
            Baadaye
          </button>
          {showInstallButton ? (
            <button
              type="button"
              onClick={() => void onInstallClick()}
              disabled={installing}
              aria-busy={installing}
              className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-[#c9a227] to-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-[#0a1628] shadow-md shadow-black/25 transition hover:brightness-105 disabled:opacity-60 sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fef9e7]"
            >
              {installing ? "Inasakinisha…" : "Sakinisha App"}
            </button>
          ) : null}
        </div>
      </div>
    </ModalScrollLayer>
  );
}
