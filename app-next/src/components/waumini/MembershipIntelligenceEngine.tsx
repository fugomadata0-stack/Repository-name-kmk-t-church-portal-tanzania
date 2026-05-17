import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { PremiumKPICard } from "../executive/PremiumKPICard";
import { SafeChartBox } from "../common/SafeChartBox";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { PortalKpiRowSkeleton, PortalTableSkeleton } from "../common/PortalSkeleton";
import { safeLocaleCount } from "../../lib/portalHardening/safeDisplay";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";
import { categoryChartData } from "../../lib/membershipIntelligence";
import { buildMembershipPhase1Pdf, downloadPhase1Pdf } from "../../lib/kmktPhase1ReportPdf";
import { MEMBERSHIP_CATEGORY_LABELS, type Phase1Scope } from "../../services/phase1FoundationService";
import {
  fetchMembershipIntelligenceBundle,
  subscribeMembershipRealtime,
  validateCategoryTotals,
  type HierarchyBreakdownRow,
  type MembershipIntelligenceBundle,
} from "../../services/membershipIntelligenceService";
import { fetchCascadeOptions } from "../../services/churchStructureService";
import { usePortal } from "../../context/PortalContext";
import { bulkImportChurchMembers } from "../../lib/portalExcelBulkHandlers";
import { fetchChurchFamilies } from "../../services/wauminiService";
import type { ChurchStructureEntity, DayosisiRecord } from "../../types";

const SCOPES: { value: Phase1Scope; label: string }[] = [
  { value: "kmkt", label: "KMK(T) — Kitaifa" },
  { value: "dayosisi", label: "Dayosisi" },
  { value: "jimbo", label: "Jimbo" },
  { value: "tawi", label: "Tawi" },
];

const CHART_COLORS = ["#0B1F3A", "#123C69", "#D4AF37", "#168564", "#7c3aed", "#be123c", "#0891b2", "#ea580c"];

export function MembershipIntelligenceEngine() {
  const { logAudit, pushToast, canPortalExportModule } = usePortal();
  const [scope, setScope] = useState<Phase1Scope>("kmkt");
  const [entityId, setEntityId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<MembershipIntelligenceBundle | null>(null);
  const [structure, setStructure] = useState<{
    dayosisi: ChurchStructureEntity[];
    majimbo: ChurchStructureEntity[];
    matawi: ChurchStructureEntity[];
  }>({ dayosisi: [], majimbo: [], matawi: [] });
  const [dayosisiList, setDayosisiList] = useState<DayosisiRecord[]>([]);
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    void fetchCascadeOptions().then((o) => {
      setStructure({ dayosisi: o.dayosisi, majimbo: o.majimbo, matawi: o.matawi });
    });
    void import("../../services/dayosisiService").then((m) => {
      void m.fetchDayosisi().then(setDayosisiList).catch(() => setDayosisiList([]));
    });
  }, []);

  const resolvedEntityId = entityId.trim() || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMembershipIntelligenceBundle(scope, resolvedEntityId);
      if (res.stats.error) setError(res.stats.error);
      setBundle(res);
    } catch (e) {
      setError(userFacingQueryError(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, [scope, resolvedEntityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeMembershipRealtime(() => {
      void load();
    });
  }, [load]);

  const categories = bundle?.stats.categories;
  const chartData = useMemo(() => (categories ? categoryChartData(categories) : []), [categories]);
  const totalsValid = categories ? validateCategoryTotals(categories) : true;

  const entityOptions = useMemo(() => {
    if (scope === "dayosisi") return structure.dayosisi.map((x) => ({ id: x.id, name: x.name }));
    if (scope === "jimbo") return structure.majimbo.map((x) => ({ id: x.id, name: x.name }));
    if (scope === "tawi") return structure.matawi.map((x) => ({ id: x.id, name: x.name }));
    return [];
  }, [scope, structure]);

  const exportPdf = () => {
    if (!categories) return;
    void (async () => {
    const doc = await buildMembershipPhase1Pdf(categories, {
      titleSw: "Injini ya Uanachama — Ripoti",
      titleEn: "Membership Intelligence Report",
      aboutSw: "Takwimu za kiotomatiki: makundi, ngazi, na mtiririko Tawi → Jimbo → Dayosisi → KMK(T).",
      aboutEn: "Automated membership categories with hierarchy rollup.",
      level: scope,
      levelLabel: SCOPES.find((s) => s.value === scope)?.label ?? scope,
      hierarchyFlow: "Tawi → Jimbo → Dayosisi → KMK(T)",
      approvals: bundle?.source === "rpc" ? "RPC Supabase (hai)" : "Hesabu ya ndani (fallback)",
    });
    downloadPhase1Pdf(doc, `kmkt-membership-intel-${scope}-${Date.now()}.pdf`);
    void logAudit("membership_intelligence_pdf", "church_members", resolvedEntityId ?? "kmkt");
    })();
  };

  const onExcelUpload = async (file: File) => {
    setImportBusy(true);
    try {
      const families = await fetchChurchFamilies();
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
      if (!sheet) throw new Error("Laha tupu.");
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
      const result = await bulkImportChurchMembers(rows, {
        families,
        dayosisiList,
        reload: load,
        onEachSaved: (action, id) => {
          void logAudit(action === "create" ? "church_member_bulk_create" : "church_member_bulk_update", "church_members", id);
        },
      });
      pushToast(`Imepakiwa: ${result.ok} · Imeshindwa: ${result.fail}`, result.fail ? "error" : "success");
      await logAudit("membership_bulk_upload", "church_members", file.name);
    } catch (e) {
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border-2 border-emerald-800/30 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 p-5 text-center text-white shadow-lg">
        <h2 className="text-lg font-bold tracking-wide">Injini ya Uanachama / Membership Intelligence</h2>
        <p className="mt-1 text-sm text-emerald-100/90">
          Hesabu kiotomatiki · KPI hai · Mtiririko: Tawi → Jimbo → Dayosisi → KMK(T)
        </p>
        {bundle?.source ? (
          <p className="mt-2 text-xs text-amber-200/90">
            Chanzo: {bundle.source === "rpc" ? "Supabase RPC (live)" : "Fallback ya ndani"}
            {totalsValid ? " · Jumla imethibitishwa" : " · Angalia jumla"}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap items-end justify-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700">
          Ngazi
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as Phase1Scope);
              setEntityId("");
            }}
            className="ml-2 rounded-lg border px-3 py-2 text-sm"
          >
            {SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {scope !== "kmkt" ? (
          <label className="text-sm font-medium text-slate-700">
            Chagua {scope}
            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="ml-2 max-w-[220px] rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Zote / All</option>
              {entityOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" onClick={() => void load()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">
          Pakia upya
        </button>
        {canPortalExportModule("waumini") ? (
          <button
            type="button"
            onClick={exportPdf}
            disabled={loading || !categories}
            className="rounded-lg border-2 border-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-50"
          >
            PDF
          </button>
        ) : null}
        <label className="cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
          {importBusy ? "Inapakia…" : "Pakia Excel"}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={importBusy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onExcelUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {loading ? (
        <>
          <PortalKpiRowSkeleton count={8} />
          <PortalTableSkeleton rows={4} />
        </>
      ) : error ? (
        <SupabaseListFeedback loading={false} loadError={error} isEmpty={false} onRetry={() => void load()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MEMBERSHIP_CATEGORY_LABELS.map((c, i) => (
              <PremiumKPICard
                key={c.key}
                title={c.sw}
                value={safeLocaleCount(categories?.[c.key])}
                hint={c.en}
                index={i}
                static
                live
              />
            ))}
          </div>

          <section className="grid gap-4 xl:grid-cols-2">
            <SafeChartBox title="Makundi ya Uanachama (Pie)" isEmpty={chartData.length === 0}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={88} label>
                  {chartData.map((_, i) => (
                    <Cell key={`c-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => safeLocaleCount(typeof v === "number" ? v : Number(v))} />
              </PieChart>
            </SafeChartBox>
            <SafeChartBox title="Uchambuzi wa Makundi (Bar)" isEmpty={chartData.length === 0}>
              <BarChart data={chartData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#168564" />
              </BarChart>
            </SafeChartBox>
          </section>

          <HierarchyBreakdownTable rows={bundle?.breakdown ?? []} />

          <div className="overflow-x-auto rounded-xl border-4 border-double border-slate-800/80 bg-white shadow-md">
            <table className="w-full min-w-[480px] border-collapse text-center text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-700 px-3 py-3">Kategoria (SW)</th>
                  <th className="border border-slate-700 px-3 py-3">Category (EN)</th>
                  <th className="border border-slate-700 px-3 py-3">Idadi</th>
                </tr>
              </thead>
              <tbody>
                {MEMBERSHIP_CATEGORY_LABELS.map((c) => (
                  <tr key={c.key} className="odd:bg-slate-50 even:bg-white">
                    <td className="border border-slate-300 px-3 py-2 font-medium">{c.sw}</td>
                    <td className="border border-slate-300 px-3 py-2 text-slate-600">{c.en}</td>
                    <td className="border border-slate-300 px-3 py-2 font-semibold tabular-nums">
                      {safeLocaleCount(categories?.[c.key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-slate-500">
            Ukaguzi wa jumla · Kumbukumbu za audit zinarekodiwa kwenye PDF na upakiaji wa Excel.
          </p>
        </>
      )}
    </div>
  );
}

function HierarchyBreakdownTable({ rows }: { rows: HierarchyBreakdownRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-center text-sm font-bold text-slate-800">Mgawanyo wa Ngazi / Hierarchy Breakdown</h3>
      <div className="overflow-x-auto rounded-xl border-4 border-double border-emerald-900/50">
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr className="bg-emerald-950 text-white">
              <th className="border px-3 py-2">Jina</th>
              <th className="border px-3 py-2">Ngazi</th>
              <th className="border px-3 py-2">Jumla</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.entity_id} className="odd:bg-emerald-50/50">
                <td className="border px-3 py-2 font-medium">{r.entity_name}</td>
                <td className="border px-3 py-2 capitalize">{r.child_scope}</td>
                <td className="border px-3 py-2 font-semibold tabular-nums">{safeLocaleCount(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
