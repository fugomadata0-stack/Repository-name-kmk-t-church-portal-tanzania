import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, FileText, Upload } from "lucide-react";
import { PremiumKPICard } from "../executive/PremiumKPICard";
import { SafeChartBox } from "../common/SafeChartBox";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { PortalKpiRowSkeleton } from "../common/PortalSkeleton";
import { TanzaniaLocationFields } from "../common/TanzaniaLocationFields";
import { TanzaniaMoneyField } from "../common/TanzaniaMoneyField";
import { TZ_PHONE_PREFIX } from "../../lib/tanzaniaFormDefaults";
import { formatMoneyTzOrDash } from "../../lib/money";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";
import {
  buildChurchProjectDetailPdf,
  buildProjectsPhase1Pdf,
  downloadPhase1Pdf,
} from "../../lib/churchProjectsReportPdf";
import { usePortal } from "../../context/PortalContext";
import { PROJECT_TYPE_LABELS, type ChurchInstitutionProject, type InstitutionProjectType } from "../../services/phase1FoundationService";
import {
  PROJECT_TYPE_OPTIONS,
  deleteProjectExpense,
  fetchChurchProjectsBundle,
  listProjectExpenses,
  parseProjectDocuments,
  saveInstitutionProject,
  subscribeChurchProjectsRealtime,
  uploadProjectDocument,
  upsertProjectExpense,
  type ChurchInstitutionProjectExpense,
  type ChurchProjectsBundle,
} from "../../services/churchProjectsEngineService";

const EMPTY: Partial<ChurchInstitutionProject> & { name: string; project_type: InstitutionProjectType } = {
  name: "",
  project_type: "school",
  registration_number: "",
  location_region: "",
  location_district: "",
  location_address: "",
  leader_name: "",
  leader_phone: "",
  leader_title: "",
  budget_income_tz: 0,
  budget_expense_tz: 0,
  approval_status: "active",
  notes: "",
};

export function ChurchProjectsEnginePanel() {
  const { logAudit, pushToast, session, authUser } = usePortal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ChurchProjectsBundle | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ChurchInstitutionProject | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState<ChurchInstitutionProjectExpense[]>([]);
  const [expenseForm, setExpenseForm] = useState({ expense_date: new Date().toISOString().slice(0, 10), category: "", description: "", amount_tz: 0 });
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadBusy, setUploadBusy] = useState(false);

  const uploadedBy = session?.user?.email ?? authUser?.email ?? "portal";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchChurchProjectsBundle("kmkt", null);
      setBundle(res);
    } catch (e) {
      setError(userFacingQueryError(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeChurchProjectsRealtime(() => void load()), [load]);

  const projects = useMemo(() => bundle?.projects ?? [], [bundle?.projects]);
  const analytics = bundle?.analytics;

  const filtered = useMemo(() => {
    if (typeFilter === "all") return projects;
    return projects.filter((p) => p.project_type === typeFilter);
  }, [projects, typeFilter]);

  const chartData = useMemo(
    () =>
      (analytics?.byType ?? []).map((r) => ({
        name: r.label.split("/")[0]?.trim() ?? r.project_type,
        count: r.count,
        income: r.income,
      })),
    [analytics]
  );

  const openProject = async (p: ChurchInstitutionProject) => {
    setSelected(p);
    setForm({ ...p });
    try {
      setExpenses(await listProjectExpenses(p.id));
    } catch {
      setExpenses([]);
    }
  };

  const onSaveProject = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const saved = await saveInstitutionProject(form);
      void logAudit("church_project_upsert", "church_institution_projects", saved.id);
      pushToast("Mradi umehifadhiwa.", "success");
      setForm(EMPTY);
      await load();
      if (selected?.id === saved.id) await openProject(saved);
    } catch (e) {
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setSaving(false);
    }
  };

  const onAddExpense = async () => {
    if (!selected || expenseForm.amount_tz <= 0) return;
    try {
      await upsertProjectExpense({ ...expenseForm, project_id: selected.id });
      setExpenseForm({ expense_date: new Date().toISOString().slice(0, 10), category: "", description: "", amount_tz: 0 });
      await openProject(selected);
      await load();
      pushToast("Matumizi yameongezwa.", "success");
    } catch (e) {
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    }
  };

  const onUploadDoc = async (file: File) => {
    if (!selected) return;
    setUploadBusy(true);
    setUploadPct(0);
    try {
      const updated = await uploadProjectDocument(selected.id, file, uploadedBy, setUploadPct);
      await openProject(updated);
      pushToast("Waraka umepakiwa.", "success");
    } catch (e) {
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setUploadBusy(false);
      setUploadPct(0);
    }
  };

  const kpis = analytics
    ? [
        { title: "Miradi", value: String(analytics.projectCount) },
        { title: "Hai / Active", value: String(analytics.activeCount) },
        { title: "Mapato", value: formatMoneyTzOrDash(analytics.incomeTotal) },
        { title: "Matumizi", value: formatMoneyTzOrDash(analytics.expenseTotal) },
        { title: "Salio", value: formatMoneyTzOrDash(analytics.balanceTotal) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border-4 border-double border-orange-900/40 bg-gradient-to-br from-orange-950 via-amber-900 to-slate-950 p-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-200">Church Projects Engine</p>
        <h2 className="mt-1 text-xl font-bold">Miradi na Taasisi za Kanisa</h2>
        <p className="mt-2 text-sm text-orange-100/90">Chuo · Shule · Hospitali · Kliniki · Mission · Admin · Training</p>
      </header>

      {loading ? (
        <PortalKpiRowSkeleton count={5} />
      ) : error ? (
        <SupabaseListFeedback loading={false} loadError={error} isEmpty={false} onRetry={() => void load()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((k, i) => (
              <PremiumKPICard key={k.title} title={k.title} value={k.value} index={i} static />
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${typeFilter === "all" ? "bg-orange-700 text-white" : "border"}`}
            >
              Zote
            </button>
            {PROJECT_TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTypeFilter(t.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${typeFilter === t.value ? "bg-orange-700 text-white" : "border"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <SafeChartBox title="Analytics kwa aina ya mradi" isEmpty={chartData.length === 0} height={220}>
            <BarChart data={chartData} margin={{ left: 8, right: 8, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#c2410c" name="Idadi" radius={[4, 4, 0, 0]} />
            </BarChart>
          </SafeChartBox>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={projects.length === 0}
              onClick={() => {
                void (async () => {
                  const doc = await buildProjectsPhase1Pdf(projects, {
                    titleSw: "Ripoti ya Miradi na Taasisi",
                    titleEn: "Church Projects Report",
                    aboutSw: "Muhtasari wa miradi — usajili, viongozi, fedha.",
                    aboutEn: "Projects portfolio summary.",
                    level: "kmkt",
                    levelLabel: "KMK(T)",
                  });
                  downloadPhase1Pdf(doc, `kmkt-projects-${Date.now()}.pdf`);
                })();
              }}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-2 text-sm font-semibold"
            >
              <FileText className="h-4 w-4" /> PDF Portfolio
            </button>
            {selected && (
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const doc = await buildChurchProjectDetailPdf(selected, {
                      titleSw: selected.name,
                      titleEn: selected.name,
                      aboutSw: "Ripoti ya mradi mmoja.",
                      aboutEn: "Single project report.",
                      level: "kmkt",
                      levelLabel: "KMK(T)",
                    });
                    downloadPhase1Pdf(doc, `kmkt-project-${selected.id.slice(0, 8)}.pdf`);
                  })();
                }}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-700 px-4 py-2 text-sm font-semibold"
              >
                <FileText className="h-4 w-4" /> PDF Mradi
              </button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-center text-sm font-bold">Sajili / Hariri mradi</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <input placeholder="Jina *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded border px-2 py-1.5 text-sm sm:col-span-2" />
                <select value={form.project_type} onChange={(e) => setForm((f) => ({ ...f, project_type: e.target.value as InstitutionProjectType }))} className="rounded border px-2 py-1.5 text-sm sm:col-span-2">
                  {PROJECT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input placeholder="Nambari ya usajili" value={form.registration_number ?? ""} onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))} className="rounded border px-2 py-1.5 text-sm" />
                <div className="sm:col-span-2">
                  <TanzaniaLocationFields
                    showKata={false}
                    showMtaa={false}
                    value={{
                      mkoa: form.location_region ?? "",
                      wilaya: form.location_district ?? "",
                      kata: "",
                    }}
                    onChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        location_region: v.mkoa,
                        location_district: v.wilaya,
                      }))
                    }
                    labelClassName="grid gap-0.5 text-[11px] font-medium text-slate-700"
                    inputClassName="rounded border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <input placeholder="Mkuu / Director" value={form.leader_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, leader_name: e.target.value }))} className="rounded border px-2 py-1.5 text-sm" />
                <input placeholder={`Simu (${TZ_PHONE_PREFIX})`} value={form.leader_phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, leader_phone: e.target.value }))} className="rounded border px-2 py-1.5 text-sm" />
                <input placeholder="Cheo" value={form.leader_title ?? ""} onChange={(e) => setForm((f) => ({ ...f, leader_title: e.target.value }))} className="rounded border px-2 py-1.5 text-sm" />
                <TanzaniaMoneyField
                  label="Mapato (TZS)"
                  value={form.budget_income_tz ?? 0}
                  onChange={(budget_income_tz) => setForm((f) => ({ ...f, budget_income_tz }))}
                  className="grid gap-0.5 text-[11px] font-medium text-slate-700"
                  inputClassName="min-w-0 flex-1 border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none"
                />
                <select value={form.approval_status ?? "active"} onChange={(e) => setForm((f) => ({ ...f, approval_status: e.target.value }))} className="rounded border px-2 py-1.5 text-sm">
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="mt-3 flex justify-center gap-2">
                <button type="button" disabled={saving} onClick={() => void onSaveProject()} className="rounded-lg bg-orange-700 px-4 py-2 text-sm text-white disabled:opacity-50">
                  {saving ? "Inahifadhi…" : "Hifadhi"}
                </button>
                <button type="button" onClick={() => { setForm(EMPTY); setSelected(null); }} className="rounded-lg border px-4 py-2 text-sm">
                  Safisha
                </button>
              </div>
            </div>

            {selected ? (
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50/40 p-4">
                <h3 className="text-sm font-bold text-orange-950">{selected.name}</h3>
                <p className="text-xs text-orange-900/80">{PROJECT_TYPE_LABELS[selected.project_type]}</p>
                <p className="mt-2 text-sm">Salio: {formatMoneyTzOrDash(selected.balance_tz)}</p>

                <h4 className="mt-4 text-xs font-bold uppercase text-slate-700">Matumizi</h4>
                <div className="mt-1 grid gap-1 sm:grid-cols-4">
                  <input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm((x) => ({ ...x, expense_date: e.target.value }))} className="rounded border px-2 py-1 text-xs" />
                  <input placeholder="Kategoria" value={expenseForm.category} onChange={(e) => setExpenseForm((x) => ({ ...x, category: e.target.value }))} className="rounded border px-2 py-1 text-xs" />
                  <input type="number" placeholder="Kiasi" value={expenseForm.amount_tz || ""} onChange={(e) => setExpenseForm((x) => ({ ...x, amount_tz: Number(e.target.value) || 0 }))} className="rounded border px-2 py-1 text-xs" />
                  <button type="button" onClick={() => void onAddExpense()} className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Ongeza</button>
                </div>
                <ul className="mt-2 max-h-28 overflow-y-auto text-xs">
                  {expenses.map((ex) => (
                    <li key={ex.id} className="flex justify-between border-b py-1">
                      <span>{ex.expense_date} · {ex.category ?? "—"}</span>
                      <span className="flex gap-2">
                        {formatMoneyTzOrDash(ex.amount_tz)}
                        <button type="button" className="text-red-700" onClick={() => void deleteProjectExpense(ex.id, selected.id).then(() => openProject(selected))}>×</button>
                      </span>
                    </li>
                  ))}
                </ul>

                <h4 className="mt-4 text-xs font-bold uppercase text-slate-700">Nyaraka</h4>
                <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-400 bg-white px-3 py-4 text-xs">
                  <Upload className="h-4 w-4" />
                  {uploadBusy ? `Inapakia ${uploadPct}%` : "Pakia waraka (PDF/picha)"}
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUploadDoc(f); e.target.value = ""; }} />
                </label>
                <ul className="mt-2 space-y-1 text-xs">
                  {parseProjectDocuments(selected.documents_json).map((d) => (
                    <li key={d.id}>
                      <a href={d.publicUrl} target="_blank" rel="noreferrer" className="text-emerald-800 underline">{d.fileName}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed p-8 text-sm text-slate-500">
                Chagua mradi kutoka kadi hapa chini
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 ? (
              <p className="col-span-full text-center text-sm text-slate-500">Hakuna miradi kwa kichujio hiki.</p>
            ) : (
              filtered.map((p) => {
                const income = Number(p.budget_income_tz || 0);
                const expense = Number(p.budget_expense_tz || 0);
                const balance = Number(p.balance_tz || 0) || income - expense;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void openProject(p)}
                    className={`min-h-[10rem] rounded-xl border-2 border-double p-4 text-left shadow-sm transition hover:shadow-md ${
                      selected?.id === p.id ? "border-orange-600 bg-orange-50" : "border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Building2 className="h-5 w-5 shrink-0 text-orange-800" />
                      <div>
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-600">{PROJECT_TYPE_LABELS[p.project_type]}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{p.leader_name ?? "—"} · {p.location_region ?? "—"}</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-800">{formatMoneyTzOrDash(balance)}</p>
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{p.approval_status}</span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}