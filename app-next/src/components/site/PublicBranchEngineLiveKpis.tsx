import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardHero } from "../executive/DashboardHero";
import { PremiumKPICard } from "../executive/PremiumKPICard";
import { getSupabase, isSupabaseRealtimeEnabled } from "../../lib/supabaseClient";
import { KMT_PORTAL_RELOAD_METRICS_EVENT } from "../../lib/portalEvents";
import {
  snapshotToMatawiDdKpis,
  type MatawiDdKpiRow,
  type MatawiDdKpis,
} from "../../lib/matawiBranchEngineKpiMapper";
import { fetchMahudhurioForBranchScope } from "../../lib/branchEngineKpiContext";
import { fetchPortalPublicDashboardCounts } from "../../services/portalPublicDashboardService";
import {
  MASTER_BRANCH_ENGINE_REALTIME_TABLES,
  MASTER_BRANCH_ENGINE_SUBMODULE,
} from "../../lib/masterBranchEngineHub";
import { fetchMasterBranchEngineSnapshot } from "../../services/masterBranchEngineService";
import { fetchDayosisi } from "../../services/dayosisiService";
import { fetchChurchJimbo, fetchChurchTawi } from "../../services/muundoHierarchyService";
import { buildBranchEnginePortalUrl } from "../../lib/branchEnginePortalUrl";

type NgaziTab = keyof MatawiDdKpis;

const NGAZI_TABS: { id: NgaziTab; label: string; emoji: string }[] = [
  { id: "kmkt", label: "KMK(T)", emoji: "🇹🇿" },
  { id: "dayosisi", label: "Dayosisi", emoji: "🏛️" },
  { id: "jimbo", label: "Majimbo", emoji: "⛪" },
  { id: "tawi", label: "Tawi", emoji: "🌿" },
];

function slugKpi(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, "-");
}

/** KPI za injini — nje ya portal, ngazi zinabofya (KMK(T), Dayosisi, Jimbo, Tawi). */
export function PublicBranchEngineLiveKpis() {
  const [kpis, setKpis] = useState<MatawiDdKpis | null>(null);
  const [activeTab, setActiveTab] = useState<NgaziTab>("kmkt");
  const [loading, setLoading] = useState(true);
  const [liveAt, setLiveAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dayosisi, majimbo, matawi] = await Promise.all([
        fetchDayosisi(),
        fetchChurchJimbo(),
        fetchChurchTawi(),
      ]);
      const [{ counts: pub }, snapshot, mahudhurio] = await Promise.all([
        fetchPortalPublicDashboardCounts(),
        fetchMasterBranchEngineSnapshot({
          scope: "kitaifa",
          entityId: null,
          dayosisi,
          majimbo,
          matawi,
        }),
        fetchMahudhurioForBranchScope("kitaifa", ""),
      ]);
      setKpis(snapshotToMatawiDdKpis(snapshot, pub, mahudhurio));
      setLiveAt(new Date().toISOString());
    } catch {
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onReload = () => void load();
    window.addEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReload);
    return () => window.removeEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReload);
  }, [load]);

  useEffect(() => {
    if (!isSupabaseRealtimeEnabled()) return;
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb.channel("public-branch-engine-kpis");
    for (const table of MASTER_BRANCH_ENGINE_REALTIME_TABLES.slice(0, 8)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => void load());
    }
    channel.subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [load]);

  const rows: MatawiDdKpiRow[] = useMemo(() => {
    if (!kpis) return [];
    return kpis[activeTab] ?? [];
  }, [kpis, activeTab]);

  const loginEngineHref = buildBranchEnginePortalUrl({
    moduleKey: "dashboard",
    submodule: MASTER_BRANCH_ENGINE_SUBMODULE,
  });

  return (
    <section
      id="public-engine-kpis"
      className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] px-3 pb-6 sm:px-5 lg:px-8"
      aria-labelledby="public-engine-kpis-title"
    >
      <DashboardHero
        title="📊 Takwimu za Ngazi (live)"
        subtitle="Bofya KMK(T), Dayosisi, Jimbo au Tawi. Mahudhurio: leo · wiki · mwezi · mwaka. Salio (si Saldo)."
        liveAt={liveAt}
        actions={
          <a
            href={loginEngineHref}
            className="rounded-xl border border-amber-400/45 bg-gradient-to-r from-amber-400/90 to-amber-200/90 px-4 py-2 text-xs font-bold text-[#0a1628] shadow-md transition hover:brightness-105"
          >
            Ingia Dashibodi →
          </a>
        }
      />
      <h3 id="public-engine-kpis-title" className="sr-only">
        Takwimu za ngazi
      </h3>

      <div
        className="mb-4 flex flex-wrap justify-center gap-2"
        role="tablist"
        aria-label="Chagua ngazi ya KPI"
      >
        {NGAZI_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                active
                  ? "bg-gradient-to-r from-amber-400 to-amber-200 text-[#0a1628] shadow-lg"
                  : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="mx-auto grid w-full max-w-[100%] grid-cols-1 justify-items-center gap-3 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        data-kpi-grid={`public-${activeTab}`}
        role="tabpanel"
      >
        {loading
          ? Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/10" aria-hidden />
            ))
          : rows.map(([title, value, hint], i) => (
              <PremiumKPICard
                key={`${activeTab}-${slugKpi(title)}`}
                title={title}
                value={value}
                hint={hint}
                index={i}
                onClick={() => {
                  document.getElementById("login-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            ))}
      </div>
    </section>
  );
}
