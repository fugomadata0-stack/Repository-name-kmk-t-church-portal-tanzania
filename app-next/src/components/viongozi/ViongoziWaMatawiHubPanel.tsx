import { useMemo } from "react";
import { Building2, ExternalLink, Link2, ShieldCheck, Users, ClipboardList } from "lucide-react";
import type { KiongoziRecord, TawiRecord } from "../../types";
import { matchesMatawiTierLeader } from "../../lib/viongoziMatawiTier";

type Props = {
  allLeaders: KiongoziRecord[];
  matawi: TawiRecord[];
  /** Hesabu ya KPI (RLS) kutoka AppLayout; inapendelewa kwa takwimu ya pending_review. */
  registryPendingReviewKpi?: number | null;
  registryPendingReviewKpiFailed?: boolean;
};

/** Hatua 6 — kiambatanishi cha Viongozi wa Matawi: takwimu, foleni ya pending_review, na njia za haraka. */
export function ViongoziWaMatawiHubPanel({
  allLeaders,
  matawi,
  registryPendingReviewKpi = null,
  registryPendingReviewKpiFailed = false,
}: Props) {
  const tier = useMemo(() => allLeaders.filter(matchesMatawiTierLeader), [allLeaders]);
  const withTawiId = useMemo(() => tier.filter((r) => String(r.tawi_id ?? "").trim().length > 0).length, [tier]);
  const withoutTawiId = Math.max(0, tier.length - withTawiId);
  const pendingTawiRegistry = useMemo(
    () => matawi.filter((t) => String(t.verification_status ?? "").trim() === "pending_review").length,
    [matawi]
  );

  const pendingRegistryDisplay = useMemo(() => {
    if (registryPendingReviewKpiFailed) return pendingTawiRegistry;
    if (typeof registryPendingReviewKpi === "number") return registryPendingReviewKpi;
    return pendingTawiRegistry;
  }, [registryPendingReviewKpiFailed, registryPendingReviewKpi, pendingTawiRegistry]);

  const pendingRows = useMemo(
    () =>
      [...matawi]
        .filter((t) => String(t.verification_status ?? "").trim() === "pending_review")
        .sort((a, b) => a.jina.localeCompare(b.jina, "sw"))
        .slice(0, 6),
    [matawi]
  );

  const showPendingSection =
    pendingRows.length > 0 ||
    (typeof registryPendingReviewKpi === "number" && !registryPendingReviewKpiFailed && registryPendingReviewKpi > 0);

  const kpiDiffersFromList =
    !registryPendingReviewKpiFailed &&
    typeof registryPendingReviewKpi === "number" &&
    registryPendingReviewKpi !== pendingTawiRegistry;

  const openMuundoMatawi = () => {
    window.dispatchEvent(
      new CustomEvent("kmt-portal-navigate", {
        detail: { moduleKey: "muundo", submodule: "Injini ya Ngazi — Executive" },
      })
    );
  };

  const spotlightTawi = (id: string) => {
    window.dispatchEvent(
      new CustomEvent("kmt-portal-navigate", {
        detail: { moduleKey: "muundo", submodule: "Orodha ya Matawi / Vituo", recordId: id },
      })
    );
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-amber-50/90 p-4 shadow-md sm:p-5"
      aria-label="Viongozi wa matawi — hatua inayofuata"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-300/60 bg-emerald-600 text-white shadow-sm">
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800/90">Hatua 6 · Ufuatiliaji wa sajili</p>
            <h2 className="mt-0.5 font-kmkt-display text-base font-black text-[#0B1F3A] sm:text-lg">Matawi ndiyo mama wa mradi</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
              Hakikisha kila kiongozi wa ngazi hii ana <strong>tawi_id</strong> halisi ili ripoti, cheti na uhakiki wa QR viendane na tawi moja kwa moja.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openMuundoMatawi}
            className="inline-flex items-center gap-2 rounded-xl border border-[#0B1F3A]/20 bg-[#0B1F3A] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#123C69]"
          >
            <Link2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            Muundo → Matawi / Vituo
          </button>
          <a
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/35 bg-white px-3 py-2 text-xs font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
            href="/verify/leadership"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Ukurasa wa uhakiki (umma)
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Viongozi (ngazi ya tawi)", value: String(tier.length), icon: Users, tone: "text-emerald-900" },
          { label: "Wana tawi_id", value: String(withTawiId), icon: ShieldCheck, tone: "text-[#0B1F3A]" },
          { label: "Bila tawi_id", value: String(withoutTawiId), icon: Building2, tone: withoutTawiId > 0 ? "text-amber-800" : "text-slate-600" },
          {
            label: "Matawi pending_review",
            value: String(pendingRegistryDisplay),
            icon: ClipboardList,
            tone: pendingRegistryDisplay > 0 ? "text-rose-800" : "text-slate-600",
          },
        ].map((cell) => (
          <div
            key={cell.label}
            className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur-sm"
          >
            <cell.icon className={`h-4 w-4 shrink-0 ${cell.tone}`} aria-hidden />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase leading-tight tracking-wide text-slate-500">{cell.label}</p>
              <p className={`font-kmkt-display text-lg font-black tabular-nums ${cell.tone}`}>{cell.value}</p>
              {cell.label === "Matawi pending_review" && registryPendingReviewKpiFailed ? (
                <p className="mt-0.5 text-[9px] font-medium text-amber-800">KPI haikupatikana — hesabu kutoka orodha iliyopakiwa.</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {kpiDiffersFromList ? (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">KPI (DB):</span> {registryPendingReviewKpi} ·{" "}
          <span className="font-semibold text-slate-800">kwenye orodha hapa:</span> {pendingTawiRegistry} — fungua Muundo kwa
          orodha kamili.
        </p>
      ) : null}

      {showPendingSection ? (
        <div className="mt-5 rounded-xl border border-amber-200/90 bg-amber-50/80 px-3 py-3 sm:px-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-950">Matawi zinazosubiri uhakiki (pending_review)</p>
          {pendingRows.length > 0 ? (
            <ul className="mt-2 divide-y divide-amber-200/80">
              {pendingRows.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 font-semibold text-slate-900">
                    {t.jina}
                    {t.branch_code ? <span className="ml-1 text-xs font-normal text-slate-600">({t.branch_code})</span> : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => spotlightTawi(t.id)}
                    className="shrink-0 rounded-lg border border-[#0B1F3A]/25 bg-white px-2.5 py-1 text-[11px] font-bold text-[#0B1F3A] shadow-sm hover:bg-slate-50"
                  >
                    Fungua kwenye jedwali
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-amber-950/95">
              Hakuna matawi ya pending_review kwenye data iliyopakiwa hapa; KPI ina{" "}
              <strong className="tabular-nums">{registryPendingReviewKpi}</strong> yanayosubiri uhakiki. Tumia kitufe &quot;Muundo
              → Matawi / Vituo&quot; au angalia Dashibodi → Vibali vinavyosubiri.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
