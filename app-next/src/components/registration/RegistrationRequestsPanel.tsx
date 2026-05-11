import { useCallback, useEffect, useMemo, useState } from "react";
import type { Column } from "../common/PremiumTable";
import { PremiumTable } from "../common/PremiumTable";
import { usePortal } from "../../context/PortalContext";
import type { Phase33SignupRequest } from "../../services/phase33SignupService";
import { fetchPhase33SignupRequests, updatePhase33SignupStatus } from "../../services/phase33SignupService";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";

const STATUS_ACTIONS: { label: string; status: string }[] = [
  { label: "Idhinisha", status: "Approved" },
  { label: "Kataa", status: "Rejected" },
  { label: "Omba marekebisho", status: "Needs Correction" },
  { label: "Washa", status: "Activated" },
  { label: "Hifadhi", status: "Archived" },
];

const EXPORT_HEADERS = ["Jina", "Barua pepe", "Simu", "Role", "Scope", "Kitengo", "Hali", "Tarehe"];

export function RegistrationRequestsPanel() {
  const { pushToast, reportError, role } = usePortal();
  const [rows, setRows] = useState<Phase33SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const canMutate = role === "chief_admin" || role === "super_admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPhase33SignupRequests();
      setRows(data);
    } catch (e) {
      reportError(e, "Maombi ya usajili");
      pushToast("Imeshindwa kupakia maombi.", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast, reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const onStatus = useCallback(
    async (id: string, status: string) => {
      if (!canMutate) {
        pushToast("Ruhusa ya kitengo hiki ni kwa Chief/Super Admin.", "error");
        return;
      }
      try {
        await updatePhase33SignupStatus(id, status);
        pushToast(`Hali: ${status}`, "success");
        await load();
      } catch (e) {
        reportError(e, "Sasisha ombi");
        pushToast("Imeshindwa kusasisha.", "error");
      }
    },
    [canMutate, load, pushToast, reportError]
  );

  const exportRows = useMemo<(string | number)[][]>(
    () =>
      rows.map((r) => [
        r.fullName,
        r.email,
        r.phone,
        r.requestedRole,
        r.requestedScope,
        r.unitName,
        r.status,
        r.submittedAt ? new Date(r.submittedAt).toLocaleString("sw-TZ") : "",
      ]),
    [rows]
  );

  const exportCsv = useCallback(() => {
    const lines = exportRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob([[EXPORT_HEADERS.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "phase33-signup-requests.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [exportRows]);

  const exportPdf = useCallback(async () => {
    await exportTableToPdf("RIPOTI YA MAOMBI YA USAJILI", "phase33-signup-requests", EXPORT_HEADERS, exportRows, {
      subtitle: "Phase 33 public registration queue",
      description:
        "Ripoti hii inaonyesha maombi rasmi ya usajili yaliyopokelewa kutoka fomu ya umma, pamoja na role, scope, kitengo na hali ya uamuzi kwa ajili ya ufuatiliaji wa kiutawala.",
      showSignatureLine: true,
    });
  }, [exportRows]);

  const exportExcel = useCallback(async () => {
    await exportRowsToExcel("phase33-signup-requests", EXPORT_HEADERS, exportRows, {
      reportTitle: "RIPOTI YA MAOMBI YA USAJILI",
      filterSummary: "Phase 33 public registration queue",
      sheetName: "Registration Requests",
    });
  }, [exportRows]);

  const printRequests = useCallback(() => {
    openPrintableTable("RIPOTI YA MAOMBI YA USAJILI", EXPORT_HEADERS, exportRows, {
      subtitle: "Phase 33 public registration queue",
      filterSummary: "Nakala rasmi ya kuchapishwa kutoka KMT Portal.",
    });
  }, [exportRows]);

  const statusFilters = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status).filter(Boolean))),
    [rows]
  );

  const columns = useMemo<Column<Phase33SignupRequest>[]>(
    () => [
      { key: "fullName", label: "Jina", sortable: true },
      { key: "email", label: "Barua pepe", sortable: true },
      { key: "phone", label: "Simu", sortable: true },
      { key: "requestedRole", label: "Role", sortable: true },
      { key: "requestedScope", label: "Scope", sortable: true },
      { key: "unitName", label: "Kitengo", sortable: true },
      {
        key: "status",
        label: "Hali",
        sortable: true,
        filterValues: statusFilters.length ? statusFilters : undefined,
      },
      {
        key: "submittedAt",
        label: "Tarehe",
        sortable: true,
        render: (r) => (r.submittedAt ? new Date(r.submittedAt).toLocaleString("sw-TZ") : "—"),
      },
      {
        key: "_actions",
        label: "Vitendo",
        render: (r) =>
          canMutate ? (
            <div className="flex max-w-xs flex-wrap gap-1">
              {STATUS_ACTIONS.map((a) => (
                <button
                  key={a.status}
                  type="button"
                  className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium hover:bg-slate-50"
                  onClick={() => void onStatus(r.id, a.status)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-500">Soma tu</span>
          ),
      },
    ],
    [canMutate, onStatus, statusFilters]
  );

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-cyan-200/80 bg-gradient-to-r from-cyan-900 to-slate-900 p-6 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Usajili wa umma</p>
        <h2 className="mt-1 text-2xl font-bold">Maombi ya Phase 33</h2>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          Orodha ya maombi yaliyotumwa kutoka fomu ya umma. Mabadiliko ya hali: Chief Admin / Super Admin (RLS).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            onClick={() => void load()}
          >
            Onyesha upya
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:opacity-50"
            onClick={exportCsv}
            disabled={!rows.length}
          >
            Pakua CSV
          </button>
          <button
            type="button"
            className="rounded-lg border border-amber-300/50 bg-amber-300/15 px-3 py-1.5 text-sm font-semibold text-amber-100 hover:bg-amber-300/25 disabled:opacity-50"
            onClick={() => void exportPdf()}
            disabled={!rows.length}
          >
            PDF rasmi
          </button>
          <button
            type="button"
            className="rounded-lg border border-emerald-300/50 bg-emerald-300/15 px-3 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/25 disabled:opacity-50"
            onClick={() => void exportExcel()}
            disabled={!rows.length}
          >
            Excel
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:opacity-50"
            onClick={printRequests}
            disabled={!rows.length}
          >
            Chapisha
          </button>
        </div>
      </header>

      <PremiumTable<Phase33SignupRequest>
        title="Maombi"
        subtitle="phase33_signup_requests"
        persistenceScope={portalPremiumTableScope(["registration_requests", "Maombi", "phase33"])}
        rows={rows}
        columns={columns}
        canAdd={false}
        canEdit={false}
        canDelete={false}
        canExport={true}
        isLoading={loading}
        exportBasename="phase33_signup_requests"
      />
    </div>
  );
}
