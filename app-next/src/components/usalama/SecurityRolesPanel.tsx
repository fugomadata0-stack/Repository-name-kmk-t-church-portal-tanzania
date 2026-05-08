import { useCallback, useEffect, useState } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { PremiumTable } from "../common/PremiumTable";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { createPortalRole, fetchPortalRoles, updatePortalRole } from "../../services/securityService";
import { matrixCanManagePortalSecurity } from "../../utils/matrixPermissions";
import type { PortalRoleRow } from "../../types";

type Row = PortalRoleRow & { id: string };

function toRows(roles: PortalRoleRow[]): Row[] {
  return roles.map((r) => ({ ...r, id: r.role_key }));
}

export function SecurityRolesPanel() {
  const { pushToast, reportError, logAudit, matrixByModule } = usePortal();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState<Row | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const canEdit = matrixCanManagePortalSecurity(matrixByModule);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPortalRoles();
      setRows(toRows(data));
    } catch (e) {
      reportError(e, "Majukumu — pakua");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editOpen) return;
    const fd = new FormData(e.currentTarget);
    const label_sw = String(fd.get("label_sw") ?? "").trim();
    const label_en = String(fd.get("label_en") ?? "").trim();
    const hierarchy_rank = Number(fd.get("hierarchy_rank") ?? 500);
    const description = String(fd.get("description") ?? "").trim();
    if (!label_sw) {
      pushToast("Jina la Kiswahili linahitajika.", "error");
      return;
    }
    setSaving(true);
    try {
      await updatePortalRole(editOpen.role_key, {
        label_sw,
        label_en: label_en || null,
        hierarchy_rank: Number.isFinite(hierarchy_rank) ? hierarchy_rank : 500,
        description: description || null,
      });
      await logAudit("portal_role_update", "portal_roles", editOpen.role_key, { label_sw });
      pushToast("Jukumu limesasishwa.", "success");
      window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
      setEditOpen(null);
      await load();
    } catch (err) {
      reportError(err, "Majukumu — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  async function saveCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const role_key = String(fd.get("role_key") ?? "").trim().toLowerCase();
    const label_sw = String(fd.get("label_sw") ?? "").trim();
    const label_en = String(fd.get("label_en") ?? "").trim();
    const hierarchy_rank = Number(fd.get("hierarchy_rank") ?? 500);
    const description = String(fd.get("description") ?? "").trim();
    if (!role_key || !label_sw) {
      pushToast("role_key na jina la Kiswahili vinahitajika.", "error");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(role_key)) {
      pushToast("role_key lazima iwe lowercase, namba, na underscore tu.", "error");
      return;
    }
    if (rows.some((r) => r.role_key === role_key)) {
      pushToast("role_key tayari ipo.", "error");
      return;
    }
    setSaving(true);
    try {
      await createPortalRole({
        role_key,
        label_sw,
        label_en: label_en || null,
        hierarchy_rank: Number.isFinite(hierarchy_rank) ? hierarchy_rank : 500,
        description: description || null,
      });
      await logAudit("portal_role_create", "portal_roles", role_key, { label_sw });
      pushToast("Jukumu jipya limeundwa.", "success");
      window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
      setCreateOpen(false);
      await load();
    } catch (err) {
      reportError(err, "Majukumu — tengeneza");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-[#1e3a6e]/30 bg-gradient-to-r from-[#0a1628] via-[#132952] to-[#1e3a6e] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Ngazi & utambulisho</p>
        <h2 className="mt-1 text-2xl font-bold">Majukumu (Roles)</h2>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">
          Jedwali <code className="rounded bg-white/10 px-1">portal_roles</code> — ngazi ndogo = uwezo mkubwa. Funga anon kwenye uzalishani na tumia Auth +
          RLS.
        </p>
      </header>

      <PremiumTable<Row>
        title="Orodha ya majukumu"
        subtitle="Sasisha lebo na ngazi (si fungu la mfumo wa kitufe)"
        rows={rows}
        columns={[
          { key: "role_key", label: "Fungu", sortable: true },
          { key: "label_sw", label: "Jina (SW)", sortable: true },
          { key: "label_en", label: "Jina (EN)", sortable: true },
          { key: "hierarchy_rank", label: "Ngazi", sortable: true },
          { key: "description", label: "Maelezo", sortable: false },
        ]}
        onEdit={canEdit ? (r) => setEditOpen(r) : undefined}
        onAdd={canEdit ? () => setCreateOpen(true) : undefined}
        canAdd={canEdit}
        canEdit={canEdit}
        canDelete={false}
        exportBasename="Portal_Roles"
        isLoading={loading}
      />

      {editOpen && (
        <ModalScrollLayer
          onBackdropClick={() => setEditOpen(null)}
          maxWidthClass="max-w-lg"
          overlayClassName="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-black/50 px-4 py-10 backdrop-blur-sm"
        >
          <form
            onSubmit={(e) => void saveEdit(e)}
            className="w-full rounded-2xl border border-amber-200 bg-[#fffefb] p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#0f1e46]">Sasisha {editOpen.role_key}</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jina (Kiswahili)
                <input name="label_sw" required defaultValue={editOpen.label_sw} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jina (Kiingereza)
                <input name="label_en" defaultValue={editOpen.label_en ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Ngazi (nambari ndogo = juu zaidi)
                <input
                  name="hierarchy_rank"
                  type="number"
                  defaultValue={editOpen.hierarchy_rank}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Maelezo
                <textarea name="description" defaultValue={editOpen.description ?? ""} className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setEditOpen(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">
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
      {createOpen && (
        <ModalScrollLayer
          onBackdropClick={() => setCreateOpen(false)}
          maxWidthClass="max-w-lg"
          overlayClassName="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-black/50 px-4 py-10 backdrop-blur-sm"
        >
          <form onSubmit={(e) => void saveCreate(e)} className="w-full rounded-2xl border border-amber-200 bg-[#fffefb] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0f1e46]">Unda jukumu jipya</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-800">role_key (lowercase)
                <input name="role_key" required className="rounded-xl border border-slate-200 px-3 py-2" placeholder="member_user" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">Jina (Kiswahili)
                <input name="label_sw" required className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">Jina (Kiingereza)
                <input name="label_en" className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">Ngazi
                <input name="hierarchy_rank" type="number" defaultValue={500} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">Maelezo
                <textarea name="description" className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">Ghairi</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-blue-800 to-blue-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </form>
        </ModalScrollLayer>
      )}
    </div>
  );
}
