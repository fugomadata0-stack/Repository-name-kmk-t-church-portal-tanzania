import { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import type { MasterBranchScope } from "../../services/masterBranchEngineService";
import { navigateToMasterBranchEngine } from "../../lib/navigateToMasterBranchEngine";
import type { DayosisiRecord, JimboRecord, PortalDirectoryProfile, TawiRecord } from "../../types";

const SCOPE_OPTIONS: { value: MasterBranchScope; label: string }[] = [
  { value: "kitaifa", label: "KMK(T) — Kitaifa" },
  { value: "dayosisi", label: "Dayosisi" },
  { value: "jimbo", label: "Jimbo" },
  { value: "tawi", label: "Tawi / Kituo" },
];

type Props = {
  scope: MasterBranchScope;
  entityId: string;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  portalProfile: PortalDirectoryProfile | null;
  onScopeChange: (scope: MasterBranchScope, entityId: string) => void;
};

function filterByProfile<T extends { id: string }>(
  rows: T[],
  allowedId: string | null | undefined,
): T[] {
  if (!allowedId?.trim()) return rows;
  return rows.filter((r) => r.id === allowedId.trim());
}

export function BranchEngineScopeBar({
  scope,
  entityId,
  dayosisi,
  majimbo,
  matawi,
  portalProfile,
  onScopeChange,
}: Props) {
  const profileDayosisi = portalProfile?.dayosisi_scope?.trim() || "";
  const profileJimbo = portalProfile?.jimbo_scope?.trim() || "";
  const profileTawi = portalProfile?.tawi_scope?.trim() || "";

  const visibleScopes = useMemo(() => {
    if (profileTawi) return SCOPE_OPTIONS.filter((s) => s.value === "tawi");
    if (profileJimbo) return SCOPE_OPTIONS.filter((s) => s.value === "jimbo" || s.value === "tawi");
    if (profileDayosisi) {
      return SCOPE_OPTIONS.filter((s) => s.value !== "kitaifa");
    }
    return SCOPE_OPTIONS;
  }, [profileDayosisi, profileJimbo, profileTawi]);

  const entityOptions = useMemo(() => {
    if (scope === "kitaifa") return [];
    if (scope === "dayosisi") {
      return filterByProfile(dayosisi, profileDayosisi || undefined).map((d) => ({
        id: d.id,
        label: d.jina,
      }));
    }
    if (scope === "jimbo") {
      let rows = majimbo;
      if (profileDayosisi) rows = rows.filter((j) => j.dayosisi_id === profileDayosisi);
      if (profileJimbo) rows = filterByProfile(rows, profileJimbo);
      return rows.map((j) => ({ id: j.id, label: j.jina }));
    }
    if (scope === "tawi") {
      let rows = matawi;
      if (profileDayosisi) {
        const jbIds = new Set(
          majimbo.filter((j) => j.dayosisi_id === profileDayosisi).map((j) => j.id),
        );
        rows = rows.filter((t) => jbIds.has(String(t.jimbo_id ?? "")));
      }
      if (profileJimbo) rows = rows.filter((t) => String(t.jimbo_id ?? "") === profileJimbo);
      if (profileTawi) rows = filterByProfile(rows, profileTawi);
      return rows.map((t) => ({ id: t.id, label: t.jina }));
    }
    return [];
  }, [scope, dayosisi, majimbo, matawi, profileDayosisi, profileJimbo, profileTawi]);

  const entityLabel = entityOptions.find((o) => o.id === entityId)?.label ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-1 flex flex-wrap items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#061633]/95 to-[#123C69]/90 px-2 py-1.5 text-white shadow-sm no-print sm:gap-2 sm:px-3 sm:py-2"
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fde68a]">
        <Building2 className="h-3.5 w-3.5" aria-hidden />
        Ngazi
      </span>
      <select
        className="max-w-[11rem] rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
        value={scope}
        onChange={(e) => {
          const next = e.target.value as MasterBranchScope;
          onScopeChange(next, "");
        }}
        aria-label="Chagua ngazi"
      >
        {visibleScopes.map((o) => (
          <option key={o.value} value={o.value} className="text-slate-900">
            {o.label}
          </option>
        ))}
      </select>
      {scope !== "kitaifa" ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-white/50" aria-hidden />
          <select
            className="min-w-[10rem] max-w-[16rem] flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
            value={entityId}
            onChange={(e) => onScopeChange(scope, e.target.value)}
            aria-label="Chagua kituo"
          >
            <option value="" className="text-slate-900">
              — Chagua {scope === "dayosisi" ? "dayosisi" : scope === "jimbo" ? "jimbo" : "tawi"} —
            </option>
            {entityOptions.map((o) => (
              <option key={o.id} value={o.id} className="text-slate-900">
                {o.label}
              </option>
            ))}
          </select>
        </>
      ) : (
        <span className="text-xs text-blue-100">Muonekano wa kitaifa</span>
      )}
      {scope === "tawi" && entityId ? (
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 rounded-lg bg-[#D4AF37]/20 px-2.5 py-1 text-[11px] font-semibold text-[#fde68a] ring-1 ring-[#D4AF37]/40 hover:bg-[#D4AF37]/30"
          onClick={() => navigateToMasterBranchEngine("registry", { recordId: entityId })}
        >
          <MapPin className="h-3 w-3" aria-hidden />
          Orodha ya tawi
        </button>
      ) : null}
      {entityLabel ? (
        <span className="w-full text-[10px] text-blue-200/90 sm:ml-1 sm:w-auto">
          Inaonyesha: <strong className="text-white">{entityLabel}</strong>
        </span>
      ) : null}
    </motion.div>
  );
}
