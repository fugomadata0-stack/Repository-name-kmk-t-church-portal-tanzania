import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { EXECUTIVE_TOP_MENU, type ExecutiveMenuItem } from "../../data/executiveMenuConfig";
import { coerceSubmoduleForModule } from "../../lib/dashboardSubmodules";

const MENU_FRAME_TONES = [
  "border-emerald-400/50 bg-emerald-600/25 text-emerald-50 shadow-sm shadow-emerald-900/25 hover:bg-emerald-500/35",
  "border-sky-400/50 bg-sky-600/25 text-sky-50 shadow-sm shadow-sky-900/25 hover:bg-sky-500/35",
  "border-amber-400/55 bg-amber-500/25 text-amber-50 shadow-sm shadow-amber-900/30 hover:bg-amber-400/35",
  "border-violet-400/50 bg-violet-600/25 text-violet-50 shadow-sm shadow-violet-900/25 hover:bg-violet-500/35",
  "border-rose-400/50 bg-rose-600/25 text-rose-50 shadow-sm shadow-rose-900/25 hover:bg-rose-500/35",
  "border-cyan-400/50 bg-cyan-600/25 text-cyan-50 shadow-sm shadow-cyan-900/25 hover:bg-cyan-500/35",
  "border-orange-400/50 bg-orange-600/25 text-orange-50 shadow-sm shadow-orange-900/25 hover:bg-orange-500/35",
  "border-indigo-400/50 bg-indigo-600/25 text-indigo-50 shadow-sm shadow-indigo-900/25 hover:bg-indigo-500/35",
] as const;

interface Props {
  activeModule: string;
  activeSubmodule: string;
  canViewModule: (moduleKey: string) => boolean;
  onNavigate: (moduleKey: string, submodule: string) => void;
}

function ExecutiveMenuBarInner({ activeModule, activeSubmodule, canViewModule, onNavigate }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(
    () => EXECUTIVE_TOP_MENU.filter((item) => canViewModule(item.moduleKey)),
    [canViewModule],
  );

  const isActive = useCallback(
    (item: ExecutiveMenuItem) => {
      if (item.moduleKey !== activeModule) return false;
      const sub = item.submodule ? coerceSubmoduleForModule(item.moduleKey, item.submodule) : "";
      if (!sub) return true;
      return coerceSubmoduleForModule(item.moduleKey, activeSubmodule) === sub;
    },
    [activeModule, activeSubmodule],
  );

  const navigateItem = useCallback(
    (item: ExecutiveMenuItem, submodule?: string) => {
      const sm = submodule ?? item.submodule ?? "";
      onNavigate(item.moduleKey, sm);
      setOpenId(null);
    },
    [onNavigate],
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (visibleItems.length === 0) return null;

  return (
    <nav ref={barRef} aria-label="Menyu kuu ya kiwango cha juu" className="portal-chrome-menu">
      <div className="portal-chrome-menu__track">
        {visibleItems.map((item, index) => {
          const active = isActive(item);
          const hasChildren = Boolean(item.children?.length);
          const open = openId === item.id;
          const frame = MENU_FRAME_TONES[index % MENU_FRAME_TONES.length];

          return (
            <div key={item.id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (hasChildren) setOpenId(open ? null : item.id);
                  else navigateItem(item);
                }}
                className={`portal-chrome-menu__btn flex items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-2 text-[11px] font-semibold sm:px-3 sm:text-xs ${frame} ${
                  active ? "ring-2 ring-amber-300/90 ring-offset-1 ring-offset-[#0f2744] brightness-110" : ""
                }`}
                aria-expanded={hasChildren ? open : undefined}
                aria-haspopup={hasChildren ? "menu" : undefined}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
                {hasChildren ? (
                  <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
                ) : null}
              </button>
              {hasChildren ? (
                <div
                  role="menu"
                  className={`portal-chrome-menu__dropdown absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-white/15 bg-[#0f2744] py-1 shadow-lg ${
                    open ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
                  }`}
                  aria-hidden={!open}
                >
                  {item.children!.map((child) => (
                    <button
                      key={child.submodule}
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-xs text-blue-50 transition-colors hover:bg-amber-400/15 hover:text-amber-100"
                      onClick={() => navigateItem(item, child.submodule)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export const ExecutiveMenuBar = memo(ExecutiveMenuBarInner);
