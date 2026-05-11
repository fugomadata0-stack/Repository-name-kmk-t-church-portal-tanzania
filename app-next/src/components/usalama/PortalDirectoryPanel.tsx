import { useCallback, useEffect, useState } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { PremiumTable } from "../common/PremiumTable";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";
import { deleteDirectoryProfile, fetchDirectoryProfiles, fetchPortalRoles, upsertDirectoryProfile } from "../../services/securityService";
import { matrixCanManagePortalSecurity } from "../../utils/matrixPermissions";
import type { PortalDirectoryProfile } from "../../types";

type Row = PortalDirectoryProfile & { id: string };

function toRow(p: PortalDirectoryProfile): Row {
  return { ...p, id: p.id };
}

const STATUS_OPTS = ["pending", "invited", "active", "suspended"] as const;

export function PortalDirectoryPanel() {
  const { pushToast, reportError, logAudit, matrixByModule, authUser, portalProfile } = usePortal();
  const [rows, setRows] = useState<Row[]>([]);
  const [roleOptions, setRoleOptions] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  /** null | 'new' | existing row */
  const [draft, setDraft] = useState<Partial<PortalDirectoryProfile> & { id?: string } | null>(null);
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
      const [profiles, rlist] = await Promise.all([fetchDirectoryProfiles(), fetchPortalRoles()]);
      setRows(profiles.map(toRow));
      setRoleOptions(rlist.map((r) => ({ key: r.role_key, label: r.label_sw })));
    } catch (e) {
      reportError(e, "Directory — pakua");
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
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const full_name = String(fd.get("full_name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const role_key = String(fd.get("role_key") ?? "").trim();
    const status = String(fd.get("status") ?? "pending") as (typeof STATUS_OPTS)[number];
    const dayosisi_scope = String(fd.get("dayosisi_scope") ?? "").trim();
    const jimbo_scope = String(fd.get("jimbo_scope") ?? "").trim();
    const tawi_scope = String(fd.get("tawi_scope") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();
    const auth_user_id = String(fd.get("auth_user_id") ?? "").trim();
    if (!email || !role_key) {
      pushToast("Barua pepe na jukumu lazima.", "error");
      return;
    }
    const superAdmins = rows.filter((r) => r.role_key === "super_admin");
    const editingCurrent = draft?.id ? rows.find((r) => r.id === draft.id) : null;
    if (
      editingCurrent?.role_key === "super_admin" &&
      role_key !== "super_admin" &&
      superAdmins.length <= 1
    ) {
      pushToast("Huwezi kuondoa super_admin wa mwisho.", "error");
      return;
    }
    if (
      draft?.id &&
      portalProfile?.id === draft.id &&
      portalProfile.role_key === "super_admin" &&
      role_key !== "super_admin"
    ) {
      pushToast("Huwezi kujiondolea ruhusa ya super_admin.", "error");
      return;
    }
    setSaving(true);
    try {
      const previous = draft?.id ? rows.find((r) => r.id === draft.id) : null;
      const saved = await upsertDirectoryProfile({
        id: draft?.id,
        email,
        full_name: full_name || null,
        phone: phone || null,
        role_key,
        status,
        dayosisi_scope: dayosisi_scope || null,
        jimbo_scope: jimbo_scope || null,
        tawi_scope: tawi_scope || null,
        notes: notes || null,
        auth_user_id: auth_user_id || null,
      });
      await logAudit("portal_directory_upsert", "portal_directory_profiles", saved.id, { email });
      if (!previous) {
        await logAudit("user_role_assigned", "portal_directory_profiles", saved.id, { role_key: saved.role_key, email });
      } else if (previous.role_key !== saved.role_key) {
        await logAudit("user_role_assigned", "portal_directory_profiles", saved.id, {
          from_role: previous.role_key,
          to_role: saved.role_key,
          email,
        });
      }
      pushToast("Rekodi ya mtumiaji imehifadhiwa.", "success");
      dispatchPortalReloadMetrics();
      setDraft(null);
      await load();
    } catch (err) {
      reportError(err, "Directory — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-[#1e3a6e]/30 bg-gradient-to-r from-[#0a1628] via-[#132952] to-[#1e3a6e] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Watumiaji wa ndani</p>
        <h2 className="mt-1 text-2xl font-bold">Orodha (Directory)</h2>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">
          <code className="rounded bg-white/10 px-1">portal_directory_profiles</code> — hifadhi anwani, jukumu, na mipaka ya dayosisi/jimbo/tawi. UUID wa{" "}
          <code className="rounded bg-white/10 px-1">auth.users</code> inaunganishwa baada ya mwaliko.
        </p>
      </header>

      <PremiumTable<Row>
        title="Watumiaji waliosajiliwa kisheria"
        subtitle="Orodha ya operesheni (siyo orodha kamili ya GoTrue bila service role)"
        persistenceScope={portalPremiumTableScope(["usalama", "Users", "directory"])}
        rows={rows}
        columns={[
          { key: "email", label: "Barua pepe", sortable: true },
          { key: "full_name", label: "Jina", sortable: true },
          { key: "role_key", label: "Jukumu", sortable: true },
          { key: "dayosisi_scope", label: "Ukingo: dayosisi", sortable: false },
          { key: "status", label: "Hali", sortable: true, filterValues: [...STATUS_OPTS] },
          { key: "auth_user_id", label: "auth uid", sortable: false, render: (r) => <span className="font-mono text-xs">{r.auth_user_id ?? "—"}</span> },
        ]}
        onAdd={canWrite ? () => setDraft({}) : undefined}
        onEdit={canWrite ? (r) => setDraft(r) : undefined}
        onDelete={
          canWrite
            ? async (id) => {
                try {
                  const target = rows.find((r) => r.id === id);
                  const superAdmins = rows.filter((r) => r.role_key === "super_admin");
                  if (target?.role_key === "super_admin" && superAdmins.length <= 1) {
                    pushToast("Huwezi kufuta super_admin wa mwisho.", "error");
                    return;
                  }
                  if (target && authUser?.id && target.auth_user_id === authUser.id && target.role_key === "super_admin") {
                    pushToast("Huwezi kujifuta ukiwa super_admin.", "error");
                    return;
                  }
                  await deleteDirectoryProfile(id);
                  await logAudit("portal_directory_delete", "portal_directory_profiles", id);
                  await logAudit("user_role_removed", "portal_directory_profiles", id, { email: target?.email ?? null });
                  pushToast("Rekodi imefutwa.", "success");
                  dispatchPortalReloadMetrics();
                  await load();
                } catch (err) {
                  reportError(err, "Directory — futa");
                }
              }
            : undefined
        }
        canAdd={canWrite}
        canEdit={canWrite}
        canDelete={canWrite}
        exportBasename="Portal_Directory"
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
            <h3 className="text-lg font-bold text-[#0f1e46]">{draft.id ? "Hariri mtumiaji" : "Mtumiaji mpya"}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2">
                Barua pepe *
                <input
                  name="email"
                  required
                  defaultValue={draft.email ?? ""}
                  disabled={Boolean(draft.id)}
                  className="rounded-xl border border-slate-200 px-3 py-2 disabled:bg-slate-100"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jina kamili
                <input name="full_name" defaultValue={draft.full_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Simu
                <input name="phone" defaultValue={draft.phone ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jukumu *
                <select name="role_key" required defaultValue={draft.role_key ?? "viewer"} className="rounded-xl border border-slate-200 px-3 py-2">
                  {roleOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Hali
                <select name="status" defaultValue={draft.status ?? "pending"} className="rounded-xl border border-slate-200 px-3 py-2">
                  {STATUS_OPTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Ukingo: dayosisi
                <input name="dayosisi_scope" defaultValue={draft.dayosisi_scope ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Ukingo: jimbo
                <input name="jimbo_scope" defaultValue={draft.jimbo_scope ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Ukingo: tawi
                <input name="tawi_scope" defaultValue={draft.tawi_scope ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2">
                auth.users id (ukisha walika)
                <input name="auth_user_id" defaultValue={draft.auth_user_id ?? ""} className="font-mono rounded-xl border border-slate-200 px-3 py-2 text-xs" />
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
