import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ModuleItem } from "../../types";

interface Props {
  modules: ModuleItem[];
  activeModule: string;
  activeSubmodule: string;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  onSelect: (moduleKey: string, submodule: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar(props: Props) {
  const activeLabel =
    props.modules.find((m) => m.key === props.activeModule)?.label ?? props.activeModule;

  const fullAside = (
    <aside className="h-full max-h-[100dvh] w-[min(92vw,20rem)] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] border-r border-amber-200/70 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] text-slate-100 sm:w-72 lg:w-80">
      <div className="flex items-start justify-between gap-2">
        <h1 className="flex-1 rounded-xl bg-white/5 p-3 text-sm font-bold tracking-wide">
          KMK(T) Tanzania Website
        </h1>
        {props.onToggleCollapse ? (
          <button
            type="button"
            onClick={props.onToggleCollapse}
            className="mt-1 shrink-0 rounded-lg border border-white/15 bg-white/10 p-2 text-amber-100 hover:bg-white/15"
            aria-label="Ficha menyu ya kando"
            title="Ficha menyu"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        {props.modules.map((m) => {
          const active = props.activeModule === m.key;
          return (
            <div key={m.key} className="rounded-xl border border-white/10 bg-white/5">
              <button
                onClick={() => props.onToggle(m.key)}
                className={`w-full rounded-xl bg-gradient-to-r ${m.color} px-3 py-2.5 text-left text-sm font-semibold ${active ? "ring-2 ring-amber-300" : ""}`}
              >
                {m.label}
              </button>
              {props.expanded[m.key] && (
                <div className="space-y-1 p-2">
                  {m.submodules.map((s) => (
                    <button
                      key={s}
                      onClick={() => props.onSelect(m.key, s)}
                      className={`w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-white/10 ${
                        props.activeSubmodule === s && props.activeModule === m.key
                          ? "bg-amber-400/20 text-amber-100"
                          : ""
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );

  const desktopAside =
    props.collapsed && props.onToggleCollapse ? (
      <aside className="flex h-full max-h-[100dvh] w-14 shrink-0 flex-col items-center border-r border-amber-200/70 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 py-3 text-slate-100">
        <button
          type="button"
          onClick={props.onToggleCollapse}
          className="rounded-lg border border-white/15 bg-white/10 p-2 text-amber-100 hover:bg-white/15"
          aria-label="Panua menyu ya kando"
          title="Panua menyu"
        >
          <PanelLeftOpen className="h-4 w-4" aria-hidden />
        </button>
        <span
          className="mt-3 max-h-[40vh] truncate text-[10px] font-semibold uppercase tracking-wide text-amber-200/90 [writing-mode:vertical-rl]"
          title={activeLabel}
        >
          {activeLabel}
        </span>
      </aside>
    ) : (
      fullAside
    );

  return (
    <>
      <div className="hidden shrink-0 lg:block">{desktopAside}</div>
      {props.mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Menyu ya moduli">
          <div className="absolute inset-0 bg-black/40" onClick={props.onCloseMobile} />
          <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0">{fullAside}</div>
        </div>
      )}
    </>
  );
}
