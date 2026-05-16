import { modules } from "../../data/portalModules";
import { normalizeDashboardSubmodule } from "../../lib/dashboardSubmodules";

function navigateDashboard(submodule: string) {
  window.dispatchEvent(
    new CustomEvent("kmt-portal-navigate", {
      detail: { moduleKey: "dashboard", submodule },
    })
  );
}

/** Vipengele vya Dashibodi Kuu — kubofya haraka bila kutafuta menyu. */
export function DashboardSubnav({ active }: { active?: string }) {
  const subs = modules.find((m) => m.key === "dashboard")?.submodules ?? [];
  const current = normalizeDashboardSubmodule(active);

  return (
    <nav
      className="rounded-2xl border border-[#123C69]/40 bg-gradient-to-r from-[#0B1F3A] via-[#102a4a] to-[#123C69] p-3 shadow-lg sm:p-4"
      aria-label="Sehemu za Dashibodi"
    >
      <p className="mb-2.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/95 sm:text-left sm:text-[11px]">
        Dashibodi — chagua sehemu
      </p>
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
        {subs.map((label) => {
          const isActive = current === label;
          return (
            <button
              key={label}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => navigateDashboard(label)}
              className={`min-h-[44px] rounded-full px-3.5 py-2 text-center text-xs font-semibold leading-snug transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:min-h-0 sm:px-4 sm:text-sm ${
                isActive
                  ? "bg-gradient-to-r from-amber-400 to-[#D4AF37] text-[#0B1F3A] shadow-md ring-2 ring-white/40"
                  : "border border-white/25 bg-white/10 text-white hover:bg-white/18 hover:ring-1 hover:ring-amber-300/50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
