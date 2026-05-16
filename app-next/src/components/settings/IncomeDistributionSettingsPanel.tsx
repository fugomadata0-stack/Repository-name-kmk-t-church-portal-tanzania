import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Percent, Save } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import {
  distributionModeLabel,
  distributionModeShort,
  KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT,
  type IncomeDistributionMode,
} from "../../data/kmktIncomeContributionTypes";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { ngaziRemittanceLabel } from "../../lib/incomeDistribution";
import {
  fetchChurchIncomeSources,
  upsertIncomeSource,
} from "../../services/incomeModuleService";
import {
  fetchFinanceSettings,
  saveFinanceSettings,
} from "../../services/extendedSettingsService";
import type { IncomeSourceRecord } from "../../types";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";

function modeFromSource(s: IncomeSourceRecord): IncomeDistributionMode {
  return s.distributionMode === "full_remittance" ? "full_remittance" : "hierarchy_share";
}

export function IncomeDistributionSettingsPanel() {
  const { pushToast, reportError, canPortalEditModule } = usePortal();
  const allowed = canPortalEditModule("mipangilio");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalPct, setGlobalPct] = useState(KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT);
  const [sources, setSources] = useState<IncomeSourceRecord[]>([]);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [fin, src] = await Promise.all([fetchFinanceSettings(), fetchChurchIncomeSources()]);
      if (fin?.hierarchy_share_percent != null) {
        setGlobalPct(fin.hierarchy_share_percent);
      }
      setSources(src.filter((s) => s.source_type === "predefined" || (s.source_code ?? "").startsWith("MCH")));
    } catch (e) {
      reportError(e, "income-distribution-settings-load");
      pushToast("Imeshindikana kupakia mipangilio ya usambazaji.", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast, reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) =>
      `${s.chanzo} ${s.source_code ?? ""} ${s.category ?? ""}`.toLowerCase().includes(q)
    );
  }, [filter, sources]);

  const counts = useMemo(() => {
    let hierarchy = 0;
    let full = 0;
    for (const s of sources) {
      if (modeFromSource(s) === "full_remittance") full += 1;
      else hierarchy += 1;
    }
    return { hierarchy, full };
  }, [sources]);

  const updateLocal = (id: string, patch: Partial<IncomeSourceRecord>) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const saveAll = async () => {
    if (!allowed) return;
    setSaving(true);
    try {
      const existingFin = await fetchFinanceSettings();
      if (existingFin) {
        await saveFinanceSettings({ ...existingFin, hierarchy_share_percent: globalPct });
      } else {
        await saveFinanceSettings({
          default_currency: "TZS",
          default_payment_methods: "Cash, Bank, Mobile",
          auto_approval_threshold: "",
          receipt_prefix: "RCT-",
          finance_year_start: "",
          finance_year_end: "",
          hierarchy_share_percent: globalPct,
        });
      }

      for (const s of sources) {
        await upsertIncomeSource({
          id: s.id,
          chanzo: s.chanzo,
          source_type: s.source_type,
          source_code: s.source_code,
          category: s.category,
          subtitle: s.subtitle,
          frequency: s.frequency,
          restrictedFund: s.restrictedFund,
          approvalRequired: s.approvalRequired,
          aina: s.aina,
          maelezo: s.maelezo,
          status: s.status,
          distributionMode: s.distributionMode,
          upwardSharePercent: s.upwardSharePercent,
        });
      }
      pushToast("Mipangilio ya usambazaji wa michango imehifadhiwa.", "success");
      await load();
    } catch (e) {
      reportError(e, "income-distribution-settings-save");
      pushToast("Imeshindikana kuhifadhi.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-slate-50 to-emerald-50/30 p-5 shadow-lg">
      <SettingsSupabaseBanner />

      <MotionHeader allowed={allowed} saving={saving} loading={loading} onSave={() => void saveAll()} />

      <div className="mt-4 rounded-xl border border-emerald-200 bg-white/80 p-4 text-sm text-slate-700">
        <p className="font-semibold text-[#0B1F3A]">Mtiririko wa ngazi</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <strong>Tawi</strong> — inakusanya; sehemu inabaki, sehemu inapanda <strong>Jimbo</strong>.
          </li>
          <li>
            <strong>Jimbo</strong> — hukusanya kutoka matawi; inapeleka sehemu <strong>Dayosisi</strong>.
          </li>
          <li>
            <strong>Dayosisi</strong> — inapeleka sehemu <strong>KMK(T)</strong>.
          </li>
        </ol>
        <p className="mt-3 text-xs text-slate-600">
          <strong>35%</strong> (hierarchy_share): kila ngazi inatuma asilimia iliyowekwa juu — kilichobaki hubaki ngazi ya sasa.
          <br />
          <strong>100%</strong> (full_remittance): kiasi kamili kinapanda juu.
        </p>
      </div>

      <MotionControls
        allowed={allowed}
        loading={loading}
        globalPct={globalPct}
        setGlobalPct={setGlobalPct}
        filter={filter}
        setFilter={setFilter}
        counts={counts}
      />

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Inapakia aina za michango…</p>
      ) : (
        <MotionTable allowed={allowed} rows={filtered} globalPct={globalPct} onChange={updateLocal} />
      )}
    </section>
  );
}

function MotionHeader({
  allowed,
  saving,
  loading,
  onSave,
}: {
  allowed: boolean;
  saving: boolean;
  loading: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold text-[#0B1F3A]">Usambazaji wa Michango — Ngazi</h3>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Weka kila aina ya mchango iende kwa <strong>35%</strong> (sehemu inapanda juu) au <strong>100%</strong> (kamili juu).
          Orodha ya aina 47 — kutoka tawi hadi KMK(T).
        </p>
      </div>
      <button
        type="button"
        disabled={!allowed || saving || loading}
        onClick={onSave}
        className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Inahifadhi…" : "Hifadhi usambazaji"}
      </button>
    </div>
  );
}

function MotionControls({
  allowed,
  loading,
  globalPct,
  setGlobalPct,
  filter,
  setFilter,
  counts,
}: {
  allowed: boolean;
  loading: boolean;
  globalPct: number;
  setGlobalPct: (n: number) => void;
  filter: string;
  setFilter: (s: string) => void;
  counts: { hierarchy: number; full: number };
}) {
  return (
    <MotionControlsInner
      allowed={allowed}
      loading={loading}
      globalPct={globalPct}
      setGlobalPct={setGlobalPct}
      filter={filter}
      setFilter={setFilter}
      counts={counts}
    />
  );
}

function MotionControlsInner({
  allowed,
  loading,
  globalPct,
  setGlobalPct,
  filter,
  setFilter,
  counts,
}: {
  allowed: boolean;
  loading: boolean;
  globalPct: number;
  setGlobalPct: (n: number) => void;
  filter: string;
  setFilter: (s: string) => void;
  counts: { hierarchy: number; full: number };
}) {
  return (
    <div className="mt-4 flex flex-wrap items-end gap-4">
      <label className="grid gap-1 text-sm">
        <span className="inline-flex items-center gap-1 font-medium text-slate-800">
          <Percent className="h-4 w-4 text-emerald-700" />
          Asilimia chaguo-msingi (aina za 35%)
        </span>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={globalPct}
          onChange={(e) => setGlobalPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
          disabled={!allowed || loading}
          className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2"
        />
      </label>
      <MotionControlsBadges counts={counts} globalPct={globalPct} />
      <label className="grid min-w-[200px] flex-1 gap-1 text-sm">
        Tafuta aina
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Zaka, Miradi, Sadaka…"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2"
        />
      </label>
    </div>
  );
}

function MotionControlsBadges({
  counts,
  globalPct,
}: {
  counts: { hierarchy: number; full: number };
  globalPct: number;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-900">
        {counts.hierarchy} — {distributionModeShort("hierarchy_share", globalPct)}
      </span>
      <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900">
        {counts.full} — 100%
      </span>
    </div>
  );
}

function MotionTable({
  allowed,
  rows,
  globalPct,
  onChange,
}: {
  allowed: boolean;
  rows: IncomeSourceRecord[];
  globalPct: number;
  onChange: (id: string, patch: Partial<IncomeSourceRecord>) => void;
}) {
  return (
    <div className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Code</th>
            <th className="px-3 py-2">Aina ya Mchango</th>
            <th className="px-3 py-2">Usambazaji</th>
            <th className="px-3 py-2">% Juu</th>
            <th className="px-3 py-2">Mfano (TZS 100,000)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const mode = modeFromSource(s);
            const pct = mode === "full_remittance" ? 100 : (s.upwardSharePercent ?? globalPct);
            const sample = 100_000;
            const upward = Math.round((sample * pct) / 100);
            const local = sample - upward;
            return (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">{s.source_code || "—"}</td>
                <td className="px-3 py-2 font-medium text-slate-900">{s.chanzo}</td>
                <td className="px-3 py-2">
                  <select
                    value={mode}
                    disabled={!allowed}
                    onChange={(e) => {
                      const next = e.target.value as IncomeDistributionMode;
                      onChange(s.id, {
                        distributionMode: next,
                        upwardSharePercent: next === "full_remittance" ? 100 : globalPct,
                      });
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  >
                    <option value="hierarchy_share">{distributionModeLabel("hierarchy_share")}</option>
                    <option value="full_remittance">{distributionModeLabel("full_remittance")}</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!allowed || mode === "full_remittance"}
                    value={pct}
                    onChange={(e) =>
                      onChange(s.id, {
                        upwardSharePercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-100"
                  />
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  <span className="text-emerald-800">
                    Baki {ngaziRemittanceLabel("tawi")}: {local.toLocaleString()}
                  </span>
                  <span className="mx-1">·</span>
                  <span className="inline-flex items-center gap-0.5 text-indigo-800">
                    <ArrowUpRight className="h-3 w-3" />
                    Juu: {upward.toLocaleString()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="p-4 text-center text-sm text-slate-500">Hakuna aina zilizopatikana. Endesha migration ya usambazaji.</p>
      ) : null}
    </div>
  );
}
