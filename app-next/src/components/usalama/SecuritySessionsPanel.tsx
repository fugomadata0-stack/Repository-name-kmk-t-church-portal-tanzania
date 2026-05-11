import { useCallback, useEffect, useState } from "react";
import { PremiumTable } from "../common/PremiumTable";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { usePortal } from "../../context/PortalContext";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import {
  DEFAULT_SECURITY_POLICY,
  fetchAccessEvents,
  fetchSecurityPolicies,
  insertAccessEvent,
  saveSecurityPolicies,
} from "../../services/securityService";
import { matrixCanManagePortalSecurity } from "../../utils/matrixPermissions";
import type { PortalAccessEventRow } from "../../types";
import { safeJsonParseObject } from "../../lib/security";

type EvRow = PortalAccessEventRow & { id: string; status: string };

function toEvRow(r: PortalAccessEventRow): EvRow {
  return { ...r, id: r.id, status: "Imehifadhiwa" };
}

export function SecuritySessionsPanel() {
  const { pushToast, reportError, logAudit, matrixByModule } = usePortal();
  const [events, setEvents] = useState<EvRow[]>([]);
  const [policyText, setPolicyText] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [savingPol, setSavingPol] = useState(false);
  const [loggingManual, setLoggingManual] = useState(false);
  const canWrite = matrixCanManagePortalSecurity(matrixByModule);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ev, pol] = await Promise.all([fetchAccessEvents(400), fetchSecurityPolicies()]);
      setEvents(ev.map(toEvRow));
      setPolicyText(JSON.stringify(pol.policy_json ?? {}, null, 2));
    } catch (e) {
      reportError(e, "Usalama — matukio");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePolicies() {
    if (!canWrite) return;
    const parsed = safeJsonParseObject(policyText, {});
    if (!policyText.trim() || (!Object.keys(parsed).length && policyText.trim() !== "{}")) {
      pushToast("JSON si sahihi.", "error");
      return;
    }
    setSavingPol(true);
    try {
      await saveSecurityPolicies(parsed);
      await insertAccessEvent({ user_label: "policy_editor", event_type: "policy_change", detail: { keys: Object.keys(parsed) } });
      await logAudit("portal_security_policies_save", "portal_security_policies", "1");
      pushToast("Sera zimehifadhiwa.", "success");
      await load();
    } catch (e) {
      reportError(e, "Usalama — sera");
    } finally {
      setSavingPol(false);
    }
  }

  async function logManualEvent() {
    setLoggingManual(true);
    try {
      await insertAccessEvent({
        user_label: "portal_operator",
        event_type: "page_view",
        detail: { path: "/usalama/Sessions", note: "manual_audit_log" },
      });
      pushToast("Tukio limeongezwa.", "success");
      await load();
    } catch (e) {
      reportError(e, "Usalama — kuongeza tukio");
    } finally {
      setLoggingManual(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-[#1e3a6e]/30 bg-gradient-to-r from-[#0a1628] via-[#132952] to-[#1e3a6e] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Vipindi & sera za ziada</p>
        <h2 className="mt-1 text-2xl font-bold">Vikao & sera (advanced)</h2>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">
          Matukio ya <code className="rounded bg-white/10 px-1">portal_access_events</code> ni diary ya portal (siyo orodha kamili ya{" "}
          <code className="rounded bg-white/10 px-1">auth.sessions</code>). Orodha rasmi ya kikao ipo kwenye Supabase Dashboard → Authentication → Users.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-[#0f1e46]">Sera za mfumo (JSON)</h3>
        <p className="mt-1 text-sm text-slate-600">
          Hifadhi kwenye <code className="rounded bg-slate-100 px-1">portal_security_policies</code> — urefu wa neno la siri, MFA, orodha ya IP, muda wa kutoana,
          n.k.
        </p>
        <textarea
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
          disabled={!canWrite}
          className="mt-3 min-h-[200px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs disabled:opacity-60"
          spellCheck={false}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {canWrite && (
            <button
              type="button"
              disabled={savingPol}
              onClick={() => void savePolicies()}
              className="rounded-xl bg-gradient-to-r from-rose-700 to-rose-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingPol ? "Inahifadhi…" : "Hifadhi sera"}
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              disabled={savingPol}
              onClick={() => setPolicyText(JSON.stringify(DEFAULT_SECURITY_POLICY, null, 2))}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900"
            >
              Tumia baseline ya rate limit
            </button>
          )}
          <button
            type="button"
            disabled={loggingManual}
            onClick={() => void logManualEvent()}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
          >
            {loggingManual ? "…" : "Ongeza tukio la ukaguzi"}
          </button>
        </div>
      </section>

      <PremiumTable<EvRow>
        title="Matukio ya hivi karibuni"
        subtitle="Login / API / sera — fuatilia kwa ufuatiliaji wa operesheni"
        persistenceScope={portalPremiumTableScope(["usalama", "Sessions", "access_events"])}
        rows={events}
        columns={[
          { key: "created_at", label: "Muda", sortable: true },
          { key: "event_type", label: "Aina", sortable: true },
          { key: "user_label", label: "Mtumiaji", sortable: true },
          {
            key: "detail",
            label: "Maelezo",
            sortable: false,
            render: (r) => (
              <span className="line-clamp-2 font-mono text-[11px] text-slate-600">
                {r.detail ? JSON.stringify(r.detail) : "—"}
              </span>
            ),
          },
          { key: "status", label: "Hali", filterValues: ["Imehifadhiwa"], sortable: false },
        ]}
        canAdd={false}
        canEdit={false}
        canDelete={false}
        exportBasename="Portal_Access_Events"
        isLoading={loading}
      />
    </div>
  );
}
