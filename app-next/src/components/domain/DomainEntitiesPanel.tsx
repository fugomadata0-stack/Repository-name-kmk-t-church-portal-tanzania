import { useCallback, useEffect, useMemo, useState } from "react";
import { PremiumTable, type PremiumTableExcelBulk } from "../common/PremiumTable";
import { usePortal } from "../../context/PortalContext";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";
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
import { TanzaniaLocationFields } from "../common/TanzaniaLocationFields";
import { buildDomainEntityExcelBundle } from "../../lib/excelModuleFormSpecs";
import { bulkImportDomainEntities } from "../../lib/portalExcelBulkHandlers";
import {
  buildHierarchySummary,
  calculateRegistrationCompleteness,
  exportEnterpriseRegistrationProfilePdf,
  generateRegistrationCode,
  parseAttachmentUrls,
  parseTags,
  registrationLevelFromSubmodule,
} from "../../lib/enterpriseRegistration";

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
  const { pushToast, reportError, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule, canPortalExportModule } =
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

  const roleBased = {
    canAdd: canPortalCreateModule(moduleKey),
    canEdit: canPortalEditModule(moduleKey),
    canDelete: canPortalDeleteModule(moduleKey),
    canExport: canPortalExportModule(moduleKey),
  };
  const shared = roleBased;

  const submoduleKeyResolved = (contextKey ?? (submodule && submodule !== "Overview" && submodule !== "Muhtasari" ? submodule : "")).trim();

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
  const isStructureRegistration = moduleKey === "muundo";
  const registrationLevel = useMemo(() => registrationLevelFromSubmodule(contextKey ?? submodule), [contextKey, submodule]);

  const onSave = async (payload: Partial<DomainEntityRecord>) => {
    if (moduleKey === "muundo" && !roleBased.canAdd && !editing?.id) {
      pushToast("Huna ruhusa ya kuongeza kwenye muundo wa kanisa.", "error");
      return;
    }
    if (moduleKey === "muundo" && !roleBased.canEdit && !!editing?.id) {
      pushToast("Huna ruhusa ya kuhariri muundo wa kanisa.", "error");
      return;
    }
    const sk = contextKey ?? (submodule && submodule !== "Overview" && submodule !== "Muhtasari" ? submodule : "");
    const incomingExtra = payload.extra as Record<string, unknown> | undefined;
    const parentName = String(incomingExtra?.parent_level ?? "").trim();
    const generatedCode = generateRegistrationCode({
      level: registrationLevel,
      name: String(payload.title ?? "").trim(),
      parentName,
      date: String(payload.event_date ?? ""),
    });
    const hierarchySummary = buildHierarchySummary({
      level: registrationLevel,
      name: String(payload.title ?? "").trim(),
      parentName,
      mkoa: String(incomingExtra?.mkoa ?? ""),
      wilaya: String(incomingExtra?.wilaya ?? ""),
      kata: String(incomingExtra?.kata_mtaa ?? ""),
    });
    const completedExtra =
      isStructureRegistration && incomingExtra
        ? {
            ...incomingExtra,
            official_name: String(incomingExtra.official_name || payload.title || "").trim(),
            short_code: String(incomingExtra.short_code || payload.reference_code || generatedCode).trim(),
            hierarchy_summary: hierarchySummary,
            profile_completeness: calculateRegistrationCompleteness({
              ...incomingExtra,
              title: payload.title,
              reference_code: payload.reference_code || generatedCode,
              category: payload.category,
              details: payload.details,
              event_date: payload.event_date,
              status: payload.status,
            }),
          }
        : incomingExtra;
    const merged: Partial<DomainEntityRecord> & { module_key: string; title: string } = {
      module_key: moduleKey,
      submodule_key: sk,
      title: String(payload.title ?? "").trim(),
      details: payload.details,
      category: payload.category,
      reference_code: String(payload.reference_code ?? "").trim() || (isStructureRegistration ? generatedCode : ""),
      event_date: payload.event_date,
      extra: completedExtra ?? payload.extra,
      profile_completeness:
        isStructureRegistration && completedExtra ? Number(completedExtra.profile_completeness ?? 0) : payload.profile_completeness,
      hierarchy_summary: isStructureRegistration ? hierarchySummary : payload.hierarchy_summary,
      attachment_urls: Array.isArray(completedExtra?.attachment_urls) ? (completedExtra.attachment_urls as string[]) : payload.attachment_urls,
      category_tags: Array.isArray(completedExtra?.category_tags) ? (completedExtra.category_tags as string[]) : payload.category_tags,
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
      {moduleKey === "muundo" && !roleBased.canAdd && !roleBased.canEdit ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Huna ruhusa ya kusimamia muundo wa kanisa.
        </div>
      ) : null}
      <PremiumTable
        title={title ?? `Rekodi — ${moduleKey}`}
        subtitle={subtitle ?? `Submodule: ${submodule}${contextKey ? ` · ${contextKey}` : ""}`}
        persistenceScope={portalPremiumTableScope([moduleKey, submodule, contextKey ?? "ctx", "entities"])}
        rows={rows}
        columns={[
          { key: "title", label: "Kichwa" },
          { key: "category", label: "Kundi" },
          { key: "reference_code", label: "Nambari / Ref" },
          ...(isStructureRegistration
            ? [
                {
                  key: "hierarchy_summary",
                  label: "Hierarchy",
                  exportValue: (r: DomainEntityRecord) => String(r.hierarchy_summary || r.extra?.hierarchy_summary || ""),
                  render: (r: DomainEntityRecord) => (
                    <span className="line-clamp-2 text-xs text-slate-600">
                      {String(r.hierarchy_summary || r.extra?.hierarchy_summary || "KMK(T)")}
                    </span>
                  ),
                },
                {
                  key: "profile_completeness",
                  label: "Ukamilifu",
                  exportValue: (r: DomainEntityRecord) => `${Number(r.profile_completeness ?? r.extra?.profile_completeness ?? 0)}%`,
                  render: (r: DomainEntityRecord) => {
                    const pct = Number(r.profile_completeness ?? r.extra?.profile_completeness ?? 0);
                    return <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{pct}%</span>;
                  },
                },
              ]
            : []),
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
        <ModalScrollLayer onBackdropClick={() => setEditing(null)} maxWidthClass={isStructureRegistration ? "max-w-5xl" : "max-w-lg"}>
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
                      official_name: fd.get("official_name"),
                      short_code: fd.get("short_code"),
                      logo_url: fd.get("logo_url"),
                      photo_url: fd.get("photo_url"),
                      signature_url: fd.get("signature_url"),
                      parent_level: fd.get("parent_level"),
                      mkoa: fd.get("mkoa"),
                      wilaya: fd.get("wilaya"),
                      kata_mtaa: fd.get("kata_mtaa"),
                      kijiji_mtaa: fd.get("kijiji_mtaa"),
                      address: fd.get("address"),
                      gps_coordinates: fd.get("gps_coordinates"),
                      contact_person: fd.get("contact_person"),
                      phone: fd.get("phone"),
                      email: fd.get("email"),
                      website: fd.get("website"),
                      leader_name: fd.get("leader_name"),
                      assistant_leaders: fd.get("assistant_leaders"),
                      secretary_name: fd.get("secretary_name"),
                      treasurer_name: fd.get("treasurer_name"),
                      notes: fd.get("notes"),
                      attachment_urls: parseAttachmentUrls(fd.get("attachment_urls")),
                      custom_fields: {
                        registration_level: registrationLevel,
                        registration_source: "enterprise_registration_form",
                      },
                      category_tags: parseTags(fd.get("category_tags")),
                    }
                  : editing.extra,
                status: fd.get("status"),
              } as Partial<DomainEntityRecord>);
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Enterprise Registration · {registrationLevel.toUpperCase()}
                </p>
                <h3 className="text-lg font-bold text-slate-900">{editing.id ? "Hariri" : "Ongeza"}</h3>
              </div>
              {isStructureRegistration && editing.id ? (
                <button
                  type="button"
                  onClick={() => void exportEnterpriseRegistrationProfilePdf(editing as DomainEntityRecord, { level: registrationLevel, submodule })}
                  className="rounded-xl border border-[#D4AF37]/60 bg-amber-50 px-3 py-2 text-xs font-bold text-[#0B1F3A] shadow-sm"
                >
                  PDF ya Wasifu
                </button>
              ) : null}
            </div>
            {isStructureRegistration ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
                Mfumo huu hujaza code, hierarchy summary na profile completeness kiotomatiki. Jaza taarifa nyingi kadri
                iwezekanavyo ili PDF na records ziwe rasmi.
              </div>
            ) : null}
            <div className="mt-3 grid gap-2 md:grid-cols-2">
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
                    Jina rasmi
                    <input name="official_name" defaultValue={String((editing.extra?.official_name as string) ?? editing.title ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Short code
                    <input
                      name="short_code"
                      defaultValue={String((editing.extra?.short_code as string) ?? editing.reference_code ?? "")}
                      placeholder="Auto ikiwa tupu"
                      className="rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Logo URL
                    <input name="logo_url" defaultValue={String((editing.extra?.logo_url as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Picha/Profile URL
                    <input name="photo_url" defaultValue={String((editing.extra?.photo_url as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Signature URL
                    <input name="signature_url" defaultValue={String((editing.extra?.signature_url as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Parent level
                    <input name="parent_level" defaultValue={String((editing.extra?.parent_level as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <div className="md:col-span-2">
                    <TanzaniaLocationFields
                      formMode
                      defaultValue={{
                        mkoa: String((editing.extra?.mkoa as string) ?? ""),
                        wilaya: String((editing.extra?.wilaya as string) ?? ""),
                        kata: String((editing.extra?.kata_mtaa as string) ?? ""),
                        mtaa: String((editing.extra?.kijiji_mtaa as string) ?? ""),
                      }}
                      names={{ mkoa: "mkoa", wilaya: "wilaya", kata: "kata_mtaa", mtaa: "kijiji_mtaa" }}
                    />
                  </div>
                  <label className="grid gap-1 text-xs">
                    Anwani kamili
                    <input name="address" defaultValue={String((editing.extra?.address as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    GPS / Location
                    <input name="gps_coordinates" defaultValue={String((editing.extra?.gps_coordinates as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
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
                  <label className="grid gap-1 text-xs">
                    Website
                    <input name="website" defaultValue={String((editing.extra?.website as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Kiongozi mkuu
                    <input name="leader_name" defaultValue={String((editing.extra?.leader_name as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Assistant leaders
                    <input name="assistant_leaders" defaultValue={String((editing.extra?.assistant_leaders as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Katibu
                    <input name="secretary_name" defaultValue={String((editing.extra?.secretary_name as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Mweka Hazina
                    <input name="treasurer_name" defaultValue={String((editing.extra?.treasurer_name as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs md:col-span-2">
                    Category tags
                    <input name="category_tags" defaultValue={Array.isArray(editing.extra?.category_tags) ? (editing.extra.category_tags as string[]).join(", ") : String(editing.extra?.category_tags ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs md:col-span-2">
                    Attachments/Documents URLs (moja kwa mstari)
                    <textarea name="attachment_urls" rows={2} defaultValue={Array.isArray(editing.extra?.attachment_urls) ? (editing.extra.attachment_urls as string[]).join("\n") : ""} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs md:col-span-2">
                    Notes / Maoni ya ndani
                    <textarea name="notes" rows={2} defaultValue={String((editing.extra?.notes as string) ?? "")} className="rounded-lg border px-3 py-2 text-sm" />
                  </label>
                </>
              ) : null}
              <label className="grid gap-1 text-xs">
                Nambari / Ref
                <input
                  name="reference_code"
                  defaultValue={String(editing.reference_code ?? "")}
                  placeholder={isStructureRegistration ? "Auto code ikiwa tupu" : undefined}
                  className="rounded-lg border px-3 py-2 text-sm"
                />
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
