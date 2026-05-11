import { useCallback, useEffect, useState } from "react";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { PORTAL_MODULE_KEYS } from "../../data/portalModuleKeys";
import { fetchMatrixForRole, fetchPortalRoles, upsertMatrixRows } from "../../services/securityService";
import { matrixCanManagePortalSecurity } from "../../utils/matrixPermissions";
import type { PortalModuleMatrixRow } from "../../types";

const LABELS: Record<string, string> = {
  can_view: "Tazama",
  can_create: "Unda",
  can_edit: "Hariri",
  can_delete: "Futa",
  can_approve: "Approve",
  can_reject: "Reject",
  can_export: "Hamisha",
  can_print: "Chapisha",
  can_upload: "Upload",
  can_download: "Download",
  can_manage_settings: "Manage Settings",
  can_audit: "Audit",
};

const MATRIX_FLAGS = [
  "can_view",
  "can_create",
  "can_edit",
  "can_delete",
  "can_approve",
  "can_reject",
  "can_export",
  "can_print",
  "can_upload",
  "can_download",
  "can_manage_settings",
  "can_audit",
] as const;
type MatrixFlag = (typeof MATRIX_FLAGS)[number];

function matrixFlagValue(row: PortalModuleMatrixRow, f: MatrixFlag): boolean {
  return row[f];
}

export function SecurityMatrixPanel() {
  const { pushToast, reportError, logAudit, matrixByModule } = usePortal();
  const [roles, setRoles] = useState<{ role_key: string; label_sw: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [matrix, setMatrix] = useState<PortalModuleMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canEdit = matrixCanManagePortalSecurity(matrixByModule);

  const loadRoles = useCallback(async () => {
    const list = await fetchPortalRoles();
    setRoles(list.map((r) => ({ role_key: r.role_key, label_sw: r.label_sw })));
    setSelectedRole((s) => s || list[0]?.role_key || "");
  }, []);

  const loadMatrix = useCallback(
    async (rk: string) => {
      if (!rk || !isSupabaseConfigured()) {
        setMatrix([]);
        return;
      }
      setLoading(true);
      try {
        const m = await fetchMatrixForRole(rk);
        setMatrix(m);
      } catch (e) {
        reportError(e, "RBAC matrix — pakua");
        setMatrix([]);
      } finally {
        setLoading(false);
      }
    },
    [reportError]
  );

  useEffect(() => {
    void (async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        await loadRoles();
      } catch (e) {
        reportError(e, "RBAC matrix — majukumu");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRoles, reportError]);

  useEffect(() => {
    if (selectedRole) void loadMatrix(selectedRole);
  }, [selectedRole, loadMatrix]);

  function toggle(moduleKey: string, key: MatrixFlag) {
    if (!canEdit) return;
    setMatrix((prev) =>
      prev.map((row) =>
        row.module_key === moduleKey ? { ...row, [key]: !matrixFlagValue(row, key) } : row
      )
    );
  }

  async function saveAll() {
    if (!selectedRole || !canEdit) return;
    setSaving(true);
    try {
      await upsertMatrixRows(matrix);
      await logAudit("rbac_matrix_upsert", "portal_module_matrix", selectedRole, { modules: PORTAL_MODULE_KEYS.length });
      pushToast("Matrix ya ruhusa imehifadhiwa.", "success");
      dispatchPortalReloadMetrics();
      await loadMatrix(selectedRole);
    } catch (e) {
      reportError(e, "RBAC matrix — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-[#1e3a6e]/30 bg-gradient-to-r from-[#0a1628] via-[#132952] to-[#1e3a6e] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">RBAC — matrix halisi</p>
        <h2 className="mt-1 text-2xl font-bold">Ruhusa kwa moduli</h2>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">
          Jedwali <code className="rounded bg-white/10 px-1">portal_module_matrix</code>. Chagua jukumu kisha badili viashiria. Hii ndiyo chanzo cha ukweli
          wa sera (ingizo la portal baadaye linaweza kusoma safu hizi kwa RLS).
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Jukumu la lengo
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="min-w-[240px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {roles.map((r) => (
              <option key={r.role_key} value={r.role_key}>
                {r.label_sw} ({r.role_key})
              </option>
            ))}
          </select>
        </label>
        {canEdit && (
          <button
            type="button"
            disabled={saving || loading || !selectedRole}
            onClick={() => void saveAll()}
            className="rounded-xl bg-gradient-to-r from-rose-700 to-rose-900 px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
          >
            {saving ? "Inahifadhi…" : "Hifadhi matrix yote"}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-slate-500">Inapakia matrix…</p>
        ) : (
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-3 font-semibold">Moduli</th>
                {MATRIX_FLAGS.map((f) => (
                  <th key={f} className="px-2 py-3 text-center font-semibold">
                    {LABELS[f] ?? f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.module_key} className="border-b border-slate-100 hover:bg-amber-50/40">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-mono text-xs text-slate-800">{row.module_key}</td>
                  {MATRIX_FLAGS.map((f) => (
                    <td key={f} className="px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-rose-700 disabled:opacity-40"
                        checked={matrixFlagValue(row, f)}
                        disabled={!canEdit}
                        onChange={() => toggle(row.module_key, f)}
                        aria-label={`${row.module_key} ${f}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!canEdit && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Una matrix ya kusoma pekee. Badiliko linapatikana kwa Super Admin / Chief Admin tu.
        </p>
      )}
    </div>
  );
}
