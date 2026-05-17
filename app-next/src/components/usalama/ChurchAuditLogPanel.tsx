import { useCallback, useEffect, useMemo, useState } from "react";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { PremiumTable } from "../common/PremiumTable";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { validateSelectedFile } from "../../lib/fileUploadGuard";
import type { AuditActionCategory } from "../../lib/enterpriseAudit";
import { AUDIT_CATEGORY_LABELS } from "../../lib/enterpriseAudit";
import { fetchAuditLogs, insertChurchAuditEntry, toTableRows, uploadAuditAttachment, type AuditLogTableRow } from "../../services/auditLogService";
import { EnterpriseAuditActivityDashboard } from "./EnterpriseAuditActivityDashboard";
import { fetchAccessEvents } from "../../services/securityService";
import { matrixCanSubmitManualAuditLog, matrixCanViewAuditLogs } from "../../utils/matrixPermissions";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";
import { exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";

const AUDIT_MODULE_PRESETS = ["muundo"] as const;
const AUDIT_ACTION_PRESETS = ["tawi_registry_verification"] as const;
const AUDIT_ENTITY_TYPE_PRESETS = ["church_tawi"] as const;

export function ChurchAuditLogPanel({ contextLabel }: { contextLabel?: string }) {
  const { pushToast, reportError, matrixByModule, logAudit } = usePortal();
  const [rows, setRows] = useState<AuditLogTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<AuditLogTableRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [events, setEvents] = useState<{ id: string; created_at?: string; event_type: string; user_label: string | null }[]>([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditActionCategory | "all">("all");
  const [dashboardDays, setDashboardDays] = useState(30);
  const canView = matrixCanViewAuditLogs(matrixByModule);
  const canAdd = matrixCanSubmitManualAuditLog(matrixByModule);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [rec, ev] = await Promise.all([fetchAuditLogs(1000), fetchAccessEvents(300)]);
      setRows(toTableRows(rec));
      setEvents(ev.map((x) => ({ id: x.id, created_at: x.created_at, event_type: x.event_type, user_label: x.user_label })));
    } catch (e) {
      reportError(e, "Audit — pakua");
      setRows([]);
      setLoadError("Imeshindikana kupakua rekodi za audit.");
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (moduleFilter !== "all" && r.module !== moduleFilter) return false;
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (userFilter !== "all" && r.performed_by_name !== userFilter) return false;
      if (roleFilter !== "all" && r.role_key !== roleFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (entityTypeFilter !== "all" && r.entity_type !== entityTypeFilter) return false;
      if (categoryFilter !== "all" && r.action_category !== categoryFilter) return false;
      if (dateFrom || dateTo) {
        const iso = r.created_at_iso;
        if (!iso) return false;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return false;
        if (dateFrom && d < new Date(`${dateFrom}T00:00:00`)) return false;
        if (dateTo && d > new Date(`${dateTo}T23:59:59.999`)) return false;
      }
      if (!q) return true;
      return [r.module, r.action, r.performed_by_name, r.role_key, r.entity_type, r.entity_name, r.entity_id, r.message, r.notes_full]
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, moduleFilter, actionFilter, userFilter, roleFilter, statusFilter, entityTypeFilter, categoryFilter, dateFrom, dateTo]);

  const moduleOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.module));
    for (const x of AUDIT_MODULE_PRESETS) s.add(x);
    return Array.from(s).sort();
  }, [rows]);
  const actionOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.action));
    for (const x of AUDIT_ACTION_PRESETS) s.add(x);
    return Array.from(s).sort();
  }, [rows]);
  const userOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.performed_by_name))).sort(), [rows]);
  const roleOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.role_key))).sort(), [rows]);
  const entityTypeOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.entity_type));
    for (const x of AUDIT_ENTITY_TYPE_PRESETS) s.add(x);
    return Array.from(s).sort();
  }, [rows]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setModuleFilter("all");
    setActionFilter("all");
    setUserFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setEntityTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setCategoryFilter("all");
    pushToast("Vichujio vimesafishwa.", "success");
  }, [pushToast]);

  const exportExcel = useCallback(async () => {
    const xlsx = await import("xlsx");
    const ws = xlsx.utils.json_to_sheet(
      filteredRows.map((r) => ({
        DateTime: r.created_at,
        User: r.performed_by_name,
        Role: r.role_key,
        Module: r.module,
        Action: r.action,
        EntityType: r.entity_type,
        Entity: r.entity_name,
        EntityId: r.entity_id,
        Status: r.status,
        Message: r.message,
      }))
    );
    ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 15 }, { wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 24 }, { wch: 10 }, { wch: 28 }];
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Audit Trail");
    xlsx.writeFile(wb, `KMKT_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`);
    void logAudit("audit_trail_export_excel", "audit_logs", String(filteredRows.length), undefined, {
      module: "usalama",
      category: "export",
    });
  }, [filteredRows, logAudit]);

  const exportPdf = useCallback(async () => {
    await exportTableToPdf(
      "RIPOTI YA AUDIT TRAIL",
      `KMKT_Audit_Trail_${new Date().toISOString().slice(0, 10)}`,
      ["Date/Time", "User", "Role", "Module", "Action", "Entity", "Status", "Message"],
      filteredRows.map((r) => [r.created_at, r.performed_by_name, r.role_key, r.module, r.action, r.entity_name, r.status, r.message]),
      {
        subtitle: "Ufuatiliaji rasmi wa usalama, mabadiliko na matukio muhimu ndani ya KMT Portal.",
        description:
          "Audit Trail hutumika kuthibitisha uwajibikaji wa watumiaji, kulinda uadilifu wa mfumo na kusaidia uchunguzi wa kiutawala au kiusalama.",
      }
    );
    void logAudit("audit_trail_export_pdf", "audit_logs", String(filteredRows.length), undefined, {
      module: "usalama",
      category: "export",
    });
  }, [filteredRows, logAudit]);

  const printView = useCallback(() => {
    openPrintableTable(
      "RIPOTI YA AUDIT TRAIL",
      ["Date/Time", "User", "Role", "Module", "Action", "Entity", "Status", "Message"],
      filteredRows.map((r) => [r.created_at, r.performed_by_name, r.role_key, r.module, r.action, r.entity_name, r.status, r.message]),
      {
        subtitle: "Ufuatiliaji rasmi wa usalama, mabadiliko na matukio muhimu ndani ya KMT Portal.",
      }
    );
    void logAudit("audit_trail_print", "audit_logs", String(filteredRows.length), undefined, {
      module: "usalama",
      category: "export",
    });
  }, [filteredRows, logAudit]);

  async function onSubmitManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const action = String(fd.get("action") ?? "").trim();
    const entity = String(fd.get("entity") ?? "").trim();
    const entity_id = String(fd.get("entity_id") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();
    const file = (fd.get("file") as File | null) || null;
    if (!action) {
      pushToast("Kitendo (action) kinahitajika.", "error");
      return;
    }
    setSaving(true);
    try {
      let attachment_url: string | undefined;
      let file_label: string | undefined;
      if (file && file.size > 0) {
        const fileErr = validateSelectedFile(file, {
          allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".txt", ".csv"],
          maxBytes: 15 * 1024 * 1024,
          labelSw: "kiambatisho",
        });
        if (fileErr) {
          pushToast(fileErr, "error");
          setSaving(false);
          return;
        }
        const up = await uploadAuditAttachment(file);
        attachment_url = up.publicUrl;
        file_label = file.name;
      }
      await insertChurchAuditEntry({ action, entity, entity_id, notes, attachment_url, file_label });
      pushToast("Ingizo la log limehifadhiwa.", "success");
      dispatchPortalReloadMetrics();
      setAddOpen(false);
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      reportError(err, "Audit — ingizo");
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <p className="font-semibold">Huna ruhusa ya kuona log hizi.</p>
        <p className="mt-1 text-sm">Wasiliana na Chief Admin au Super Admin.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-[#1e3a6e]/30 bg-gradient-to-r from-[#0a1628] via-[#132952] to-[#1e3a6e] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Usalama & Ufuatiliaji</p>
        <h2 className="mt-1 text-2xl font-bold">Log ya Kanisa (Audit Trail)</h2>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">
          Rekodi za vitendo muhimu. Data iko kwenye jedwali <code className="rounded bg-white/10 px-1">audit_logs</code>.
          {contextLabel ? ` · ${contextLabel}` : ""}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">Dashibodi ya shughuli</p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Siku
          <select
            value={dashboardDays}
            onChange={(e) => setDashboardDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-2 py-1"
          >
            <option value={7}>7</option>
            <option value={30}>30</option>
            <option value={90}>90</option>
          </select>
        </label>
      </div>
      <EnterpriseAuditActivityDashboard
        days={dashboardDays}
        selectedCategory={categoryFilter}
        onCategorySelect={setCategoryFilter}
      />

      <SupabaseListFeedback loading={loading} loadError={loadError} isEmpty={rows.length === 0} />
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chujio haraka</p>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm hover:bg-emerald-100"
            onClick={() => {
              setModuleFilter("muundo");
              setActionFilter("tawi_registry_verification");
              setEntityTypeFilter("church_tawi");
              setUserFilter("all");
              setRoleFilter("all");
              setStatusFilter("all");
              setSearch("");
              setDateFrom("");
              setDateTo("");
              pushToast("Vimechujwa: uhakiki wa sajili za tawi.", "success");
            }}
          >
            Uhakiki wa sajili (tawi)
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            onClick={clearFilters}
          >
            Rudisha vichujio vyote
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">Search<input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Module<select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="all">Zote</option>{moduleOptions.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Action<select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="all">Zote</option>{actionOptions.map((x) => <option key={x}>{x}</option>)}</select></label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <label className="grid gap-1 text-sm font-medium text-slate-700">User<select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="all">Zote</option>{userOptions.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Role<select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="all">Zote</option>{roleOptions.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="all">Zote</option><option value="success">success</option><option value="failed">failed</option></select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Entity Type<select value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="all">Zote</option>{entityTypeOptions.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">From<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">To<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" /></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-[#0B1F3A] px-3 py-1 font-semibold text-white">Audit Logs: {filteredRows.length}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900">Activity Events: {events.length}</span>
          <button type="button" onClick={clearFilters} className="rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-700">Safisha Vichujio</button>
          <button type="button" onClick={() => void exportExcel()} className="rounded-xl border border-[#0B1F3A] px-3 py-1.5 font-medium text-[#0B1F3A]">Export Excel</button>
          <button type="button" onClick={() => void exportPdf()} className="rounded-xl border border-[#0B1F3A] px-3 py-1.5 font-medium text-[#0B1F3A]">Export PDF</button>
          <button type="button" onClick={() => void printView()} className="rounded-xl border border-[#0B1F3A] px-3 py-1.5 font-medium text-[#0B1F3A]">Print</button>
        </div>
      </section>

      <PremiumTable<AuditLogTableRow>
        title="Vitendo vya Hivi Karibuni"
        subtitle="Audit trail ya mfumo mzima"
        persistenceScope={portalPremiumTableScope(["audit_logs", contextLabel ?? "default", "table"])}
        rows={filteredRows}
        columns={[
          { key: "created_at", label: "Date/Time", sortable: true },
          { key: "performed_by_name", label: "User", sortable: true },
          { key: "role_key", label: "Role", sortable: true },
          { key: "module", label: "Module", sortable: true },
          {
            key: "action_category",
            label: "Aina",
            sortable: true,
            render: (r) => AUDIT_CATEGORY_LABELS[r.action_category]?.sw ?? r.action_category,
          },
          { key: "action", label: "Action", sortable: true },
          { key: "entity_type", label: "Entity Type", sortable: true },
          { key: "entity_name", label: "Entity", sortable: true },
          { key: "status", label: "Status", sortable: true, filterValues: ["success", "failed"] },
          { key: "id", label: "Details", sortable: false, render: (r) => <button type="button" onClick={() => setDetailRow(r)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium">View Details</button> },
        ]}
        onAdd={canAdd ? () => setAddOpen(true) : undefined}
        canAdd={canAdd}
        canEdit={false}
        canDelete={false}
        exportBasename="Church_Audit_Log"
        auditModuleKey="usalama"
        isLoading={loading}
      />
      {!canAdd ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Huna ruhusa ya kufanya kitendo hiki.</p> : null}

      {detailRow ? (
        <ModalScrollLayer onBackdropClick={() => setDetailRow(null)} maxWidthClass="max-w-3xl" overlayClassName="fixed inset-0 z-[70] overflow-y-auto bg-black/55 px-4 py-10 backdrop-blur-sm">
          <div className="rounded-2xl border border-amber-200 bg-[#fffefb] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0f1e46]">Audit Details</h3>
            <p className="mt-1 text-sm text-slate-600">{detailRow.created_at} · {detailRow.performed_by_name} ({detailRow.role_key})</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Old Values</p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-800">{JSON.stringify(detailRow.old_values ?? {}, null, 2)}</pre></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">New Values</p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-800">{JSON.stringify(detailRow.new_values ?? {}, null, 2)}</pre></div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(JSON.stringify(detailRow, null, 2)); pushToast("Details zimenakiliwa.", "success"); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">Copy Details</button>
              <button type="button" onClick={() => setDetailRow(null)} className="rounded-xl bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white">Funga</button>
            </div>
          </div>
        </ModalScrollLayer>
      ) : null}

      {addOpen ? (
        <ModalScrollLayer onBackdropClick={() => setAddOpen(false)} maxWidthClass="max-w-lg" overlayClassName="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-black/50 px-4 py-10 backdrop-blur-sm">
          <form onSubmit={(e) => void onSubmitManual(e)} className="w-full rounded-2xl border border-amber-200 bg-[#fffefb] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0f1e46]">Ongeza ingizo la log</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-800">Kitendo (action) *<input name="action" required className="rounded-xl border border-slate-200 px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">Kipengele (entity)<input name="entity" className="rounded-xl border border-slate-200 px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">Kitambulisho cha rekodi<input name="entity_id" className="rounded-xl border border-slate-200 px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">Maelezo<textarea name="notes" className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">Ambatisha faili<input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt,.csv" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setAddOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">Ghairi</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-blue-800 to-blue-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Inahifadhi…" : "Hifadhi log"}</button>
            </div>
          </form>
        </ModalScrollLayer>
      ) : null}
    </div>
  );
}
