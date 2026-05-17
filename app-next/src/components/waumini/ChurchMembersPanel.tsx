import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";
import { PremiumTable, type PremiumTableExcelBulk } from "../common/PremiumTable";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import {
  deleteChurchMember,
  ensureMemberCard,
  fetchChurchFamilies,
  fetchChurchMembers,
  upsertFamilyMemberLink,
  upsertChurchMember,
} from "../../services/wauminiService";
import { queueMemberWelcomeSms } from "../../services/communicationsService";
import type {
  ChurchStructureEntity,
  ChurchFamilyRecord,
  ChurchMemberRecord,
  DayosisiRecord,
  MembershipStatusDb,
} from "../../types";
import { buildChurchMemberExcelBundle } from "../../lib/excelModuleFormSpecs";
import { bulkImportChurchMembers } from "../../lib/portalExcelBulkHandlers";
import { exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";
import { fetchCascadeOptions } from "../../services/churchStructureService";
import { StructureCascadeSelector } from "../common/StructureCascadeSelector";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";
import { MINISTRY_SEGMENT_OPTIONS, parseMinistrySegment } from "../../lib/membershipIntelligence";
import type { MinistrySegmentDb } from "../../types";

type Row = ChurchMemberRecord;
const PHONE_RE = /^\+?[0-9]{9,15}$/;

const MS_SW: Record<MembershipStatusDb, string> = {
  active: "Hai / Active",
  visitor: "Mgeni",
  transferred: "Alihamishiwa",
  deceased: "Amefariki",
  suspended: "Amezuiwa",
};

function hdr(mode: "list" | "baptism" | "status" | "profiles"): { t: string; s: string } {
  switch (mode) {
    case "baptism":
      return { t: "Ubatizo & uthibitisho", s: "Waumini walio na tarehe ya ubatizo au alama ya ubatizo." };
    case "status":
      return { t: "Hali ya uanachama", s: "Chuja kwa hali — data yote iko kwenye jedwali church_members." };
    case "profiles":
      return { t: "Wasifu wa waumini", s: "Muhtasari wa anwani na maelezo kwa mtumiaji wa huduma." };
    default:
      return { t: "Orodha ya waumini", s: "Rekodi kamili — familia, ngazi, ubatizo." };
  }
}

type CrudCb = (
  action: "create" | "update" | "delete",
  meta: { moduleKey: string; submodule: string; recordId?: string; targetSubmodule?: string }
) => void;

export function ChurchMembersPanel({
  dayosisi,
  mode,
  highlightRecordId,
  crudContext,
  onCrudSuccess,
}: {
  dayosisi: DayosisiRecord[];
  mode: "list" | "baptism" | "status" | "profiles";
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
    canScopeMutateRecord,
    notifyScopeDenied,
  } = usePortal();
  const [rows, setRows] = useState<Row[]>([]);
  const [families, setFamilies] = useState<ChurchFamilyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<ChurchMemberRecord> | null>(null);
  const [cardRow, setCardRow] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [structure, setStructure] = useState<{
    dayosisi: ChurchStructureEntity[];
    majimbo: ChurchStructureEntity[];
    matawi: ChurchStructureEntity[];
    idara: ChurchStructureEntity[];
    huduma: ChurchStructureEntity[];
    taasisi: ChurchStructureEntity[];
    jumuiya: ChurchStructureEntity[];
  }>({
    dayosisi: [],
    majimbo: [],
    matawi: [],
    idara: [],
    huduma: [],
    taasisi: [],
    jumuiya: [],
  });
  const [cascade, setCascade] = useState<{ dayosisi_id?: string; jimbo_id?: string; tawi_id?: string }>({});

  const scopeHierarchy = useMemo(
    () => ({
      majimbo: structure.majimbo.map((x) => ({ id: x.id, dayosisi_id: x.parent_id ?? null })),
      matawi: structure.matawi.map((x) => ({ id: x.id, jimbo_id: x.parent_id ?? null })),
    }),
    [structure.majimbo, structure.matawi]
  );

  const shared = {
    canAdd: canPortalCreateModule("waumini"),
    canEdit: canPortalEditModule("waumini"),
    canDelete: canPortalDeleteModule("waumini"),
    canExport: canPortalExportModule("waumini"),
  };

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([]);
      setFamilies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [fam, mem] = await Promise.all([
        fetchChurchFamilies(),
        fetchChurchMembers({
          baptizedOnly: mode === "baptism",
        }),
      ]);
      setFamilies(fam);
      setRows(mem);
    } catch (e) {
      reportError(e, "Waumini — pakua orodha");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportError, mode]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setCascade({
      dayosisi_id: draft?.dayosisi_id ?? "",
      jimbo_id: draft?.jimbo_id ?? "",
      tawi_id: draft?.tawi_id ?? "",
    });
  }, [draft?.id, draft?.dayosisi_id, draft?.jimbo_id, draft?.tawi_id]);
  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchCascadeOptions();
        setStructure({
          dayosisi: data.dayosisi,
          majimbo: data.majimbo,
          matawi: data.matawi,
          idara: data.idara,
          huduma: data.huduma,
          taasisi: data.taasisi,
          jumuiya: data.jumuiya,
        });
      } catch {
        setStructure({ dayosisi: [], majimbo: [], matawi: [], idara: [], huduma: [], taasisi: [], jumuiya: [] });
      }
    })();
  }, []);

  const excelBulk: PremiumTableExcelBulk = useMemo(() => {
    const spec = buildChurchMemberExcelBundle(mode);
    return {
      specTitle: spec.specTitle,
      specSubtitle: spec.specSubtitle,
      templateBasename: spec.templateBasename,
      columns: spec.columns,
      instructionRows: spec.instructionRows,
      onImportRows: shared.canAdd
        ? async (recs) => {
            const r = await bulkImportChurchMembers(recs, {
              families,
              dayosisiList: dayosisi,
              reload: load,
              onEachSaved: (action, recordId) => {
                void logAudit("church_member_upsert", "church_members", recordId);
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
  }, [mode, shared.canAdd, families, dayosisi, load, crudContext, onCrudSuccess, logAudit]);

  const columns = useMemo(() => {
    const base = [
      { key: "jina_kamili", label: "Jina", sortable: true },
      { key: "family_name", label: "Familia", sortable: true },
      {
        key: "membership_status",
        label: "Hali ya uanachama",
        sortable: true,
        render: (r: Row) => <span className="text-sm">{MS_SW[r.membership_status] ?? r.membership_status}</span>,
      },
      { key: "tawi_name", label: "Tawi", sortable: true },
      { key: "phone", label: "Simu", sortable: false },
      {
        key: "baptism_date",
        label: "Ubatizo (tarehe)",
        sortable: true,
        render: (r: Row) => (r.baptism_date ? r.baptism_date : "—"),
      },
      {
        key: "is_baptized",
        label: "Amebatizwa",
        sortable: false,
        render: (r: Row) => (r.is_baptized ? "Ndiyo" : "Hapana"),
      },
      {
        key: "notes",
        label: "Maelezo",
        sortable: false,
        render: (r: Row) => (
          <span className="line-clamp-2 max-w-[220px] text-xs text-slate-600">{r.notes?.trim() || "—"}</span>
        ),
      },
      {
        key: "member_card",
        label: "Kadi",
        sortable: false,
        render: (r: Row) => (
          <button
            type="button"
            className="rounded-lg border border-[#D4AF37]/60 bg-[#D4AF37]/10 px-2 py-1 text-xs font-semibold text-[#0B1F3A]"
            onClick={() => setCardRow(r)}
          >
            View Card
          </button>
        ),
        exportValue: () => "Card available",
      },
      {
        key: "status",
        label: "Chujio",
        filterValues: ["Active", "Pending", "Inactive", "Archived", "Needs Review"],
        sortable: true,
      },
    ];
    if (mode === "profiles") {
      return [
        { key: "jina_kamili", label: "Jina kamili", sortable: true },
        { key: "family_name", label: "Familia", sortable: true },
        { key: "email", label: "Barua pepe", sortable: false },
        { key: "phone", label: "Simu", sortable: false },
        { key: "birth_date", label: "Tarehe ya kuzaliwa", sortable: true },
        {
          key: "membership_status",
          label: "Hali ya uanachama",
          sortable: true,
          render: (r: Row) => <span className="text-sm">{MS_SW[r.membership_status] ?? r.membership_status}</span>,
        },
        { key: "tawi_name", label: "Tawi", sortable: true },
        {
          key: "notes",
          label: "Maelezo",
          sortable: false,
          render: (r: Row) => (
            <span className="line-clamp-3 max-w-[280px] text-xs text-slate-600">{r.notes?.trim() || "—"}</span>
          ),
        },
        {
          key: "status",
          label: "Chujio",
          filterValues: ["Active", "Pending", "Inactive", "Archived", "Needs Review"],
          sortable: true,
        },
      ];
    }
    if (mode === "baptism") {
      return [
        { key: "jina_kamili", label: "Jina", sortable: true },
        { key: "baptism_date", label: "Tarehe ya ubatizo", sortable: true },
        { key: "baptism_place", label: "Mahali", sortable: false },
        { key: "family_name", label: "Familia", sortable: true },
        { key: "tawi_name", label: "Tawi", sortable: true },
        {
          key: "status",
          label: "Chujio",
          filterValues: ["Active", "Pending", "Inactive", "Archived", "Needs Review"],
          sortable: true,
        },
      ];
    }
    return base;
  }, [mode]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft) return;
    const fd = new FormData(e.currentTarget);
    const first_name = String(fd.get("first_name") ?? "").trim();
    const last_name = String(fd.get("last_name") ?? "").trim();
    const family_id = String(fd.get("family_id") ?? "").trim() || null;
    const gender = String(fd.get("gender") ?? "").trim();
    const birth_date = String(fd.get("birth_date") ?? "").trim() || null;
    const phone = String(fd.get("phone") ?? "").trim() || null;
    const email = String(fd.get("email") ?? "").trim() || null;
    const relation_to_head = String(fd.get("relation_to_head") ?? "").trim() || null;
    const nida_number = String(fd.get("nida_number") ?? "").trim() || null;
    const photo_url = String(fd.get("photo_url") ?? "").trim() || null;
    const marital_status = String(fd.get("marital_status") ?? "").trim() || null;
    const occupation = String(fd.get("occupation") ?? "").trim() || null;
    const region_name = String(fd.get("region_name") ?? "").trim() || null;
    const district_name = String(fd.get("district_name") ?? "").trim() || null;
    const ward_street = String(fd.get("ward_street") ?? "").trim() || null;
    const membership_status = String(fd.get("membership_status") ?? "active") as MembershipStatusDb;
    const baptism_date = String(fd.get("baptism_date") ?? "").trim() || null;
    const baptism_place = String(fd.get("baptism_place") ?? "").trim() || null;
    const is_baptized = fd.get("is_baptized") === "on";
    const member_number = String(fd.get("member_number") ?? "").trim() || null;
    const dayosisi_id = String(fd.get("dayosisi_id") ?? "").trim() || null;
    const jimbo_id = String(fd.get("jimbo_id") ?? "").trim() || null;
    const tawi_id = String(fd.get("tawi_id") ?? "").trim() || null;
    const jimbo_name =
      structure.majimbo.find((x) => x.id === jimbo_id)?.name ?? (String(fd.get("jimbo_name") ?? "").trim() || null);
    const tawi_name =
      structure.matawi.find((x) => x.id === tawi_id)?.name ?? (String(fd.get("tawi_name") ?? "").trim() || null);
    const jumuiya_name = String(fd.get("jumuiya_name") ?? "").trim() || null;
    const idara_name = String(fd.get("idara_name") ?? "").trim() || null;
    const huduma_name = String(fd.get("huduma_name") ?? "").trim() || null;
    const notes = String(fd.get("notes") ?? "").trim() || null;
    const ministry_segment = parseMinistrySegment(String(fd.get("ministry_segment") ?? "")) as MinistrySegmentDb;
    if (!first_name || !last_name) {
      pushToast("Jaza taarifa muhimu.", "error");
      return;
    }
    if (phone && !PHONE_RE.test(phone.replace(/\s+/g, ""))) {
      pushToast("Namba ya simu si sahihi.", "error");
      return;
    }
    const scopeIds = {
      dayosisi_id: dayosisi_id || null,
      jimbo_id: jimbo_id || null,
      tawi_id: tawi_id || null,
    };
    const scopeOp = draft.id ? ("edit" as const) : ("create" as const);
    if (!canScopeMutateRecord(scopeOp, scopeIds, scopeHierarchy)) {
      notifyScopeDenied(crudContext?.moduleKey ?? "waumini", "church_members", { member_id: draft.id });
      return;
    }
    setSaving(true);
    const wasNew = !draft.id;
    try {
      const saved = await upsertChurchMember({
        id: draft.id,
        first_name,
        last_name,
        family_id,
        gender,
        birth_date,
        phone,
        email,
        relation_to_head,
        nida_number,
        photo_url,
        marital_status,
        occupation,
        region_name,
        district_name,
        ward_street,
        membership_status,
        baptism_date,
        baptism_place,
        is_baptized,
        member_number,
        dayosisi_id,
        jimbo_id,
        tawi_id,
        ministry_segment,
        jimbo_name,
        tawi_name,
        jumuiya_name,
        idara_name,
        huduma_name,
        notes,
      });
      const verifyUrl = `${window.location.origin}/verify/member/${saved.id}`;
      await upsertFamilyMemberLink({
        family_id,
        member_id: saved.id,
        relationship_type: relation_to_head,
      });
      await ensureMemberCard({
        member_id: saved.id,
        member_number: saved.member_number ?? member_number,
        verify_url: verifyUrl,
      });
      await logAudit("church_member_upsert", "church_members", saved.id);
      if (wasNew && phone) {
        void queueMemberWelcomeSms({
          fullName: `${first_name} ${last_name}`.trim(),
          phone,
        });
      }
      pushToast("Muumini amehifadhiwa kwenye Supabase.", "success");
      if (crudContext && onCrudSuccess) {
        onCrudSuccess(wasNew ? "create" : "update", {
          ...crudContext,
          recordId: saved.id,
          targetSubmodule: crudContext.submodule,
        });
      } else if (wasNew) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      dispatchPortalReloadMetrics();
      setDraft(null);
      await load();
    } catch (err) {
      reportError(err, "Waumini — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  const title = hdr(mode).t;
  const subtitle = hdr(mode).s;

  return (
    <div className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-900 via-emerald-900 to-teal-950 p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Waumini</p>
        <h2 className="mt-1 text-2xl font-bold">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-teal-100">{subtitle}</p>
        <p className="mt-1 text-xs text-teal-200">
          Jedwali: <code className="rounded bg-white/10 px-1">church_members</code> — Pakua blanki / Excel orodha / Pakia Excel chini ya jedwali.
        </p>
      </header>

      <PremiumTable<Row>
        title={title}
        subtitle={subtitle}
        persistenceScope={portalPremiumTableScope([
          crudContext?.moduleKey ?? "waumini",
          crudContext?.submodule ?? "Orodha",
          mode,
          "members",
        ])}
        rows={rows}
        columns={columns}
        onAdd={shared.canAdd ? () => setDraft({}) : undefined}
        onEdit={shared.canEdit ? (r) => setDraft(r) : undefined}
        onDelete={
          shared.canDelete
            ? async (id) => {
                try {
                  await deleteChurchMember(id);
                  await logAudit("church_member_delete", "church_members", id);
                  pushToast("Rekodi imefutwa.", "success");
                  if (crudContext && onCrudSuccess) {
                    onCrudSuccess("delete", { ...crudContext, recordId: id });
                  }
                  dispatchPortalReloadMetrics();
                  await load();
                } catch (err) {
                  reportError(err, "Waumini — futa");
                }
              }
            : undefined
        }
        {...shared}
        exportBasename={`Church_Members_${mode}`}
        excelBulk={excelBulk}
        isLoading={loading}
        highlightRowId={highlightRecordId ?? undefined}
        actionsDisabled={saving || !!draft}
      />

      {draft && (
        <ModalScrollLayer
          onBackdropClick={() => setDraft(null)}
          maxWidthClass="max-w-2xl"
          overlayClassName="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-black/50 px-4 py-10 backdrop-blur-sm"
        >
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="w-full rounded-2xl border border-teal-200 bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#0f1e46]">{draft.id ? "Hariri muumini" : "Muumini mpya"}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jina la kwanza *
                <input name="first_name" required defaultValue={draft.first_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jina la mwisho *
                <input name="last_name" required defaultValue={draft.last_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2">
                Familia
                <select name="family_id" defaultValue={draft.family_id ?? ""} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">—</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.family_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Uhusiano kwenye familia
                <select name="relation_to_head" defaultValue={draft.relation_to_head ?? ""} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">—</option>
                  <option value="baba">Baba</option>
                  <option value="mama">Mama</option>
                  <option value="mtoto">Mtoto</option>
                  <option value="mlezi">Mlezi</option>
                  <option value="ndugu">Ndugu</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jinsia
                <select name="gender" defaultValue={draft.gender ?? ""} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">—</option>
                  <option value="male">Mwanaume</option>
                  <option value="female">Mwanamke</option>
                  <option value="other">Nyingine</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Chama / Ministry segment
                <select
                  name="ministry_segment"
                  defaultValue={draft.ministry_segment ?? "none"}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                >
                  {MINISTRY_SEGMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.sw} · {o.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Tarehe ya kuzaliwa
                <input name="birth_date" type="date" defaultValue={draft.birth_date ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
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
                NIDA / Kitambulisho
                <input name="nida_number" defaultValue={draft.nida_number ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                URL ya picha
                <input name="photo_url" defaultValue={draft.photo_url ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Hali ya ndoa
                <input name="marital_status" defaultValue={draft.marital_status ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Kazi
                <input name="occupation" defaultValue={draft.occupation ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Mkoa
                <input name="region_name" defaultValue={draft.region_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Wilaya
                <input name="district_name" defaultValue={draft.district_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Kata / Mtaa
                <input name="ward_street" defaultValue={draft.ward_street ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Hali ya uanachama
                <select name="membership_status" defaultValue={draft.membership_status ?? "active"} className="rounded-xl border border-slate-200 px-3 py-2">
                  {(Object.keys(MS_SW) as MembershipStatusDb[]).map((k) => (
                    <option key={k} value={k}>
                      {MS_SW[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Nambari ya usajili
                <input
                  name="member_number"
                  readOnly
                  defaultValue={draft.member_number ?? ""}
                  placeholder="Auto generated"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>
              <div className="sm:col-span-2">
                <StructureCascadeSelector
                  options={{
                    dayosisi: structure.dayosisi,
                    majimbo: structure.majimbo,
                    matawi: structure.matawi,
                  }}
                  value={{
                    dayosisi_id: cascade.dayosisi_id ?? draft.dayosisi_id ?? "",
                    jimbo_id: cascade.jimbo_id ?? "",
                    tawi_id: cascade.tawi_id ?? "",
                  }}
                  onChange={(next) => setCascade(next)}
                />
                <input type="hidden" name="dayosisi_id" value={cascade.dayosisi_id ?? draft.dayosisi_id ?? ""} />
                <input type="hidden" name="jimbo_id" value={cascade.jimbo_id ?? ""} />
                <input type="hidden" name="tawi_id" value={cascade.tawi_id ?? ""} />
              </div>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Jumuiya
                <select name="jumuiya_name" defaultValue={draft.jumuiya_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">—</option>
                  {structure.jumuiya.map((x) => (
                    <option key={x.id} value={x.name}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Idara
                <select name="idara_name" defaultValue={draft.idara_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">—</option>
                  {structure.idara.map((x) => (
                    <option key={x.id} value={x.name}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Huduma
                <select name="huduma_name" defaultValue={draft.huduma_name ?? ""} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">—</option>
                  {structure.huduma.map((x) => (
                    <option key={x.id} value={x.name}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-800 sm:col-span-2">
                <input name="is_baptized" type="checkbox" defaultChecked={draft.is_baptized ?? false} className="h-4 w-4 accent-teal-700" />
                Amebatizwa (thibitisho)
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Tarehe ya ubatizo
                <input name="baptism_date" type="date" defaultValue={draft.baptism_date ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800">
                Mahali pa ubatizo
                <input name="baptism_place" defaultValue={draft.baptism_place ?? ""} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2">
                Maelezo
                <textarea name="notes" defaultValue={draft.notes ?? ""} className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2" />
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
                className="rounded-xl bg-teal-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </form>
        </ModalScrollLayer>
      )}
      {cardRow ? (
        <ModalScrollLayer onBackdropClick={() => setCardRow(null)} maxWidthClass="max-w-lg">
          <div className="w-full rounded-2xl border border-[#0B1F3A]/20 bg-white p-5 shadow-2xl">
            <div id="member-card-print" className="rounded-2xl border-2 border-[#D4AF37] bg-[#0B1F3A] p-4 text-white">
              <div className="text-xs font-semibold text-[#D4AF37]">KMK(T) DIGITAL MEMBER CARD</div>
              <div className="mt-3 text-lg font-bold">{cardRow.jina_kamili}</div>
              <div className="mt-1 text-xs">No: {cardRow.member_number || "Pending"}</div>
              <div className="mt-1 text-xs">Dayosisi: {dayosisi.find((d) => d.id === cardRow.dayosisi_id)?.jina || "—"}</div>
              <div className="mt-1 text-xs">Jimbo: {cardRow.jimbo_name || "—"} | Tawi: {cardRow.tawi_name || "—"}</div>
              <div className="mt-1 text-xs">Status: {MS_SW[cardRow.membership_status]}</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded bg-white p-1">
                  <ResponsiveLazyImage
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/verify/member/${cardRow.id}`)}`}
                    alt="QR code"

                    className="absolute inset-0 h-full w-full object-cover"

                    width={120}
                    height={120}

                    loading="lazy"

                  />
                </div>
                <div className="text-right text-[11px] text-slate-200">
                  Issue date
                  <br />
                  {new Date().toLocaleDateString("sw-TZ")}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => {
                  const card = document.getElementById("member-card-print");
                  if (!card) return;
                  void exportTableToPdf(
                    "KADI YA MUUMINI",
                    `member-card-${cardRow.member_number || cardRow.id}`,
                    ["Field", "Value"],
                    [
                      ["Jina", cardRow.jina_kamili],
                      ["Namba", cardRow.member_number || "Pending"],
                      ["Status", MS_SW[cardRow.membership_status]],
                      ["Tawi", cardRow.tawi_name || "—"],
                    ]
                  );
                }}
              >
                Download PDF
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1.5 text-sm font-semibold text-[#0B1F3A]"
                onClick={() =>
                  openPrintableTable("KADI YA MUUMINI", ["Field", "Value"], [
                    ["Jina", cardRow.jina_kamili],
                    ["Namba", cardRow.member_number || "Pending"],
                    ["Status", MS_SW[cardRow.membership_status]],
                    ["Tawi", cardRow.tawi_name || "—"],
                    ["Verify", `${window.location.origin}/verify/member/${cardRow.id}`],
                  ])
                }
              >
                Print Card
              </button>
            </div>
          </div>
        </ModalScrollLayer>
      ) : null}
    </div>
  );
}
