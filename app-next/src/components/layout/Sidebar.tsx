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
}

export function Sidebar(props: Props) {
  const content = (
    <aside className="h-full w-[86vw] max-w-80 overflow-y-auto border-r border-amber-200 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 p-3 text-slate-100 sm:w-80">
      <h1 className="rounded-xl bg-white/5 p-3 text-sm font-bold tracking-wide">KMK(T) Internal Portal</h1>
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
                      className={`w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-white/10 ${props.activeSubmodule === s ? "bg-amber-400/20 text-amber-100" : ""}`}
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

  return (
    <>
      <div className="hidden lg:block">{content}</div>
      {props.mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={props.onCloseMobile} />
          <div className="relative h-full">{content}</div>
        </div>
      )}
    </>
  );
}
