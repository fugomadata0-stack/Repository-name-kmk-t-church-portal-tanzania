import { memo, useEffect, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { NotificationBell } from "../notifications/NotificationBell";
import { ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface Props {
  /** Jina la moduli (kichwa kikuu). */
  moduleLabel: string;
  /** Kichwa kidogo — submodule au sehemu ya sasa. */
  submoduleLabel?: string;
  canBack?: boolean;
  onBack?: () => void;
  onOpenMobileSidebar: () => void;
  /** Tumia kusogeza moduli programu (mf. taarifa kutoka bell). */
  onNavigateToModule?: (moduleKey: string, submodule?: string) => void;
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

function TopbarInner({
  moduleLabel,
  submoduleLabel,
  canBack = false,
  onBack,
  onOpenMobileSidebar,
  onNavigateToModule,
  sidebarCollapsed,
  onToggleSidebarCollapse,
}: Props) {
  const { supabaseReady, authUser, portalProfile, role, signOut, scopeBadgeLabel } = usePortal();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
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

  useEffect(() => {
    if (!canBack || !onBack) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canBack, onBack]);

  const showSubmodule =
    submoduleLabel &&
    submoduleLabel.trim() !== "" &&
    submoduleLabel.trim() !== moduleLabel.trim();

  return (
    <header className="portal-chrome-topbar">
      <div className="flex flex-col gap-1.5 px-2 py-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1.5 sm:px-3 sm:py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-800 hover:bg-slate-50 lg:hidden"
            onClick={onOpenMobileSidebar}
            aria-label="Fungua menyu"
          >
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          {onToggleSidebarCollapse ? (
            <button
              type="button"
              className="hidden shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-800 hover:bg-slate-50 lg:flex"
              onClick={onToggleSidebarCollapse}
              aria-label={sidebarCollapsed ? "Panua menyu ya kando" : "Ficha menyu ya kando"}
              title={sidebarCollapsed ? "Panua menyu" : "Ficha menyu"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
              ) : (
                <PanelLeftClose className="h-5 w-5" strokeWidth={2} aria-hidden />
              )}
            </button>
          ) : null}
          {canBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="portal-chrome-back-btn flex shrink-0 items-center gap-1 rounded-lg border border-amber-200/90 bg-amber-50 px-2 py-1.5 text-[#0f1e46] shadow-sm hover:bg-amber-100"
              aria-label="Rudi nyuma (Alt+←)"
              title="Rudi nyuma (Alt+←)"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" strokeWidth={2.25} aria-hidden />
              <span className="text-xs font-bold leading-none sm:text-sm">Rudi</span>
            </button>
          ) : null}
          <div className="portal-chrome-topbar__title-block min-w-0 flex-1">
            <h1 className="min-w-0 hyphens-auto break-words text-base font-bold leading-snug text-[#0f1e46] sm:text-lg">
              {moduleLabel}
            </h1>
            <p
              className={`portal-chrome-topbar__subtitle mt-0.5 truncate text-xs font-medium text-slate-600 ${
                showSubmodule ? "" : "invisible"
              }`}
              aria-hidden={!showSubmodule}
            >
              {showSubmodule ? submoduleLabel : "\u00a0"}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-2 sm:ml-auto sm:max-w-none">
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
          <span className="hidden max-w-[200px] truncate text-xs text-slate-600 md:inline" title={authUser?.email ?? ""}>
            {portalProfile?.full_name?.trim() || authUser?.email || "—"}
          </span>
          <span
            className="hidden max-w-[220px] truncate rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-950 sm:inline"
            title={scopeBadgeLabel}
          >
            {scopeBadgeLabel}
          </span>
          <span className="shrink-0 rounded-full bg-gradient-to-r from-blue-900 to-blue-950 px-2.5 py-1 text-xs font-semibold text-amber-100">
            {role}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => void signOut()}
          >
            Toka
          </button>
        </div>
      </div>
    </header>
  );
}

export const Topbar = memo(TopbarInner);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
