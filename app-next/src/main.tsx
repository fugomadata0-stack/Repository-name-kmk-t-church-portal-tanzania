import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { PortalProvider } from "./context/PortalContext";
import "./styles/global.scss";

function scheduleSentryInit(): void {
  const run = () => void import("./lib/sentryInit").then((m) => m.initSentry());
  if (typeof requestIdleCallback !== "undefined") requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 0);
}
scheduleSentryInit();

window.addEventListener("unhandledrejection", (ev) => {
  const r = ev.reason;
  const msg =
    typeof r === "object" && r !== null && "message" in r
      ? String((r as { message?: unknown }).message ?? "")
      : String(r ?? "");
  const chunkFailed =
    import.meta.env.PROD &&
    /loading chunk \d+ failed|failed to fetch dynamically imported module|importing a module script failed|chunk load error/i.test(
      msg
    );
  if (chunkFailed) {
    const k = "kmkt_chunk_reload_once_v1";
    if (!sessionStorage.getItem(k)) {
      sessionStorage.setItem(k, "1");
      ev.preventDefault();
      window.location.reload();
      return;
    }
  }
  if (import.meta.env.DEV) {
    console.error("[unhandledrejection]", ev.reason);
  } else {
    console.error("[unhandledrejection]");
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  console.error("[portal] Kipengele cha #root hakijapatikana — haiwezi kuanzisha programu.");
  const wrap = document.createElement("div");
  wrap.style.padding = "2rem";
  wrap.style.fontFamily = "system-ui,sans-serif";
  wrap.style.background = "#f8fafc";
  wrap.style.color = "#0f172a";
  const p1 = document.createElement("p");
  p1.style.fontWeight = "600";
  p1.style.margin = "0 0 0.5rem";
  p1.textContent = "Portal haiwezi kupakia (#root haipo).";
  const p2 = document.createElement("p");
  p2.style.margin = "0";
  p2.style.fontSize = "0.9rem";
  p2.textContent = "Angalia index.html au usanidi wa Vite.";
  wrap.appendChild(p1);
  wrap.appendChild(p2);
  document.body.appendChild(wrap);
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <PortalProvider>
          <App />
        </PortalProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        if (import.meta.env.DEV) console.warn("[pwa] Service worker registration failed", err);
      });
      return;
    }

    // In dev, stale SW caches can serve old chunks and trigger invalid hook/runtime mismatches.
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister();
    });
    if ("caches" in window) {
      void caches.keys().then((keys) => {
        for (const key of keys) void caches.delete(key);
      });
    }
  });
}