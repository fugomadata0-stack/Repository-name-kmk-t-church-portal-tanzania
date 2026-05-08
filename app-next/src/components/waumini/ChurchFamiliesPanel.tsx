import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { PremiumTable, type PremiumTableExcelBulk } from "../common/PremiumTable";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import {
  deleteChurchFamily,
  fetchChurchFamilies,
  fetchChurchMembers,
  upsertFamilyMemberLink,
  upsertChurchFamily,
} from "../../services/wauminiService";
import type { ChurchFamilyRecord, ChurchMemberRecord, DayosisiRecord } from "../../types";
import { buildChurchFamilyExcelBundle } from "../../lib/excelModuleFormSpecs";
import { bulkImportChurchFamilies } from "../../lib/portalExcelBulkHandlers";

type Row = ChurchFamilyRecord;

type CrudCb = (
  action: "create" | "update" | "delete",
  meta: { moduleKey: string; submodule: string; recordId?: string; targetSubmodule?: string }
) => void;

export function ChurchFamiliesPanel({
  dayosisi,
  highlightRecordId,
  crudContext,
  onCrudSuccess,
}: {
  dayosisi: DayosisiRecord[];
  highlightRecordId?: string | null;
  crudContext?: { moduleKey: string; submodule: string };
  onCrudSuccess?: CrudCb;
}) {
  const {
    pushToast,
    logAudit,
    reportError,
    canPortalCreateModule,
    canPortalEditModule,
    canPortalDeleteModule,
    canPortalExportModule,
  } = usePortal();
  const [rows, setRows] = useState<Row[]>([]);
  const [members, setMembers] = useState<ChurchMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<ChurchFamilyRecord> | null>(null);
  const [saving, setSaving] = useState(false);

  const shared = {
    canAdd: canPortalCreateModule("waumini"),
    canEdit: canPortalEditModule("waumini"),
    canDelete: canPortalDeleteModule("waumini"),
    canExport: canPortalExportModule("waumini"),
  };

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [familiesData, membersData] = await Promise.all([fetchChurchFamilies(), fetchChurchMembers()]);
      setRows(familiesData);
      setMembers(membersData);
    } catch (e) {
      reportError(e, "Familia — pakua orodha");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const excelBulk: PremiumTableExcelBulk = useMemo(() => {
    const spec = buildChurchFamilyExcelBundle();
    return {
      specTitle: spec.specTitle,
      specSubtitle: spec.specSubtitle,
      templateBasename: spec.templateBasename,
      columns: spec.columns,
      instructionRows: spec.instructionRows,
      onImportRows: shared.canAdd
        ? async (recs) => {
            const r = await bulkImportChurchFamilies(recs, {
              dayosisiList: dayosisi,
              reload: load,
              onEachSaved: (action, recordId) => {
                void logAudit("church_family_upsert", "church_families", recordId);
                if (crudContext && onCrudSuccess) {
                  onCrudSuccess(action, {
                    ...crudContext,
                    recordId,
                    targetSubmodule: crudContext.submodule,
                  });
                }
              },
            });
            return {
              ok: r.ok,
              fail: r.fail,
              message: `Excel: ${r.ok} zimehifadhiwa; ${r.fail} zimeshindwa.`,
            };
          }
        : undefined,
    };
  }, [shared.canAdd, dayosisi, load, crudContext, onCrudSuccess, logAudit]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft) return;
    const fd = new FormData(e.currentTarget);
    const family_name = String(fd.get("family_name") ?? "").trim();
    const dayosisi_id = String(fd.get("dayosisi_id") ?? "").trim() || null;
    const jimbo_name = String(fd.get("jimbo_name") ?? "").trim() || null;
    const tawi_name = String(fd.get("tawi_name") ?? "").trim() || null;
    const head_member_id = String(fd.get("head_member_id") ?? "").trim() || null;
    const phone = String(fd.get("phone") ?? "").trim() || null;
    const email = String(fd.get("email") ?? "").trim() || null;
    const maelezo = String(fd.get("maelezo") ?? "").trim() || null;
    if (!family_name) {
      pushToast("Jina la familia linahitajika.", "error");
      return;
    }
    setSaving(true);
    const wasNew = !draft.id;
    try {
      const saved = await upsertChurchFamily({
        id: draft.id,
        family_name,
        head_member_id,
        head_member_name: members.find((m) => m.id === head_member_id)?.jina_kamili ?? null,
        dayosisi_id,
        jimbo_name,
        tawi_name,
        phone,
        email,
        maelezo,
      });
      if (head_member_id) {
        await upsertFamilyMemberLink({
          family_id: saved.id,
          member_id: head_member_id,
          relationship_type: "baba",
        });
      }
      await logAudit("church_family_upsert", "church_families", saved.id);
      pushToast("Familia imehifadhiwa kwenye Supabase.", "success");
      window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
      if (crudContext && onCrudSuccess) {
        onCrudSuccess(wasNew ? "create" : "update", {
          ...crudContext,
          recordId: saved.id,
          targetSubmodule: crudContext.submodule,
        });
      } else if (wasNew) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setDraft(null);
      await load();
    } catch (err) {
      reportError(err, "Familia — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Familia</p>
        <h2 className="mt-1 text-2xl font-bold">Orodha ya familia</h2>
        <p className="mt-2 max-w-3xl text-sm text-emerald-100">
          Jedwali <code className="rounded bg-white/10 px-1">church_families</code> — kila familia inaweza kuunganishwa na waumini kwenye{" "}
          <code className="rounded bg-white/10 px-1">church_members</code>. Chini: Pakua blanki / Excel orodha / Pakia Excel.
        </p>
      </header>

      <PremiumTable<Row>
        title="Familia zilizosajiliwa"
        subtitle="Chagua dayosisi (mgongo wa data wa Supabase) au andika jimbo/tawi kwa maandishi"
        rows={rows}
        columns={[
          { key: "family_name", label: "Familia", sortable: true },
          { key: "head_member_name", label: "Mkuu wa kaya", sortable: true },
          { key: "jimbo_name", label: "Jimbo", sortable: true },
          { key: "tawi_name", label: "Tawi / kituo", sortable: true },
          { key: "phone", label: "Simu", sortable: false },
          { key: "email", label: "Barua pepe", sortable: false },
          {
            key: "status",
            label: "Hali",
            filterValues: ["Active"],
            sortable: false,
          },
        ]}
        onAdd={shared.canAdd ? () => setDraft({}) : undefined}
        onEdit={shared.canEdit ? (r) => setDraft(r) : undefined}
        onDelete={
          shared.canDelete
            ? async (id) => {
                try {
                  await deleteChurchFamily(id);
                  await logAudit("church_family_delete", "church_families", id);
                  pushToast("Familia imefutwa.", "success");
                  if (crudContext && onCrudSuccess) {
                    onCrudSuccess("delete", { ...crudContext, recordId: id });
                  }
                  window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
                  await load();
                } catch (err) {
                  reportError(err, "Familia — futa");
                }
              }
            : undefined
        }
        {...shared}
        exportBasename="Church_Families"
        excelBulk={excelBulk}
        isLoading={loading}
        highlightRowId={highlightRecordId ?? undefined}
        actionsDisabled={saving || !!draft}
      />

      {draft && (
        <ModalScrollLayer
          onBackdropClick={() => setDraft(null)}
          maxWidthClass="max-w-lg"
          overlayClassName="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-black/50 px-4 py-10 backdrop-blur-sm"
        >
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="w-full rounded-2xl border border-emerald-200 bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#0f1e46]">{draft.id ? "Hariri familia" : "Familia mpya"}</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jina la familia *
                <input name="family_name" required defaultValue={draft.family_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Dayosisi (mgongo)
                <select name="dayosisi_id" defaultValue={draft.dayosisi_id ?? ""} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">—</option>
                  {dayosisi.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.jina}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jimbo (maandishi)
                <input name="jimbo_name" defaultValue={draft.jimbo_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Tawi / kituo
                <input name="tawi_name" defaultValue={draft.tawi_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Mkuu wa kaya
                <select name="head_member_id" defaultValue={draft.head_member_id ?? ""} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">—</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.jina_kamili} {m.member_number ? `(${m.member_number})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Simu
                <input name="phone" defaultValue={draft.phone ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Barua pepe
                <input name="email" type="email" defaultValue={draft.email ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Maelezo
                <textarea name="maelezo" defaultValue={draft.maelezo ?? ""} className="min-h-[72px] rounded-xl border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
              >
                Ghairi
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
