import { memo, useCallback, useMemo, useState } from "react";
import { PortalKpiRowSkeleton } from "../common/PortalSkeleton";
import { modules } from "../../data/portalModules";
import {
  ENTERPRISE_COMMAND_MODULES,
  resolveEnterpriseModulePortal,
  type EnterpriseCommandModule,
} from "../../data/enterpriseCommandModules";
import { FINANCE_SOURCE_PRESETS } from "../../data/financeSourcePresets";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import { formatMoneyTz } from "../../lib/money";

type Props = {
  canViewModule: (moduleKey: string) => boolean;
  kpiLive: DashboardKpiSnapshot;
  kpiRefreshing?: boolean;
  wauminiCounts?: { families: number; members: number; activeMembers: number; baptized: number };
  onNavigateModule: (moduleKey: string, submodule: string) => void;
  onRefreshKpis?: () => void;
};

function fmtTz(n: number): string {
  return `TZS ${formatMoneyTz(n)}`;
}

type LevelCard = {
  key: string;
  watermark: string;
  title: string;
  gradient: string;
  items: { label: string; value: string }[];
};

function EnterpriseCommandPanelInner({
  canViewModule,
  kpiLive,
  kpiRefreshing = false,
  wauminiCounts = { families: 0, members: 0, activeMembers: 0, baptized: 0 },
  onNavigateModule,
  onRefreshKpis,
}: Props) {
  const visibleEnterprise = useMemo(
    () => ENTERPRISE_COMMAND_MODULES.filter((m) => canViewModule(m.portalModuleKey)),
    [canViewModule]
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const activeMod = useMemo(
    () => visibleEnterprise.find((m) => m.id === activeId) ?? null,
    [visibleEnterprise, activeId]
  );

  const openModule = useCallback(
    (mod: EnterpriseCommandModule) => {
      const resolved = resolveEnterpriseModulePortal(mod, modules);
      if (!resolved) return;
      setActiveId(mod.id);
    },
    []
  );

  const openFullModule = useCallback(() => {
    if (!activeMod) return;
    const resolved = resolveEnterpriseModulePortal(activeMod, modules);
    if (resolved) onNavigateModule(resolved.moduleKey, resolved.submodule);
  }, [activeMod, onNavigateModule]);

  const levelCards: LevelCard[] = useMemo(
    () => [
      {
        key: "tawi",
        watermark: "TAWI",
        title: "🌿 Tawi",
        gradient: "linear-gradient(135deg,#064e3b,#16a34a)",
        items: [
          { label: "Matawi (jumla)", value: String(kpiLive.matawiCount) },
          { label: "Matawi hai", value: String(kpiLive.matawiActiveCount) },
          { label: "Usajili unaosubiri (hali)", value: String(kpiLive.matawiPendingStatusCount) },
          { label: "Sajili zinasubiri uhakiki", value: String(kpiLive.matawiRegistryPendingReviewCount) },
          { label: "Sajili imethibitishwa", value: String(kpiLive.matawiRegistryVerifiedCount) },
          { label: "Waumini", value: String(wauminiCounts.members) },
          { label: "Vikao vya leo (mahudhurio)", value: String(kpiLive.attendanceTodayCount) },
          { label: "Vikao vya wiki", value: String(kpiLive.attendanceWeekCount) },
          { label: "Vikao vya mwezi", value: String(kpiLive.attendanceMonthCount) },
          { label: "Wageni (mwezi)", value: String(kpiLive.attendanceVisitorsMonth) },
          { label: "Zaka", value: fmtTz(kpiLive.jumlaZakaMwezi) },
          { label: "Sadaka", value: fmtTz(kpiLive.jumlaSadakaMwezi) },
        ],
      },
      {
        key: "jimbo",
        watermark: "JIMBO",
        title: "⛪ Jimbo",
        gradient: "linear-gradient(135deg,#075985,#0ea5e9)",
        items: [
          { label: "Matawi", value: String(kpiLive.matawiCount) },
          { label: "Matawi hai", value: String(kpiLive.matawiActiveCount) },
          { label: "Waumini", value: String(wauminiCounts.members) },
          { label: "Mapato (mwezi)", value: fmtTz(kpiLive.mapatoMweziTotal) },
          { label: "Vibali vya mapato", value: String(kpiLive.pendingApprovalIncomeCount) },
          { label: "Rekodi zinazosubiri (jumla)", value: String(kpiLive.pendingRecordsCrossModule) },
          { label: "Mahudhurio (leo · wiki · mwezi)", value: `${kpiLive.attendanceTodayCount} · ${kpiLive.attendanceWeekCount} · ${kpiLive.attendanceMonthCount}` },
          { label: "Wageni (mwezi)", value: String(kpiLive.attendanceVisitorsMonth) },
        ],
      },
      {
        key: "dayosisi",
        watermark: "DAYOSISI",
        title: "🏛️ Dayosisi",
        gradient: "linear-gradient(135deg,#7c2d12,#f59e0b)",
        items: [
          { label: "Majimbo", value: String(kpiLive.majimboCount) },
          { label: "Matawi", value: String(kpiLive.matawiCount) },
          { label: "Mapato (mwezi)", value: fmtTz(kpiLive.mapatoMweziTotal) },
          { label: "Rekodi zinazosubiri (jumla)", value: String(kpiLive.pendingRecordsCrossModule) },
          { label: "Wasifu zisizo kamili", value: String(kpiLive.incompleteLeadersCount) },
          { label: "Mahudhurio (leo · wiki · mwezi)", value: `${kpiLive.attendanceTodayCount} · ${kpiLive.attendanceWeekCount} · ${kpiLive.attendanceMonthCount}` },
          { label: "Wageni (mwezi)", value: String(kpiLive.attendanceVisitorsMonth) },
        ],
      },
      {
        key: "kmkt",
        watermark: "KMK(T)",
        title: "🇹🇿 KMK(T)",
        gradient: "linear-gradient(135deg,#061633,#123C69)",
        items: [
          { label: "Dayosisi", value: String(kpiLive.dayosisiCount) },
          { label: "Majimbo", value: String(kpiLive.majimboCount) },
          { label: "Mapato (mwaka hadi leo)", value: fmtTz(kpiLive.yearToDateIncomeTotal) },
          { label: "Mahudhurio (leo · wiki · mwezi)", value: `${kpiLive.attendanceTodayCount} · ${kpiLive.attendanceWeekCount} · ${kpiLive.attendanceMonthCount}` },
          { label: "Wageni (mwezi)", value: String(kpiLive.attendanceVisitorsMonth) },
          { label: "Ripoti za ukaguzi", value: "—" },
          { label: "Hali ya mfumo", value: "Sawa" },
        ],
      },
    ],
    [kpiLive, wauminiCounts]
  );

  const financeItems = useMemo(() => {
    const presetRows = FINANCE_SOURCE_PRESETS.slice(0, 24).map((p) => ({
      key: p.code,
      label: p.name,
    }));
    const amountByName = new Map<string, number>();
    for (const row of kpiLive.incomeBySourceMwezi) {
      amountByName.set(row.label, row.amount);
    }
    const amountByCategory = new Map<string, number>();
    for (const row of kpiLive.mapatoKwaKategoriaMwezi) {
      amountByCategory.set(row.label, row.amount);
    }
    amountByName.set("Zaka", kpiLive.jumlaZakaMwezi);
    amountByName.set("Sadaka", kpiLive.jumlaSadakaMwezi);
    amountByName.set("Ujenzi", kpiLive.jumlaUjenziMwezi);
    amountByName.set("Matoleo ya Makusudi", kpiLive.jumlaMatoleoMakusudiMwezi);
    amountByName.set("Donor Funding", kpiLive.jumlaDonationsMwezi);

    return presetRows.map((p) => ({
      key: p.key,
      label: p.label,
      amount: amountByName.get(p.label) ?? amountByCategory.get(p.label) ?? 0,
    }));
  }, [kpiLive]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#dbe7f5] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-[0_24px_60px_rgba(15,23,42,.12)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#0B1F3A] sm:text-2xl">KMK(T) — Moduli za Mfumo</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Baada ya kuingia, moduli zinabofya hapa kwanza. Chagua moduli kuona sub-modules na sehemu za kujaza taarifa; KPI za ngazi ziko chini.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            Moduli kwanza · KPI chini
          </span>
        </div>

        <div className="mt-5 grid grid-cols-6 gap-3 md:grid-cols-12 md:gap-3.5">
          {visibleEnterprise.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => openModule(mod)}
              className={`${mod.gridClass} group relative flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-3xl border border-white/20 p-3 text-center text-white shadow-lg transition hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 active:outline active:outline-3 active:outline-offset-2 active:outline-amber-400 md:min-h-[128px] md:gap-2.5 md:p-3.5`}
              style={{ background: mod.gradient }}
              aria-pressed={activeId === mod.id}
            >
              <span className="text-2xl" aria-hidden>
                {mod.icon}
              </span>
              <span className="text-sm font-black leading-tight">{mod.label}</span>
              <div className="flex max-h-9 flex-wrap justify-center gap-1 overflow-hidden px-1">
                {mod.submodules.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/95"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {activeMod ? (
          <section className="mt-5 rounded-[28px] border border-[#dbe7f5] bg-white p-4 shadow-lg sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#0B1F3A]">{activeMod.label}</h3>
                <p className="mt-1 text-sm text-slate-600">{activeMod.description}</p>
              </div>
              <button
                type="button"
                onClick={openFullModule}
                className="rounded-xl bg-gradient-to-r from-[#0B1F3A] to-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-md hover:brightness-110"
              >
                Fungua moduli kamili
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeMod.submodules.map((sub) => (
                <div
                  key={sub}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3.5 shadow-sm"
                >
                  <h4 className="text-sm font-bold text-[#0B1F3A]">{sub}</h4>
                  <p className="mt-1 text-xs text-slate-500">Sehemu ya kujaza / kuona data ya {sub}.</p>
                  <label className="mt-3 block text-xs font-semibold text-slate-600">Maelezo / maandishi</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder={`Andika taarifa za ${sub}...`}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <section className="rounded-[32px] border border-[#dbe7f5] bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,.10)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#0B1F3A] sm:text-2xl">KPI kwa Ngazi — Tawi → Jimbo → Dayosisi → KMK(T)</h2>
            <p className="mt-2 text-sm text-slate-600">
              Takwimu zinasomwa kutoka Supabase (RLS). Data inapanda automatic kutoka ngazi ya chini kwenda juu.
            </p>
          </div>
          {onRefreshKpis ? (
            <button
              type="button"
              onClick={onRefreshKpis}
              disabled={kpiRefreshing}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#0B1F3A] hover:bg-slate-50 disabled:opacity-60"
            >
              🔄 Onyesha upya KPI
            </button>
          ) : null}
        </div>
        {kpiRefreshing ? (
          <div className="mt-4">
            <PortalKpiRowSkeleton count={4} />
          </div>
        ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {levelCards.map((card) => (
            <article
              key={card.key}
              className="relative overflow-hidden rounded-3xl p-4 text-white shadow-lg"
              style={{ background: card.gradient }}
              role={canViewModule("muundo") ? "button" : undefined}
              tabIndex={canViewModule("muundo") ? 0 : undefined}
              onClick={
                canViewModule("muundo")
                  ? () => onNavigateModule("muundo", "Injini ya Ngazi — Executive")
                  : undefined
              }
              onKeyDown={
                canViewModule("muundo")
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onNavigateModule("muundo", "Injini ya Ngazi — Executive");
                      }
                    }
                  : undefined
              }
            >
              <span className="pointer-events-none absolute right-2 top-1 text-4xl font-black text-white/10">
                {card.watermark}
              </span>
              <h3 className="relative text-lg font-black">{card.title}</h3>
              <div className="relative mt-3 grid gap-2">
                {card.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm"
                  >
                    <span className="text-white/90">{item.label}</span>
                    <strong className="tabular-nums">{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        )}
      </section>

      <section className="rounded-[32px] border border-emerald-900/20 bg-gradient-to-br from-[#052e16] via-[#14532d] to-[#16a34a] p-4 text-white shadow-[0_24px_60px_rgba(20,83,45,.26)] sm:p-5">
        <h2 className="text-xl font-black sm:text-2xl">💰 Fedha zote — chaguo la kiotomatiki</h2>
        <p className="mt-2 text-sm text-emerald-100/90">
          Aina zaidi ya 20 za michango/fedha (preset + kategoria kutoka Supabase). Thamani za mwezi huu zinaonyesha mapato yaliyokubaliwa.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {financeItems.map((item) => (
            <div key={item.key} className="rounded-2xl border border-white/15 bg-white/10 p-3">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-emerald-100/80">
                {item.label}
              </span>
              <strong className="mt-1 block text-lg font-black tabular-nums">{fmtTz(item.amount)}</strong>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateModule("fedha", "Sadaka")}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/25"
          >
            Fungua kituo cha Fedha
          </button>
          <button
            type="button"
            onClick={() => onNavigateModule("mapato_income", "Sadaka za Kawaida")}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/25"
          >
            Mapato
          </button>
          {canViewModule("attendance") ? (
            <button
              type="button"
              onClick={() => onNavigateModule("attendance", "Sessions")}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/25"
            >
              Mahudhurio
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export const EnterpriseCommandPanel = memo(EnterpriseCommandPanelInner);
