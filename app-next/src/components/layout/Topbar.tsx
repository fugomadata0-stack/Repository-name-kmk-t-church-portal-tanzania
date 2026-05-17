import { usePortal } from "../../context/PortalContext";
import { NotificationBell } from "../notifications/NotificationBell";
import { useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface Props {
  title: string;
  onOpenMobileSidebar: () => void;
  /** Tumia kusogeza moduli programu (mf. taarifa kutoka bell). */
  onNavigateToModule?: (moduleKey: string, submodule?: string) => void;
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export function Topbar({
  title,
  onOpenMobileSidebar,
  onNavigateToModule,
  sidebarCollapsed,
  onToggleSidebarCollapse,
}: Props) {
  const { supabaseReady, authUser, portalProfile, role, signOut, scopeBadgeLabel } = usePortal();
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
  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-amber-200/80 bg-white/90 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md">
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
          <h2 className="min-w-0 flex-1 hyphens-auto break-words text-base font-bold leading-snug text-[#0f1e46] sm:text-lg">
            {title}
          </h2>
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
          <span className="shrink-0 rounded-full bg-gradient-to-r from-blue-900 to-blue-950 px-2.5 py-1 text-xs font-semibold text-amber-100">{role}</span>
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
