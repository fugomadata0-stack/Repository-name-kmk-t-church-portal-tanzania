import { useCallback, useEffect, useState } from "react";
import { Shield, Users, Lock, FileWarning } from "lucide-react";
import { useEnterpriseRbac } from "../../hooks/useEnterpriseRbac";
import {
  fetchSecurityAuditLogs,
  type SecurityAuditLogRow,
} from "../../services/enterpriseSecurityService";
import { fetchPortalRoles } from "../../services/securityService";
import { ENTERPRISE_ROLE_LABELS, type EnterpriseRoleKey } from "../../lib/enterpriseRbac";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";
import type { PortalRoleRow } from "../../types";

export function EnterpriseRbacPanel() {
  const { roleKey, roleLabel, canManageSecurity, canViewAuditLogs, enterpriseRoles } = useEnterpriseRbac();
  const [roles, setRoles] = useState<PortalRoleRow[]>([]);
  const [logs, setLogs] = useState<SecurityAuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, l] = await Promise.all([
        fetchPortalRoles(),
        canViewAuditLogs ? fetchSecurityAuditLogs(120) : Promise.resolve([]),
      ]);
      setRoles(r);
      setLogs(l);
    } catch (e) {
      setError(userFacingQueryError(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, [canViewAuditLogs]);

  useEffect(() => {
    void load();
  }, [load]);

  const enterpriseRoleRows = roles.filter((r) =>
    (enterpriseRoles as readonly string[]).includes(r.role_key),
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border-4 border-double border-rose-900/40 bg-gradient-to-br from-rose-950 via-red-900 to-slate-950 p-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-200/90">Enterprise Security</p>
        <h2 className="mt-1 text-xl font-bold">RBAC & Usalama wa Ngazi</h2>
        <p className="mt-2 text-sm text-rose-100/90">
          Majukumu · Ruhusa · RLS · Vikao · Kumbukumbu za usalama
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <Users className="mx-auto h-6 w-6 text-[#0B1F3A]" aria-hidden />
          <p className="mt-2 text-xs text-slate-500">Wewe</p>
          <p className="font-bold text-[#0B1F3A]">{roleLabel}</p>
          <p className="text-[10px] text-slate-400">{roleKey}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <Lock className="mx-auto h-6 w-6 text-emerald-700" aria-hidden />
          <p className="mt-2 text-xs text-slate-500">Usimamizi</p>
          <p className="font-bold">{canManageSecurity ? "Ndiyo" : "Hapana"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <Shield className="mx-auto h-6 w-6 text-amber-600" aria-hidden />
          <p className="mt-2 text-xs text-slate-500">Ukaguzi</p>
          <p className="font-bold">{canViewAuditLogs ? "Ndiyo" : "Hapana"}</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-center text-sm font-bold text-[#0B1F3A]">Majukumu ya Biashara (Enterprise)</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {enterpriseRoleRows.length > 0
            ? enterpriseRoleRows.map((r) => {
                const ent = ENTERPRISE_ROLE_LABELS[r.role_key as EnterpriseRoleKey];
                return (
                  <div
                    key={r.role_key}
                    className={`rounded-lg border px-3 py-2 text-center text-xs ${
                      r.role_key === roleKey ? "border-amber-400 bg-amber-50" : "border-slate-200"
                    }`}
                  >
                    <p className="font-bold text-slate-900">{ent?.sw ?? r.label_sw}</p>
                    <p className="text-slate-500">{ent?.en ?? r.label_en}</p>
                  </div>
                );
              })
            : (enterpriseRoles as readonly EnterpriseRoleKey[]).map((k) => (
                <div key={k} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs">
                  <p className="font-bold">{ENTERPRISE_ROLE_LABELS[k].sw}</p>
                  <p className="text-slate-500">{ENTERPRISE_ROLE_LABELS[k].en}</p>
                </div>
              ))}
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-500">
          Hariri matrix: Usalama → Permissions · Watumiaji: Users · Vikao: Sessions
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-center gap-2">
          <FileWarning className="h-4 w-4 text-rose-700" aria-hidden />
          <h3 className="text-sm font-bold text-[#0B1F3A]">Kumbukumbu za Usalama</h3>
        </div>
        {loading ? (
          <p className="text-center text-sm text-slate-500">Inapakia…</p>
        ) : error ? (
          <p className="text-center text-sm text-rose-700">{error}</p>
        ) : !canViewAuditLogs ? (
          <p className="text-center text-sm text-slate-500">Huna ruhusa ya kuona kumbukumbu za usalama.</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Hakuna matukio bado.</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-100">
                <tr>
                  <th className="p-2">Muda</th>
                  <th className="p-2">Aina</th>
                  <th className="p-2">Moduli</th>
                  <th className="p-2">Matokeo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="p-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString("sw-TZ")}</td>
                    <td className="p-2">{row.event_type}</td>
                    <td className="p-2">{row.module_key ?? "—"}</td>
                    <td className="p-2">
                      <span
                        className={
                          row.outcome === "denied"
                            ? "font-semibold text-rose-700"
                            : row.outcome === "allowed"
                              ? "text-emerald-700"
                              : "text-slate-600"
                        }
                      >
                        {row.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
