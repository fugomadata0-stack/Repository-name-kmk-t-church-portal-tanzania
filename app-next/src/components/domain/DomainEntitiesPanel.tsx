import { useCallback, useEffect, useMemo, useState } from "react";
import { PremiumTable, type PremiumTableExcelBulk } from "../common/PremiumTable";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { modules } from "../../data/portalModules";
import {
  deleteDomainEntity,
  fetchDomainEntities,
  isDomainEntityUuid,
  upsertDomainEntity,
} from "../../services/domainModuleService";
import type { DomainEntityRecord } from "../../types";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { buildDomainEntityExcelBundle } from "../../lib/excelModuleFormSpecs";
import { bulkImportDomainEntities } from "../../lib/portalExcelBulkHandlers";

type CrudMeta = {
  moduleKey: string;
  submodule: string;
  recordId?: string;
  targetSubmodule?: string;
};

interface Props {
  moduleKey: string;
  submodule: string;
  contextKey?: string;
  title?: string;
  subtitle?: string;
  highlightRecordId?: string | null;
  onCrudSuccess?: (action: "create" | "update" | "delete", meta: CrudMeta) => void;
}

function pickValidSubmodule(moduleKey: string, key: string | null | undefined): string | undefined {
  if (!key?.trim()) return undefined;
  const m = modules.find((x) => x.key === moduleKey);
  return m?.submodules.includes(key) ? key : undefined;
}

export function DomainEntitiesPanel({
  moduleKey,
  submodule,
  contextKey,
  title,
  subtitle,
  highlightRecordId,
  onCrudSuccess,
}: Props) {
  const { role, pushToast, reportError, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule, canPortalExportModule } =
    usePortal();
  const [rows, setRows] = useState<DomainEntityRecord[]>([]);
  const [editing, setEditing] = useState<Partial<DomainEntityRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getSupabase()) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchDomainEntities(moduleKey, {
        submoduleKey: contextKey ? undefined : submodule,
        contextKey,
      });
      setRows(list);
    } catch (err) {
      reportError(err, "Kikoa — pakua orodha");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [moduleKey, submodule, contextKey, reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const canManageMuundo = moduleKey === "muundo" ? role === "super_admin" : undefined;
  const roleBased = {
    canAdd: canPortalCreateModule(moduleKey),
    canEdit: canPortalEditModule(moduleKey),
    canDelete: canPortalDeleteModule(moduleKey),
    canExport: canPortalExportModule(moduleKey),
  };
  const shared = {
    canAdd: canManageMuundo ?? roleBased.canAdd,
    canEdit: canManageMuundo ?? roleBased.canEdit,
    canDelete: canManageMuundo ?? roleBased.canDelete,
    canExport: roleBased.canExport,
  };

  const submoduleKeyResolved = (contextKey ?? (submodule && submodule !== "Overview" ? submodule : "")).trim();

  const excelBulk: PremiumTableExcelBulk | undefined = useMemo(() => {
    const spec = buildDomainEntityExcelBundle(moduleKey, submodule, contextKey);
    return {
      specTitle: spec.specTitle,
      specSubtitle: spec.specSubtitle,
      templateBasename: spec.templateBasename,
      columns: spec.columns,
      instructionRows: spec.instructionRows,
      onImportRows: shared.canAdd
        ? async (recs) => {
            const r = await bulkImportDomainEntities(recs, {
              moduleKey,
              submoduleKey: submoduleKeyResolved,
              setRows,
              onSaved: (action, recordId) => {
                const target = pickValidSubmodule(moduleKey, submoduleKeyResolved);
                onCrudSuccess?.(action, { moduleKey, submodule, recordId, targetSubmodule: target });
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
  }, [moduleKey, submodule, contextKey, submoduleKeyResolved, shared.canAdd, onCrudSuccess]);

  const actionsLocked = !!editing || saving || !!deletingId;

  const onSave = async (payload: Partial<DomainEntityRecord>) => {
    if (moduleKey === "muundo" && !shared.canAdd && !editing?.id) {
      pushToast("Huna ruhusa ya kusimamia muundo wa kanisa.", "error");
      return;
    }
    if (moduleKey === "muundo" && !shared.canEdit && !!editing?.id) {
      pushToast("Huna ruhusa ya kusimamia muundo wa kanisa.", "error");
      return;
    }
    const sk = contextKey ?? (submodule && submodule !== "Overview" ? submodule : "");
    const merged: Partial<DomainEntityRecord> & { module_key: string; title: string } = {
      module_key: moduleKey,
      submodule_key: sk,
      title: String(payload.title ?? "").trim(),
      details: payload.details,
      category: payload.category,
      reference_code: payload.reference_code,
      event_date: payload.event_date,
      status: payload.status ?? "Active",
      ...(editing?.id && isDomainEntityUuid(editing.id) ? { id: editing.id } : {}),
    };
    if (!merged.title) {
      pushToast("Kichwa kinahitajika.", "error");
      return;
    }
    if (moduleKey === "muundo") {
      const phone = String((payload.extra as Record<string, unknown> | undefined)?.phone ?? "").trim();
      const email = String((payload.extra as Record<string, unknown> | undefined)?.email ?? "").trim();
      const parent = String((payload.extra as Record<string, unknown> | undefined)?.parent_level ?? "").trim();
      if (["Majimbo", "Matawi / Vituo", "Idara", "Huduma", "Taasisi", "Jumuiya"].includes(submodule) && !parent) {
        pushToast("Parent level inahitajika kwa ngazi hii.", "error");
        return;
      }
      if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
        pushToast("Namba ya simu si sahihi.", "error");
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        pushToast("Barua pepe si sahihi.", "error");
        return;
      }
      const dupName = rows.some(
        (x) =>
          x.id !== editing?.id &&
          x.title.trim().toLowerCase() === merged.title.toLowerCase() &&
          String((x.extra?.parent_level ?? "")).trim().toLowerCase() === parent.toLowerCase()
      );
      if (dupName) {
        pushToast("Jina hili tayari lipo chini ya parent hiyo.", "error");
        return;
      }
      const code = String(merged.reference_code ?? "").trim().toLowerCase();
      if (code) {
        const dupCode = rows.some((x) => x.id !== editing?.id && String(x.reference_code ?? "").trim().toLowerCase() === code);
        if (dupCode) {
          pushToast("Code tayari imetumika.", "error");
          return;
        }
      }
    }
    setSaving(true);
    try {
      const saved = await upsertDomainEntity(merged);
      setRows((prev) => {
        const upd = editing?.id && isDomainEntityUuid(editing.id);
        return upd ? prev.map((x) => (x.id === editing!.id ? saved : x)) : [saved, ...prev];
      });
      pushToast("Imehifadhiwa.", "success");
      const updating = Boolean(editing?.id && isDomainEntityUuid(editing.id));
      const target = pickValidSubmodule(moduleKey, saved.submodule_key);
      onCrudSuccess?.(updating ? "update" : "create", {
        moduleKey,
        submodule,
        recordId: saved.id,
        targetSubmodule: target,
      });
      setEditing(null);
    } catch (err) {
      reportError(err, "Kikoa — hifadhi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {moduleKey === "muundo" && !shared.canAdd ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Huna ruhusa ya kusimamia muundo wa kanisa.
        </div>
      ) : null}
      <PremiumTable
        title={title ?? `Rekodi — ${moduleKey}`}
        subtitle={subtitle ?? `Submodule: ${submodule}${contextKey ? ` · ${contextKey}` : ""}`}
        rows={rows}
        columns={[
          { key: "title", label: "Kichwa" },
          { key: "category", label: "Kundi" },
          { key: "reference_code", label: "Nambari / Ref" },
          { key: "event_date", label: "Tarehe" },
          { key: "details", label: "Maelezo" },
          { key: "status", label: "Status" },
        ]}
        isLoading={loading}
        highlightRowId={highlightRecordId ?? undefined}
        actionsDisabled={actionsLocked}
        onAdd={() =>
          setEditing({
            module_key: moduleKey,
            submodule_key: contextKey ?? submodule,
            title: "",
            details: "",
            category: "",
            reference_code: "",
            event_date: "",
            status: "Active",
            extra: {},
          })
        }
        onEdit={(r) => setEditing(r)}
        onDelete={async (id) => {
          if (!shared.canDelete) {
            pushToast("Huna ruhusa ya kusimamia muundo wa kanisa.", "error");
            return;
          }
          if (!getSupabase()) {
            pushToast("Imeshindikana kuwasiliana na seva.", "error");
            return;
          }
          setDeletingId(id);
          try {
            await deleteDomainEntity(id);
            setRows((p) => p.filter((x) => x.id !== id));
            pushToast("Imefutwa.", "success");
            onCrudSuccess?.("delete", { moduleKey, submodule, recordId: id });
          } catch (err) {
            reportError(err, "Kikoa — futa");
          } finally {
            setDeletingId(null);
          }
        }}
        excelBulk={excelBulk}
        {...shared}
      />

      {editing ? (
        <ModalScrollLayer onBackdropClick={() => setEditing(null)} maxWidthClass="max-w-lg">
          <form
            className="w-full rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void onSave({
                title: fd.get("title"),
                details: fd.get("details"),
                category: fd.get("category"),
                reference_code: fd.get("reference_code"),
                event_date: fd.get("event_date"),
                extra: moduleKey === "muundo"
                  ? {
                      parent_level: fd.get("parent_level"),
                      mkoa: fd.get("mkoa"),
                      wilaya: fd.get("wilaya"),
                      kata_mtaa: fd.get("kata_mtaa"),
                      contact_person: fd.get("contact_person"),
                      phone: fd.get("phone"),
                      email: fd.get("email"),
                    }
                  : editing.extra,
                status: fd.get("status"),
              } as Partial<DomainEntityRecord>);
            }}
          >
            <h3 className="text-lg font-bold text-slate-900">{editing.id ? "Hariri" : "Ongeza"}</h3>
            <div className="mt-3 grid gap-2">
              <label className="grid gap-1 text-xs">
                Kichwa *
                <input name="title" required defaultValue={String(editing.title ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Kundi
                <input name="category" defaultValue={String(editing.category ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              {moduleKey === "muundo" ? (
                <>
                  <label className="grid gap-1 text-xs">
                    Parent level
                    <input name="parent_level" defaultValue={String((editing.extra?.parent_level as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Mkoa
                    <input name="mkoa" defaultValue={String((editing.extra?.mkoa as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Wilaya
                    <input name="wilaya" defaultValue={String((editing.extra?.wilaya as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Kata/Mtaa
                    <input name="kata_mtaa" defaultValue={String((editing.extra?.kata_mtaa as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Contact person
                    <input name="contact_person" defaultValue={String((editing.extra?.contact_person as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Phone
                    <input name="phone" defaultValue={String((editing.extra?.phone as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Email
                    <input name="email" defaultValue={String((editing.extra?.email as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                </>
              ) : null}
              <label className="grid gap-1 text-xs">
                Nambari / Ref
                <input name="reference_code" defaultValue={String(editing.reference_code ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Tarehe (hafla / mwisho wa wiki / benki)
                <input name="event_date" type="date" defaultValue={editing.event_date?.slice(0, 10)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs md:col-span-2">
                Maelezo
                <textarea name="details" rows={3} defaultValue={String(editing.details ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Status
                <input name="status" defaultValue={editing.status ?? "Active"} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Funga
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#0B1F3A] px-3 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#123C69] disabled:opacity-50"
              >
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </form>
        </ModalScrollLayer>
      ) : null}
    </div>
  );
}
