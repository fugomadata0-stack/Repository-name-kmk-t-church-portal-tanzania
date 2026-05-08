import { useCallback, useEffect, useState } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { PremiumTable } from "../common/PremiumTable";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { PORTAL_MODULE_KEYS } from "../../data/portalModuleKeys";
import {
  deleteVisibilityRule,
  fetchVisibilityRules,
  upsertVisibilityRule,
} from "../../services/securityService";
import { matrixCanManagePortalSecurity } from "../../utils/matrixPermissions";
import type { PortalVisibilityRule, PortalVisibilityScope } from "../../types";

type Row = PortalVisibilityRule & { id: string; status: string };

function toRow(r: PortalVisibilityRule): Row {
  return { ...r, id: r.id, status: r.active ? "Active" : "Inactive" };
}

function parseRoles(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function VisibilityRulesPanel() {
  const { pushToast, reportError, logAudit, matrixByModule } = usePortal();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<PortalVisibilityRule> | null>(null);
  const [saving, setSaving] = useState(false);
  const canWrite = matrixCanManagePortalSecurity(matrixByModule);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchVisibilityRules();
      setRows(data.map(toRow));
    } catch (e) {
      reportError(e, "Sheria za mwonekano — pakua");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const module_key = String(fd.get("module_key") ?? "").trim();
    const scope_type = String(fd.get("scope_type") ?? "national") as PortalVisibilityScope;
    const allowed_roles = parseRoles(String(fd.get("allowed_roles") ?? ""));
    const priority = Number(fd.get("priority") ?? 100);
    const active = fd.get("active") === "on" || fd.get("active") === "true";
    const dayosisi_match = String(fd.get("dayosisi_match") ?? "").trim();
    const jimbo_match = String(fd.get("jimbo_match") ?? "").trim();
    const tawi_match = String(fd.get("tawi_match") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();
    if (!name || !module_key) {
      pushToast("Jina na moduli lazima.", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertVisibilityRule({
        id: draft.id,
        name,
        module_key,
        scope_type,
        allowed_roles,
        priority: Number.isFinite(priority) ? priority : 100,
        active,
        dayosisi_match: dayosisi_match || null,
        jimbo_match: jimbo_match || null,
        tawi_match: tawi_match || null,
        notes: notes || null,
        meta: draft.meta ?? {},
      });
      await logAudit("visibility_rule_upsert", "portal_visibility_rules", saved.id, { name });
      pushToast("Sheria imehifadhiwa.", "success");
      setDraft(null);
      await load();
    } catch (err) {
      reportError(err, "Sheria za mwonekano — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-[#1e3a6e]/30 bg-gradient-to-r from-[#0a1628] via-[#132952] to-[#1e3a6e] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Ukingo wa data</p>
        <h2 className="mt-1 text-2xl font-bold">Sheria za mwonekano</h2>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">
          Jedwali <code className="rounded bg-white/10 px-1">portal_visibility_rules</code> — fafanua ni moduli gani inaonekana kwa ngazi gani (dayosisi, jimbo,
          taifa). Inatumika na injini ya RLS ukiunganisha kwenye masharti ya SQL.
        </p>
      </header>

      <PremiumTable<Row>
        title="Matrix ya mwonekano"
        subtitle="Panga kipaumbele (nambari ndogo = juu zaidi)"
        rows={rows}
        columns={[
          { key: "name", label: "Jina", sortable: true },
          { key: "module_key", label: "Moduli", sortable: true },
          { key: "scope_type", label: "Upeo", sortable: true },
          {
            key: "allowed_roles",
            label: "Majukumu",
            sortable: false,
            render: (r) => <span className="text-xs text-slate-700">{(r.allowed_roles ?? []).join(", ")}</span>,
          },
          { key: "priority", label: "Kipaumbele", sortable: true },
          { key: "status", label: "Hali", filterValues: ["Active", "Inactive"], sortable: true },
        ]}
        onAdd={canWrite ? () => setDraft({}) : undefined}
        onEdit={canWrite ? (r) => setDraft(r) : undefined}
        onDelete={
          canWrite
            ? async (id) => {
                try {
                  await deleteVisibilityRule(id);
                  await logAudit("visibility_rule_delete", "portal_visibility_rules", id);
                  pushToast("Sheria imefutwa.", "success");
                  await load();
                } catch (err) {
                  reportError(err, "Sheria za mwonekano — futa");
                }
              }
            : undefined
        }
        canAdd={canWrite}
        canEdit={canWrite}
        canDelete={canWrite}
        exportBasename="Portal_Visibility_Rules"
        isLoading={loading}
      />

      {draft && (
        <ModalScrollLayer
          onBackdropClick={() => setDraft(null)}
          maxWidthClass="max-w-2xl"
          overlayClassName="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-black/50 px-4 py-10 backdrop-blur-sm"
        >
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="w-full rounded-2xl border border-amber-200 bg-[#fffefb] p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#0f1e46]">{draft.id ? "Hariri sheria" : "Sheria mpya"}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2">
                Jina *
                <input name="name" required defaultValue={draft.name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Moduli *
                <select name="module_key" required defaultValue={draft.module_key ?? "fedha"} className="rounded-xl border border-slate-200 px-3 py-2">
                  {PORTAL_MODULE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Upeo *
                <select name="scope_type" required defaultValue={draft.scope_type ?? "national"} className="rounded-xl border border-slate-200 px-3 py-2">
                  {(["national", "dayosisi", "jimbo", "tawi", "self"] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2">
                Majukumu (comma)
                <input
                  name="allowed_roles"
                  defaultValue={(draft.allowed_roles ?? []).join(", ")}
                  placeholder="chief_admin, finance_admin"
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Kipaumbele
                <input name="priority" type="number" defaultValue={draft.priority ?? 100} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-800">
                <input name="active" type="checkbox" defaultChecked={draft.active !== false} className="h-4 w-4 accent-rose-700" />
                Inatumika
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Linganisha dayosisi
                <input name="dayosisi_match" defaultValue={draft.dayosisi_match ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Linganisha jimbo
                <input name="jimbo_match" defaultValue={draft.jimbo_match ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2">
                Linganisha tawi
                <input name="tawi_match" defaultValue={draft.tawi_match ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2">
                Maelezo
                <textarea name="notes" defaultValue={draft.notes ?? ""} className="min-h-[72px] rounded-xl border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">
                Ghairi
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-blue-800 to-blue-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </form>
        </ModalScrollLayer>
      )}
    </div>
  );
}
