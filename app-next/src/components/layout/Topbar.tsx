import { usePortal } from "../../context/PortalContext";
import { NotificationBell } from "../notifications/NotificationBell";
import { useEffect, useState } from "react";

interface Props {
  title: string;
  onOpenMobileSidebar: () => void;
  /** Tumia kusogeza moduli programu (mf. taarifa kutoka bell). */
  onNavigateToModule?: (moduleKey: string, submodule?: string) => void;
}

export function Topbar({ title, onOpenMobileSidebar, onNavigateToModule }: Props) {
  const { supabaseReady, authUser, portalProfile, role, signOut } = usePortal();
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
  };
  return (
    <header className="sticky top-0 z-30 border-b border-amber-200/90 bg-white/85 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <button type="button" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm lg:hidden" onClick={onOpenMobileSidebar} aria-label="Fungua menyu">
          ☰
        </button>
        <h2 className="min-w-0 flex-1 truncate text-base font-bold text-[#0f1e46] sm:text-lg">{title}</h2>
        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {onNavigateToModule ? (
            <NotificationBell
              onOpenFullPage={() => {
                onNavigateToModule("notifications", "Zote");
              }}
            />
          ) : null}
          {installEvent && !installed ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await installEvent.prompt();
                  await installEvent.userChoice;
                  setInstallEvent(null);
                } catch {
                  // ignore prompt errors
                }
              }}
              className="rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-2 py-1.5 text-xs font-semibold text-[#0B1F3A]"
            >
              Install App
            </button>
          ) : null}
          <span
            className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline ${
              supabaseReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
            }`}
            title="Hali ya muunganisho"
          >
            {supabaseReady ? "Supabase" : "Local"}
          </span>
          <button type="button" onClick={goBack} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-50">
            ← Rudi
          </button>
          <span className="hidden max-w-[200px] truncate text-xs text-slate-600 md:inline" title={authUser?.email ?? ""}>
            {portalProfile?.full_name?.trim() || authUser?.email || "—"}
          </span>
          <span className="rounded-full bg-gradient-to-r from-blue-900 to-blue-950 px-2.5 py-1 text-xs font-semibold text-amber-100">{role}</span>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => void signOut()}
          >
            Toka
          </button>
        </div>
      </div>
    </header>
  );
}
