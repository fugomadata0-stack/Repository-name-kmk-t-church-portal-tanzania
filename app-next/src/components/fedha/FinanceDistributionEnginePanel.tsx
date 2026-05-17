import { useCallback, useEffect, useMemo, useState } from "react";
import { PremiumKPICard } from "../executive/PremiumKPICard";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { PortalKpiRowSkeleton, PortalTableSkeleton } from "../common/PortalSkeleton";
import { formatMoneyTzOrDash } from "../../lib/money";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";
import { validateDistributionPercents } from "../../lib/financeDistributionCalculations";
import { buildFinancePhase1Pdf, downloadPhase1Pdf } from "../../lib/kmktPhase1ReportPdf";
import { ngaziRemittanceLabel, type NgaziRemittanceKind } from "../../lib/incomeDistribution";
import { usePortal } from "../../context/PortalContext";
import type { IncomeDistributionSetting, IncomeRemittance, Phase1Scope } from "../../services/phase1FoundationService";
import {
  exportFinanceDistributionExcel,
  fetchFinanceDistributionBundle,
  subscribeFinanceDistributionRealtime,
  updateRemittanceApproval,
  upsertDistributionSetting,
  type FinanceDistributionBundle,
} from "../../services/financeDistributionEngineService";

const SCOPES: { value: Phase1Scope; label: string }[] = [
  { value: "kmkt", label: "KMK(T) — Kitaifa" },
  { value: "dayosisi", label: "Dayosisi" },
  { value: "jimbo", label: "Jimbo" },
  { value: "tawi", label: "Tawi" },
];

const DEFAULT_LEVELS: Phase1Scope[] = ["tawi", "jimbo", "dayosisi", "kmkt"];

type SettingDraft = {
  id?: string;
  scope_level: Phase1Scope;
  retain_percent: number;
  upward_percent: number;
  direct_to_kmkt_allowed: boolean;
};

function levelLabel(level: string): string {
  if (level === "external") return "Mchango wa nje";
  try {
    return ngaziRemittanceLabel(level as NgaziRemittanceKind);
  } catch {
    return level;
  }
}

function approvalBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "bg-emerald-100 text-emerald-900";
  if (s === "rejected" || s === "cancelled") return "bg-red-100 text-red-900";
  return "bg-amber-100 text-amber-950";
}

export function FinanceDistributionEnginePanel() {
  const { logAudit, pushToast, session } = usePortal();
  const [scope, setScope] = useState<Phase1Scope>("kmkt");
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<FinanceDistributionBundle | null>(null);
  const [settingDrafts, setSettingDrafts] = useState<SettingDraft[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFinanceDistributionBundle(scope, null, periodStart, periodEnd);
      if (res.summary.error) setError(res.summary.error);
      setBundle(res);
      setSettingDrafts(mergeSettingDrafts(res.settings));
    } catch (e) {
      setError(userFacingQueryError(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, [scope, periodStart, periodEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeFinanceDistributionRealtime(() => void load()), [load]);

  const summary = bundle?.summary ?? null;
  const remittances = bundle?.remittances ?? [];

  const kpis = useMemo(() => {
    if (!summary) return [];
    return [
      { title: "Mapato / Income", value: formatMoneyTzOrDash(summary.income_total) },
      { title: "Salio / Balance", value: formatMoneyTzOrDash(summary.balance) },
      { title: "Uhamisho / Transfers", value: formatMoneyTzOrDash(summary.transfers_approved) },
      { title: "Inasubiri / Pending", value: formatMoneyTzOrDash(summary.transfers_pending) },
      { title: "Kilichobaki / Remaining", value: formatMoneyTzOrDash(summary.remaining) },
      { title: "Moja kwa moja KMK(T)", value: formatMoneyTzOrDash(summary.direct_kmkt_total ?? 0) },
    ];
  }, [summary]);

  const exportPdf = () => {
    if (!summary) return;
    void (async () => {
    const doc = await buildFinancePhase1Pdf(summary, remittances, {
      titleSw: "Ripoti ya Usambazaji wa Fedha",
      titleEn: "Finance Distribution Engine Report",
      aboutSw:
        "Mfumo wa usambazaji: Tawi inashikilia → Jimbo → Dayosisi → KMK(T). Asilimia zinaweza kusanidiwa. Michango ya moja kwa moja KMK(T) inaonekana kando.",
      aboutEn: "Hierarchy distribution with configurable percentages and direct national donations.",
      level: scope,
      levelLabel: SCOPES.find((x) => x.value === scope)?.label ?? scope,
      periodStart,
      periodEnd,
      hierarchyFlow: "Tawi (retain %) → Jimbo → Dayosisi → KMK(T)",
      approvals: "Remittance approval_status · receipt_number",
    });
    downloadPhase1Pdf(doc, `kmkt-finance-engine-${scope}-${Date.now()}.pdf`);
    void logAudit("finance_distribution_pdf", "church_income_remittances", scope, { periodStart, periodEnd });
    })();
  };

  const exportExcel = async () => {
    if (!summary) return;
    await exportFinanceDistributionExcel(summary, remittances, `KMKT-Finance-Distribution-${scope}`);
    void logAudit("finance_distribution_excel", "church_income_remittances", scope, { periodStart, periodEnd });
    pushToast("Excel imepakuliwa.", "success");
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      for (const d of settingDrafts) {
        const check = validateDistributionPercents(d.retain_percent, d.upward_percent);
        if (!check.valid) throw new Error(`${d.scope_level}: ${check.message}`);
        await upsertDistributionSetting({
          id: d.id,
          scope_level: d.scope_level,
          retain_percent: d.retain_percent,
          upward_percent: d.upward_percent,
          direct_to_kmkt_allowed: d.direct_to_kmkt_allowed,
        });
      }
      void logAudit("finance_distribution_settings_save", "church_income_distribution_settings", scope);
      pushToast("Mipangilio ya asilimia imehifadhiwa.", "success");
      await load();
    } catch (e) {
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const onApprove = async (row: IncomeRemittance, status: "approved" | "rejected" | "pending") => {
    setActionId(row.id);
    try {
      const approvedBy = session?.user?.email ?? session?.user?.id ?? "portal";
      const updated = await updateRemittanceApproval(row.id, status, approvedBy);
      void logAudit(`finance_remittance_${status}`, "church_income_remittances", row.id, {
        from: row.from_level,
        to: row.to_level,
        receipt: updated.receipt_number,
      });
      pushToast(status === "approved" ? `Imeidhinishwa · ${updated.receipt_number ?? ""}` : "Hali imesasishwa.", "success");
      await load();
    } catch (e) {
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border-4 border-double border-emerald-900/50 bg-gradient-to-br from-green-950 via-emerald-900 to-slate-950 p-6 text-center text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200/90">Finance Distribution Engine</p>
        <h2 className="mt-1 text-xl font-bold">Usambazaji & Remittance</h2>
        <p className="mt-2 text-sm text-green-100/90">Tawi → Jimbo → Dayosisi → KMK(T) · KPI · Idhini · Risiti · Audit</p>
      </header>

      <div className="flex flex-wrap items-end justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700">
          Ngazi
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as Phase1Scope)}
            className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5"
          >
            {SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Kuanzia
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="ml-2 rounded-lg border px-2 py-1.5" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Hadi
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="ml-2 rounded-lg border px-2 py-1.5" />
        </label>
        <button type="button" onClick={() => void load()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          Pakia
        </button>
        <button type="button" onClick={exportPdf} disabled={!summary} className="rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950">
          PDF
        </button>
        <button type="button" onClick={() => void exportExcel()} disabled={!summary} className="rounded-lg border-2 border-slate-700 px-4 py-2 text-sm font-semibold">
          Excel
        </button>
      </div>

      {bundle && !bundle.validation.valid && !loading && (
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
          Tahadhari: jumla za RPC zinahitaji ukaguzi. Pakia upya baada ya kusawazisha mapato.
        </div>
      )}

      {loading ? (
        <>
          <PortalKpiRowSkeleton count={6} />
          <PortalTableSkeleton />
        </>
      ) : error ? (
        <SupabaseListFeedback loading={false} loadError={error} isEmpty={false} onRetry={() => void load()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((k, i) => (
              <PremiumKPICard key={k.title} title={k.title} value={k.value} index={i} static />
            ))}
          </div>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800">Mipangilio ya Asilimia (retain + upward = 100%)</h3>
              <button
                type="button"
                disabled={savingSettings}
                onClick={() => void saveSettings()}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {savingSettings ? "Inahifadhi…" : "Hifadhi mipangilio"}
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border-4 border-double border-emerald-900/60">
              <table className="w-full border-collapse text-center text-sm">
                <thead>
                  <tr className="bg-emerald-950 text-white">
                    <th className="border border-emerald-800 px-2 py-2">Ngazi</th>
                    <th className="border border-emerald-800 px-2 py-2">Retain %</th>
                    <th className="border border-emerald-800 px-2 py-2">Upward %</th>
                    <th className="border border-emerald-800 px-2 py-2">Moja kwa moja KMK(T)</th>
                  </tr>
                </thead>
                <tbody>
                  {settingDrafts.map((r, idx) => (
                    <tr key={r.scope_level} className={idx % 2 === 0 ? "bg-emerald-50/80" : "bg-white"}>
                      <td className="border border-slate-300 px-2 py-2 font-semibold capitalize">{r.scope_level}</td>
                      <td className="border border-slate-300 px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={r.retain_percent}
                          onChange={(e) => {
                            const retain = Number(e.target.value);
                            setSettingDrafts((prev) =>
                              prev.map((x) =>
                                x.scope_level === r.scope_level
                                  ? { ...x, retain_percent: retain, upward_percent: Math.round((100 - retain) * 100) / 100 }
                                  : x
                              )
                            );
                          }}
                          className="w-20 rounded border px-1 py-1 text-center"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-2">{r.upward_percent}%</td>
                      <td className="border border-slate-300 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={r.direct_to_kmkt_allowed}
                          onChange={(e) =>
                            setSettingDrafts((prev) =>
                              prev.map((x) =>
                                x.scope_level === r.scope_level ? { ...x, direct_to_kmkt_allowed: e.target.checked } : x
                              )
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-center text-sm font-bold text-slate-800">Daftari la Uhamisho · Idhini & Risiti</h3>
            <div className="overflow-x-auto rounded-xl border-4 border-double border-slate-800">
              <table className="w-full min-w-[720px] border-collapse text-center text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-700 px-2 py-2">Kutoka → Kwenda</th>
                    <th className="border border-slate-700 px-2 py-2">Kiasi</th>
                    <th className="border border-slate-700 px-2 py-2">Uhamisho</th>
                    <th className="border border-slate-700 px-2 py-2">Kilichobaki</th>
                    <th className="border border-slate-700 px-2 py-2">Idhini</th>
                    <th className="border border-slate-700 px-2 py-2">Risiti</th>
                    <th className="border border-slate-700 px-2 py-2">Vitendo</th>
                  </tr>
                </thead>
                <tbody>
                  {remittances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border px-2 py-6 text-slate-500">
                        Hakuna uhamisho — ongeza mapato kupitia moduli ya Mapato
                      </td>
                    </tr>
                  ) : (
                    remittances.map((r, idx) => (
                      <tr key={r.id} className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                        <td className="border px-2 py-2 font-medium">
                          {levelLabel(r.from_level)} → {levelLabel(r.to_level)}
                        </td>
                        <td className="border px-2 py-2 text-emerald-900">{formatMoneyTzOrDash(r.amount_tz)}</td>
                        <td className="border px-2 py-2 text-amber-900">{formatMoneyTzOrDash(r.transfer_amount_tz)}</td>
                        <td className="border px-2 py-2">{formatMoneyTzOrDash(r.remaining_amount_tz)}</td>
                        <td className="border px-2 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${approvalBadgeClass(r.approval_status)}`}>
                            {r.approval_status}
                          </span>
                        </td>
                        <td className="border px-2 py-2 font-mono text-xs">{r.receipt_number ?? "—"}</td>
                        <td className="border px-2 py-1">
                          {r.approval_status !== "approved" && (
                            <button
                              type="button"
                              disabled={actionId === r.id}
                              onClick={() => void onApprove(r, "approved")}
                              className="mr-1 rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                            >
                              Idhini
                            </button>
                          )}
                          {r.approval_status === "pending" && (
                            <button
                              type="button"
                              disabled={actionId === r.id}
                              onClick={() => void onApprove(r, "rejected")}
                              className="rounded border border-red-400 px-2 py-1 text-xs text-red-800"
                            >
                              Kataa
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {summary && (
            <section className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-600">
              <p>
                Mapato ya ndani: {formatMoneyTzOrDash(summary.income_local)} · Juu: {formatMoneyTzOrDash(summary.income_upward)} ·
                Matumizi: {formatMoneyTzOrDash(summary.expenses_total)}
              </p>
              <p className="mt-1">Mtiririko: Tawi (retain) → Jimbo → Dayosisi → KMK(T) · Realtime inafuatilia remittances & mapato</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function mergeSettingDrafts(existing: IncomeDistributionSetting[]): SettingDraft[] {
  return DEFAULT_LEVELS.map((level) => {
    const row = existing.find((s) => s.scope_level === level && s.entity_id == null);
    return {
      id: row?.id,
      scope_level: level,
      retain_percent: row?.retain_percent ?? (level === "kmkt" ? 0 : 65),
      upward_percent: row?.upward_percent ?? (level === "kmkt" ? 100 : 35),
      direct_to_kmkt_allowed: row?.direct_to_kmkt_allowed ?? true,
    };
  });
}