import { Suspense, lazy, useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { PremiumTable } from "../common/PremiumTable";
import { usePortal } from "../../context/PortalContext";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { getSupabase, isSupabaseRealtimeEnabled } from "../../lib/supabaseClient";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";
import {
  churchStructureEntityDetailRows,
  churchStructureLeaderDetailRows,
  exportChurchStructureEntityPdf,
  exportRowsToExcel,
  officialStructureRecordPdfTitle,
  openPrintableTable,
} from "../../lib/exportHelpers";
import { parseAttachmentUrls } from "../../lib/enterpriseRegistration";
import {
  buildStructureAncestorChain,
  hierarchyPathFromChain,
  inferLegacyScopeTripleFromStructure,
} from "../../lib/structureScopeBridge";
import {
  archiveStructureLeader,
  createStructureLeader,
  fetchLeadersForEntity,
} from "../../services/churchStructureLeadersService";
import {
  archiveStructureEntity,
  createStructureEntity,
  searchStructureEntities,
  updateStructureEntity,
} from "../../services/churchStructureService";
import type {
  ChurchStructureEntity,
  ChurchStructureLeader,
  ChurchStructureLevel,
  DayosisiRecord,
  JimboRecord,
  KiongoziRecord,
  TawiRecord,
} from "../../types";
import type { ScopeHierarchy } from "../../utils/scopeAccess";
import {
  structuralCreateAllowedDayosisi,
  structuralCreateAllowedJimbo,
  structuralCreateAllowedTawi,
} from "../../utils/scopeAccess";
import { ENTERPRISE_VIONGOZI_SUBMODULE } from "../../data/portalModules";

const EnterpriseLeadershipHub = lazy(() =>
  import("../../pages/moduleLazyPanels").then((m) => ({ default: m.EnterpriseLeadershipHub }))
);

function PanelSuspenseFallback() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-700">Inapakia…</div>
  );
}

/** Viongozi wengi kwa rekodi moja (jedwali `church_structure_leaders`). */
function StructureLeadersInline({
  entityId,
  canMutate,
  pushToast,
  reportError,
  onChanged,
}: {
  entityId?: string;
  canMutate: boolean;
  pushToast: (msg: string, level?: "success" | "error" | "info") => void;
  reportError: (err: unknown, context: string) => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<ChurchStructureLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    position_title: "",
    leadership_category: "",
    full_name: "",
    phone: "",
    email: "",
  });

  const reload = useCallback(async () => {
    if (!entityId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      setRows(await fetchLeadersForEntity(entityId));
    } catch (e) {
      reportError(e, "Viongozi wa muundo — pakua");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, reportError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!entityId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950">
        Hifadhi rekodi kwanza, kisha ongeza viongozi wa jedwali maalum (cheo, jina, mihula).
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/90 p-3 md:col-span-2">
      <h4 className="text-sm font-bold text-slate-900">Viongozi wa jedwali (idadi isiyo na kikomo)</h4>
      {loading ? (
        <p className="text-xs text-slate-600">Inapakia orodha…</p>
      ) : rows.filter((r) => r.status !== "archived").length === 0 ? (
        <p className="text-xs text-slate-600">Bado hakuna kiongozi aliyeongezwa kwenye jedwali.</p>
      ) : (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto text-xs">
          {rows
            .filter((r) => r.status !== "archived")
            .map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200">
                <span className="font-medium text-slate-800">
                  {r.position_title} — {r.full_name}
                </span>
                {canMutate ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    onClick={() =>
                      void (async () => {
                        setBusy(true);
                        try {
                          await archiveStructureLeader(r.id);
                          pushToast("Kiongozi amewekwa archived.", "success");
                          await reload();
                          onChanged();
                        } catch (e) {
                          reportError(e, "Kiongozi — archive");
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  >
                    Archive
                  </button>
                ) : null}
              </li>
            ))}
        </ul>
      )}
      {canMutate ? (
        <div className="grid gap-2 border-t border-slate-200 pt-3 md:grid-cols-2">
          <label className="grid gap-0.5 text-[11px]">
            Cheo *
            <input
              className="rounded border px-2 py-1.5 text-xs"
              value={draft.position_title}
              onChange={(e) => setDraft((d) => ({ ...d, position_title: e.target.value }))}
            />
          </label>
          <label className="grid gap-0.5 text-[11px]">
            Jina kamili *
            <input
              className="rounded border px-2 py-1.5 text-xs"
              value={draft.full_name}
              onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
            />
          </label>
          <label className="grid gap-0.5 text-[11px]">
            Kategoria ya uongozi
            <input
              className="rounded border px-2 py-1.5 text-xs"
              value={draft.leadership_category}
              onChange={(e) => setDraft((d) => ({ ...d, leadership_category: e.target.value }))}
            />
          </label>
          <label className="grid gap-0.5 text-[11px]">
            Simu
            <input
              className="rounded border px-2 py-1.5 text-xs"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
            />
          </label>
          <label className="grid gap-0.5 text-[11px] md:col-span-2">
            Barua pepe
            <input
              className="rounded border px-2 py-1.5 text-xs"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="button"
              disabled={busy || !draft.position_title.trim() || !draft.full_name.trim()}
              className="rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              onClick={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    await createStructureLeader(entityId, {
                      position_title: draft.position_title,
                      leadership_category: draft.leadership_category,
                      full_name: draft.full_name,
                      phone: draft.phone,
                      email: draft.email,
                    });
                    setDraft({ position_title: "", leadership_category: "", full_name: "", phone: "", email: "" });
                    pushToast("Kiongozi ameongezwa.", "success");
                    await reload();
                    onChanged();
                  } catch (e) {
                    reportError(e, "Kiongozi — ongeza");
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              Ongeza kiongozi
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">Huna ruhusa ya kuhariri viongozi wa jedwali hapa.</p>
      )}
    </div>
  );
}

export type SajiliMuundoFlowTab =
  | "kmkt"
  | "dayosisi"
  | "jimbo"
  | "tawi"
  | "jumuiya"
  | "idara"
  | "huduma"
  | "taasisi"
  | "viongozi";

const TABS: { id: SajiliMuundoFlowTab; label: string }[] = [
  { id: "kmkt", label: "1. KMK(T) Ngazi Kuu" },
  { id: "dayosisi", label: "2. Dayosisi" },
  { id: "jimbo", label: "3. Jimbo" },
  { id: "tawi", label: "4. Tawi / Kituo" },
  { id: "jumuiya", label: "5. Jumuiya" },
  { id: "idara", label: "6. Idara" },
  { id: "huduma", label: "7. Huduma" },
  { id: "taasisi", label: "8. Taasisi" },
  { id: "viongozi", label: "9. Viongozi wa Muundo" },
];

type CrudMeta = {
  moduleKey: string;
  submodule: string;
  recordId?: string;
  targetSubmodule?: string;
};

export interface SajiliMuundoPanelProps {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  viongozi: KiongoziRecord[];
  setViongozi: Dispatch<SetStateAction<KiongoziRecord[]>>;
  highlightRecordId?: string | null;
  onCrudSuccess?: (action: "create" | "update" | "delete", meta: CrudMeta) => void;
}

function activeKmktRows(all: ChurchStructureEntity[]): ChurchStructureEntity[] {
  return all.filter((e) => e.level === "kmkt" && e.status === "active");
}

function childrenAtLevel(
  all: ChurchStructureEntity[],
  parentId: string | null,
  level: ChurchStructureLevel
): ChurchStructureEntity[] {
  return all.filter((e) => e.level === level && e.parent_id === parentId && e.status === "active").sort((a, b) => a.name.localeCompare(b.name));
}

export function SajiliMuundoPanel({
  dayosisi,
  majimbo,
  matawi,
  viongozi,
  setViongozi,
  highlightRecordId,
  onCrudSuccess,
}: SajiliMuundoPanelProps) {
  const {
    pushToast,
    reportError,
    role,
    portalProfile,
    canPortalCreateModule,
    canPortalEditModule,
    canPortalDeleteModule,
    canPortalExportModule,
    canScopeMutateRecord,
  } = usePortal();

  const [activeTab, setActiveTab] = useState<SajiliMuundoFlowTab>("kmkt");
  const [allEntities, setAllEntities] = useState<ChurchStructureEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Partial<ChurchStructureEntity> | null>(null);
  const [saving, setSaving] = useState(false);
  /** Chuja orodha ya majimbo wakati wa kusajili Tawi (auto-cascade). */
  const [tawiDayosisiFilter, setTawiDayosisiFilter] = useState("");

  const scopeHierarchy: ScopeHierarchy = useMemo(
    () => ({
      majimbo: majimbo.map((j) => ({ id: j.id, dayosisi_id: j.dayosisi_id ?? null })),
      matawi: matawi.map((t) => ({ id: t.id, jimbo_id: t.jimbo_id ?? null })),
    }),
    [majimbo, matawi]
  );

  const canCreate = canPortalCreateModule("muundo");
  const canEdit = canPortalEditModule("muundo");
  const canDelete = canPortalDeleteModule("muundo");
  const canExport = canPortalExportModule("muundo");

  const load = useCallback(async () => {
    if (!getSupabase()) {
      setAllEntities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await searchStructureEntities({ includeInactive: showArchived });
      setAllEntities(list);
    } catch (e) {
      reportError(e, "Sajili Muundo — pakua");
      setAllEntities([]);
    } finally {
      setLoading(false);
    }
  }, [showArchived, reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (activeTab !== "tawi") setTawiDayosisiFilter("");
  }, [activeTab]);

  useEffect(() => {
    if (!isSupabaseRealtimeEnabled()) return;
    const client = getSupabase();
    if (!client) return;
    const ch = client
      .channel("portal-structure-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "church_structure_entities" },
        () => {
          void load();
          dispatchPortalReloadMetrics();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "church_structure_leaders" },
        () => {
          void load();
          dispatchPortalReloadMetrics();
        }
      )
      .subscribe();
    return () => {
      void client.removeChannel(ch);
    };
  }, [load]);

  const byId = useMemo(() => new Map(allEntities.map((e) => [e.id, e])), [allEntities]);

  const hierarchyPathFor = useCallback(
    (row: ChurchStructureEntity) => {
      const chain = buildStructureAncestorChain(row.id, byId);
      return hierarchyPathFromChain(chain);
    },
    [byId]
  );

  const rowTriple = useCallback(
    (row: ChurchStructureEntity) => inferLegacyScopeTripleFromStructure(row, allEntities, dayosisi, majimbo, matawi),
    [allEntities, dayosisi, majimbo, matawi]
  );

  const rowCanEdit = useCallback(
    (row: ChurchStructureEntity) => {
      if (!canEdit) return false;
      return canScopeMutateRecord("edit", rowTriple(row), scopeHierarchy);
    },
    [canEdit, canScopeMutateRecord, rowTriple, scopeHierarchy]
  );

  const rowCanDelete = useCallback(
    (row: ChurchStructureEntity) => {
      if (!canDelete) return false;
      return canScopeMutateRecord("delete", rowTriple(row), scopeHierarchy);
    },
    [canDelete, canScopeMutateRecord, rowTriple, scopeHierarchy]
  );

  const canAddForTab = useCallback(
    (tab: SajiliMuundoFlowTab): boolean => {
      if (!canCreate) return false;
      if (tab === "viongozi") return canPortalCreateModule("viongozi");
      if (tab === "kmkt") return structuralCreateAllowedDayosisi(role, portalProfile);
      if (tab === "dayosisi") return structuralCreateAllowedDayosisi(role, portalProfile);
      if (tab === "jimbo") return structuralCreateAllowedJimbo(role, portalProfile);
      if (tab === "tawi") return structuralCreateAllowedTawi(role, portalProfile);
      if (tab === "jumuiya" || tab === "idara" || tab === "huduma" || tab === "taasisi") {
        return structuralCreateAllowedJimbo(role, portalProfile) || structuralCreateAllowedTawi(role, portalProfile);
      }
      return false;
    },
    [canCreate, canPortalCreateModule, portalProfile, role]
  );

  const createScopeAllowed = useCallback(
    (tab: SajiliMuundoFlowTab, fd: FormData): boolean => {
      if (tab === "kmkt" || tab === "dayosisi") return true;
      if (tab === "jimbo") {
        const pid = String(fd.get("parent_id") ?? "").trim();
        const p = pid ? byId.get(pid) : undefined;
        if (!p || p.level !== "dayosisi") return false;
        const t = inferLegacyScopeTripleFromStructure(p, allEntities, dayosisi, majimbo, matawi);
        return canScopeMutateRecord("create", { dayosisi_id: t.dayosisi_id, jimbo_id: null, tawi_id: null }, scopeHierarchy);
      }
      if (tab === "tawi") {
        const pid = String(fd.get("parent_id") ?? "").trim();
        const p = pid ? byId.get(pid) : undefined;
        if (!p || p.level !== "jimbo") return false;
        const t = inferLegacyScopeTripleFromStructure(p, allEntities, dayosisi, majimbo, matawi);
        return canScopeMutateRecord("create", { dayosisi_id: t.dayosisi_id, jimbo_id: t.jimbo_id, tawi_id: null }, scopeHierarchy);
      }
      if (tab === "jumuiya") {
        const pid = String(fd.get("parent_id") ?? "").trim();
        const p = pid ? byId.get(pid) : undefined;
        if (!p || p.level !== "tawi") return false;
        const t = inferLegacyScopeTripleFromStructure(p, allEntities, dayosisi, majimbo, matawi);
        return canScopeMutateRecord("create", t, scopeHierarchy);
      }
      if (tab === "idara" || tab === "huduma" || tab === "taasisi") {
        const scopeKind = String(fd.get("scope_kind") ?? "").trim();
        const anchor = String(fd.get("scope_anchor_id") ?? "").trim();
        const node = anchor ? byId.get(anchor) : undefined;
        if (!node) return false;
        const t = inferLegacyScopeTripleFromStructure(node, allEntities, dayosisi, majimbo, matawi);
        if (scopeKind === "kmkt" && node.level === "kmkt") return canScopeMutateRecord("create", {}, scopeHierarchy);
        if (scopeKind === "dayosisi" && node.level === "dayosisi") {
          return canScopeMutateRecord("create", { dayosisi_id: t.dayosisi_id, jimbo_id: null, tawi_id: null }, scopeHierarchy);
        }
        if (scopeKind === "jimbo" && node.level === "jimbo") {
          return canScopeMutateRecord("create", { dayosisi_id: t.dayosisi_id, jimbo_id: t.jimbo_id, tawi_id: null }, scopeHierarchy);
        }
        if (scopeKind === "tawi" && node.level === "tawi") return canScopeMutateRecord("create", t, scopeHierarchy);
        return false;
      }
      return false;
    },
    [allEntities, byId, canScopeMutateRecord, dayosisi, majimbo, matawi, scopeHierarchy]
  );

  const tableRows = useMemo(() => {
    if (activeTab === "viongozi") return [];
    return allEntities.filter((e) => e.level === activeTab);
  }, [activeTab, allEntities]);

  const kmktRoots = useMemo(() => activeKmktRows(allEntities), [allEntities]);

  async function onSubmitForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!getSupabase()) {
      pushToast("Supabase haijasanidiwa.", "error");
      return;
    }
    const tab = activeTab;
    if (tab === "viongozi") return;

    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const code = String(fd.get("code") ?? "").trim();
    if (!name || !code) {
      pushToast("Jina na code vinahitajika.", "error");
      return;
    }

    if (!editing?.id && !createScopeAllowed(tab, fd)) {
      pushToast("Huna ruhusa ya kuongeza chini ya eneo hili.", "error");
      return;
    }

    let parent_id: string | null = String(fd.get("parent_id") ?? "").trim() || null;
    let parent_name: string | null = null;
    const level = tab as ChurchStructureLevel;

    if (tab === "kmkt") {
      parent_id = null;
      parent_name = null;
      if (!editing?.id) {
        const existing = activeKmktRows(allEntities);
        if (existing.length > 0) {
          pushToast("KMK(T) Ngazi Kuu tayari imesajiliwa. Hariri rekodi iliyopo au iweke sanifu.", "error");
          return;
        }
      }
    }

    if (tab === "dayosisi") {
      const root = kmktRoots[0];
      if (!root) {
        pushToast("Sajili KMK(T) Ngazi Kuu kwanza.", "error");
        return;
      }
      parent_id = root.id;
      parent_name = root.name;
    }

    if (tab === "jimbo" || tab === "tawi" || tab === "jumuiya") {
      const p = parent_id ? byId.get(parent_id) : undefined;
      if (!p) {
        pushToast("Chagua mzazi sahihi.", "error");
        return;
      }
      parent_name = p.name;
      if (tab === "jimbo" && p.level !== "dayosisi") {
        pushToast("Jimbo lazima liwe chini ya Dayosisi.", "error");
        return;
      }
      if (tab === "tawi" && p.level !== "jimbo") {
        pushToast("Tawi lazima liwe chini ya Jimbo.", "error");
        return;
      }
      if (tab === "jumuiya" && p.level !== "tawi") {
        pushToast("Jumuiya lazima iwe chini ya Tawi/Kituo.", "error");
        return;
      }
    }

    if (tab === "idara" || tab === "huduma" || tab === "taasisi") {
      const sk = String(fd.get("scope_kind") ?? "").trim();
      const anchor = String(fd.get("scope_anchor_id") ?? "").trim();
      const node = anchor ? byId.get(anchor) : undefined;
      if (!node) {
        pushToast("Chagua kitengo cha msingi (scope).", "error");
        return;
      }
      const levelOk =
        (sk === "kmkt" && node.level === "kmkt") ||
        (sk === "dayosisi" && node.level === "dayosisi") ||
        (sk === "jimbo" && node.level === "jimbo") ||
        (sk === "tawi" && node.level === "tawi");
      if (!levelOk) {
        pushToast("Scope na kitengo vilivyochaguliwa havilingani.", "error");
        return;
      }
      parent_id = node.id;
      parent_name = node.name;
    }

    const payload: Partial<ChurchStructureEntity> = {
      name,
      code,
      entity_type: String(fd.get("entity_type") ?? "").trim() || undefined,
      official_name: String(fd.get("official_name") ?? "").trim() || undefined,
      short_code: String(fd.get("short_code") ?? "").trim() || undefined,
      logo_url: String(fd.get("logo_url") ?? "").trim() || undefined,
      photo_url: String(fd.get("photo_url") ?? "").trim() || undefined,
      signature_url: String(fd.get("signature_url") ?? "").trim() || undefined,
      description: String(fd.get("description") ?? "").trim() || undefined,
      region: String(fd.get("region") ?? "").trim() || undefined,
      district: String(fd.get("district") ?? "").trim() || undefined,
      ward: String(fd.get("ward") ?? "").trim() || undefined,
      village_street: String(fd.get("village_street") ?? "").trim() || undefined,
      address: String(fd.get("address") ?? "").trim() || undefined,
      gps_coordinates: String(fd.get("gps_coordinates") ?? "").trim() || undefined,
      contact_person: String(fd.get("contact_person") ?? "").trim() || undefined,
      phone: String(fd.get("phone") ?? "").trim() || undefined,
      whatsapp: String(fd.get("whatsapp") ?? "").trim() || undefined,
      email: String(fd.get("email") ?? "").trim() || undefined,
      website: String(fd.get("website") ?? "").trim() || undefined,
      google_maps_url: String(fd.get("google_maps_url") ?? "").trim() || undefined,
      established_date: String(fd.get("established_date") ?? "").trim().slice(0, 10) || undefined,
      leader_name: String(fd.get("leader_name") ?? "").trim() || undefined,
      assistant_leaders: String(fd.get("assistant_leaders") ?? "").trim() || undefined,
      secretary_name: String(fd.get("secretary_name") ?? "").trim() || undefined,
      treasurer_name: String(fd.get("treasurer_name") ?? "").trim() || undefined,
      notes: String(fd.get("notes") ?? "").trim() || undefined,
      attachment_urls: parseAttachmentUrls(fd.get("attachment_urls")),
      level,
      parent_id,
      parent_name,
      status: (String(fd.get("status") ?? "active").trim() as ChurchStructureEntity["status"]) || "active",
    };

    setSaving(true);
    try {
      if (editing?.id) {
        const prev = byId.get(editing.id);
        if (!canEdit) {
          pushToast("Huna ruhusa ya kuhariri.", "error");
          return;
        }
        const rowForScope = prev ?? (editing as ChurchStructureEntity);
        if (!rowCanEdit(rowForScope)) {
          pushToast("Huna ruhusa ya kuhariri rekodi hii ndani ya eneo lako.", "error");
          return;
        }
        await updateStructureEntity(editing.id, payload);
        pushToast("Imehifadhiwa.", "success");
        onCrudSuccess?.("update", { moduleKey: "muundo", submodule: "Sajili Muundo", recordId: editing.id });
      } else {
        if (!canCreate) {
          pushToast("Huna ruhusa ya kuongeza.", "error");
          return;
        }
        const created = await createStructureEntity(payload);
        pushToast("Imesajiliwa.", "success");
        onCrudSuccess?.("create", { moduleKey: "muundo", submodule: "Sajili Muundo", recordId: created.id });
      }
      setEditing(null);
      await load();
      dispatchPortalReloadMetrics();
    } catch (err) {
      reportError(err, "Sajili Muundo — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  const parentSelectBlock = useMemo(() => {
    if (activeTab === "viongozi" || activeTab === "kmkt" || activeTab === "dayosisi") return null;
    if (activeTab === "jimbo") {
      const opts = childrenAtLevel(allEntities, kmktRoots[0]?.id ?? "__none__", "dayosisi");
      return (
        <label className="grid gap-1 text-xs md:col-span-2">
          Dayosisi (mzazi) *
          <select name="parent_id" required className="rounded-lg border px-3 py-2 text-sm" defaultValue={editing?.parent_id ?? ""}>
            <option value="">— Chagua —</option>
            {opts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.code})
              </option>
            ))}
          </select>
        </label>
      );
    }
    if (activeTab === "tawi") {
      const rootId = kmktRoots[0]?.id ?? "__none__";
      const dsList = childrenAtLevel(allEntities, rootId, "dayosisi");
      const pairs: { d: ChurchStructureEntity; j: ChurchStructureEntity }[] = [];
      for (const d of dsList) {
        for (const j of childrenAtLevel(allEntities, d.id, "jimbo")) pairs.push({ d, j });
      }
      const filtered = tawiDayosisiFilter ? pairs.filter((p) => p.d.id === tawiDayosisiFilter) : pairs;
      return (
        <>
          <label className="grid gap-1 text-xs md:col-span-2">
            Chuja kwa Dayosisi (hiari — kupunguza orodha)
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={tawiDayosisiFilter}
              onChange={(e) => setTawiDayosisiFilter(e.target.value)}
            >
              <option value="">— Orodha zote —</option>
              {dsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs md:col-span-2">
            Jimbo (mzazi) *
            <select name="parent_id" required className="rounded-lg border px-3 py-2 text-sm" defaultValue={editing?.parent_id ?? ""}>
              <option value="">— Chagua jimbo —</option>
              {filtered.map(({ d, j }) => (
                <option key={j.id} value={j.id}>
                  {d.name} → {j.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-slate-500 md:col-span-2">
            Chagua Dayosisi kwanza kupunguza majimbo, kisha chagua jimbo: mzazi wa Tawi ni Jimbo (Dayosisi imejazwa kiotomatiki kwenye njia).
          </p>
        </>
      );
    }
    if (activeTab === "jumuiya") {
      return (
        <label className="grid gap-1 text-xs md:col-span-2">
          Tawi / Kituo (mzazi) *
          <select name="parent_id" required className="rounded-lg border px-3 py-2 text-sm" defaultValue={editing?.parent_id ?? ""}>
            <option value="">— Chagua tawi —</option>
            {allEntities
              .filter((e) => e.level === "tawi" && e.status === "active")
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((t) => {
                const chain = buildStructureAncestorChain(t.id, byId);
                const path = hierarchyPathFromChain(chain);
                return (
                  <option key={t.id} value={t.id}>
                    {path || t.name}
                  </option>
                );
              })}
          </select>
        </label>
      );
    }
    if (activeTab === "idara" || activeTab === "huduma" || activeTab === "taasisi") {
      return (
        <>
          <label className="grid gap-1 text-xs">
            Scope *
            <select name="scope_kind" required className="rounded-lg border px-3 py-2 text-sm" defaultValue="tawi">
              <option value="kmkt">KMK(T) Ngazi Kuu</option>
              <option value="dayosisi">Dayosisi</option>
              <option value="jimbo">Jimbo</option>
              <option value="tawi">Tawi / Kituo</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs md:col-span-1">
            Chagua kitengo *
            <select name="scope_anchor_id" required className="rounded-lg border px-3 py-2 text-sm" defaultValue="">
              <option value="">—</option>
              {kmktRoots.map((k) => (
                <option key={k.id} value={k.id} data-scope="kmkt">
                  KMK(T): {k.name}
                </option>
              ))}
              {allEntities
                .filter((e) => e.level === "dayosisi" && e.status === "active")
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    Dayosisi: {d.name}
                  </option>
                ))}
              {allEntities
                .filter((e) => e.level === "jimbo" && e.status === "active")
                .map((j) => (
                  <option key={j.id} value={j.id}>
                    Jimbo: {j.name}
                  </option>
                ))}
              {allEntities
                .filter((e) => e.level === "tawi" && e.status === "active")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    Tawi: {t.name}
                  </option>
                ))}
            </select>
          </label>
          <p className="text-[11px] text-slate-500 md:col-span-2">
            Chagua aina ya scope kisha chagua kitengo sahihi (mf. scope &quot;Jimbo&quot; na jina la jimbo).
          </p>
        </>
      );
    }
    return null;
  }, [activeTab, allEntities, byId, editing, kmktRoots, tawiDayosisiFilter]);

  const rowExtras = useCallback(
    (row: ChurchStructureEntity) => {
      const path = hierarchyPathFor(row);
      const baseRows = churchStructureEntityDetailRows(row, path);
      const title = officialStructureRecordPdfTitle(row.level);
      const mergeLeaders = async () => {
        try {
          const leaders = await fetchLeadersForEntity(row.id);
          return [...baseRows, ...churchStructureLeaderDetailRows(leaders)];
        } catch {
          return baseRows;
        }
      };
      return (
        <>
          <button
            type="button"
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900"
            onClick={() =>
              void (async () => {
                const rows = await mergeLeaders();
                void exportRowsToExcel(`muundo_${row.code}_rekodi`, ["Kipengele", "Thamani"], rows, {
                  reportTitle: title,
                  filterSummary: path,
                });
              })()
            }
          >
            Excel
          </button>
          <button
            type="button"
            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-950"
            onClick={() => void exportChurchStructureEntityPdf(row, { hierarchyPath: path })}
          >
            PDF
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
            onClick={() =>
              void (async () => {
                const rows = await mergeLeaders();
                openPrintableTable(title, ["Kipengele", "Thamani"], rows, {
                  subtitle: row.level,
                  filterSummary: path,
                });
              })()
            }
          >
            Chapisha
          </button>
        </>
      );
    },
    [hierarchyPathFor]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/80 to-white p-4 shadow">
        <h2 className="text-lg font-bold text-slate-900">Sajili Muundo wa Kanisa</h2>
        <p className="mt-1 text-sm text-slate-600">
          Mfumo wa kusajili ngazi zote kwenye <code className="rounded bg-slate-100 px-1">church_structure_entities</code> — mtiririko
          wa mzazi hadi mwanao, bila maandishi ya mzazi pale kuna chaguo la kiotomatiki.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Ona rekodi zilizohifadhiwa sanifu / zisizo active
        </label>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
              activeTab === t.id
                ? "border-cyan-700 bg-cyan-800 text-white"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "viongozi" ? (
        <Suspense fallback={<PanelSuspenseFallback />}>
          <EnterpriseLeadershipHub
            viongozi={viongozi}
            setViongozi={setViongozi}
            dayosisi={dayosisi}
            majimbo={majimbo}
            matawi={matawi}
            canCreate={canPortalCreateModule("viongozi")}
            canEdit={canPortalEditModule("viongozi")}
          />
          <p className="text-xs text-slate-600">
            Viongozi wa muundo husimamiwa katika moduli ya Viongozi ({ENTERPRISE_VIONGOZI_SUBMODULE}) kwa ubao kamili wa cheo,
            makamati na PDF.
          </p>
        </Suspense>
      ) : (
        <PremiumTable<ChurchStructureEntity>
          title={TABS.find((x) => x.id === activeTab)?.label ?? "Sajili Muundo"}
          subtitle="Rekodi zinatoka moja kwa moja kwenye Supabase. Vitendo vya PDF/Excel/Chapisha vipo kwa kila safu."
          persistenceScope={portalPremiumTableScope(["muundo", "Sajili Muundo", activeTab, "structure"])}
          rows={tableRows}
          columns={[
            { key: "name", label: "Jina" },
            { key: "code", label: "Code" },
            {
              key: "entity_type",
              label: "Aina",
              render: (r) => <span className="text-xs">{r.entity_type || "—"}</span>,
            },
            {
              key: "parent_name",
              label: "Mzazi",
              exportValue: (r) => r.parent_name || r.parent_id || "",
              render: (r) => <span className="line-clamp-2 text-xs text-slate-600">{r.parent_name || r.parent_id || "—"}</span>,
            },
            {
              key: "hierarchy_summary",
              label: "Hierarchy",
              exportValue: (r) => hierarchyPathFor(r) || r.hierarchy_summary || "",
              render: (r) => (
                <span className="line-clamp-2 text-xs text-slate-600">{hierarchyPathFor(r) || r.hierarchy_summary || "—"}</span>
              ),
            },
            {
              key: "status",
              label: "Status",
              filterValues: ["active", "inactive", "pending", "archived"],
              render: (r) => <span className="text-xs font-medium capitalize">{r.status}</span>,
            },
          ]}
          isLoading={loading}
          highlightRowId={highlightRecordId ?? undefined}
          actionsDisabled={!!editing || saving}
          onAdd={canAddForTab(activeTab) ? () => setEditing({ level: activeTab as ChurchStructureLevel, status: "active" }) : undefined}
          onEdit={(r) => setEditing(r)}
          onDelete={async (id) => {
            try {
              await archiveStructureEntity(id);
              pushToast("Rekodi imehifadhiwa kama archived.", "success");
              onCrudSuccess?.("delete", { moduleKey: "muundo", submodule: "Sajili Muundo", recordId: id });
              await load();
              dispatchPortalReloadMetrics();
            } catch (err) {
              reportError(err, "Sajili Muundo — archive");
            }
          }}
          canAdd={canAddForTab(activeTab)}
          canEdit={canEdit}
          canDelete={canDelete}
          rowCanEdit={rowCanEdit}
          rowCanDelete={rowCanDelete}
          canExport={canExport}
          excelBulk={null}
          deleteConfirmTitle="Thibitisha kuhifadhi sanifu (archive)"
          deleteConfirmMessage="Rekodi itawekwa hali ya archived (si kufutwa kabisa kwenye DB). Endelea?"
          renderRowActionExtras={canExport ? rowExtras : undefined}
        />
      )}

      {editing && activeTab !== "viongozi" ? (
        <ModalScrollLayer onBackdropClick={() => !saving && setEditing(null)} maxWidthClass="max-w-4xl">
          <form
            key={`structure-form-${editing.id ?? "new"}-${activeTab}`}
            className="w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onSubmit={(ev) => void onSubmitForm(ev)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900">{editing.id ? "Hariri rekodi" : "Sajili mpya"}</h3>
              <button type="button" disabled={saving} className="text-sm text-slate-600 underline" onClick={() => setEditing(null)}>
                Funga
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {parentSelectBlock}
              <label className="grid gap-1 text-xs">
                Jina *
                <input name="name" required defaultValue={editing.name ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Code *
                <input name="code" required defaultValue={editing.code ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Aina (entity_type)
                <input name="entity_type" defaultValue={editing.entity_type ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Jina rasmi
                <input name="official_name" defaultValue={editing.official_name ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Short code
                <input name="short_code" defaultValue={editing.short_code ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Status
                <select name="status" className="rounded-lg border px-3 py-2 text-sm" defaultValue={editing.status ?? "active"}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="pending">pending</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs md:col-span-2">
                Maelezo
                <textarea name="description" rows={2} defaultValue={editing.description ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Mkoa
                <input name="region" defaultValue={editing.region ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Wilaya
                <input name="district" defaultValue={editing.district ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Kata
                <input name="ward" defaultValue={editing.ward ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Kijiji / mtaa
                <input name="village_street" defaultValue={editing.village_street ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs md:col-span-2">
                Anwani
                <input name="address" defaultValue={editing.address ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                GPS
                <input name="gps_coordinates" defaultValue={editing.gps_coordinates ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Mhusika
                <input name="contact_person" defaultValue={editing.contact_person ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Simu
                <input name="phone" defaultValue={editing.phone ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                WhatsApp
                <input name="whatsapp" defaultValue={editing.whatsapp ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Barua pepe
                <input name="email" type="email" defaultValue={editing.email ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Tovuti
                <input name="website" defaultValue={editing.website ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs md:col-span-2">
                Google Maps (kiungo)
                <input
                  name="google_maps_url"
                  defaultValue={editing.google_maps_url ?? ""}
                  placeholder="https://maps.google.com/..."
                  className="rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs">
                Logo URL
                <input name="logo_url" defaultValue={editing.logo_url ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Picha URL
                <input name="photo_url" defaultValue={editing.photo_url ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Saini URL
                <input name="signature_url" defaultValue={editing.signature_url ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Kiongozi
                <input name="leader_name" defaultValue={editing.leader_name ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Wasaidizi wa uongozi
                <input name="assistant_leaders" defaultValue={editing.assistant_leaders ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Katibu
                <input name="secretary_name" defaultValue={editing.secretary_name ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Mhasibu
                <input name="treasurer_name" defaultValue={editing.treasurer_name ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Tarehe ya kuanzishwa
                <input name="established_date" type="date" defaultValue={editing.established_date ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs md:col-span-2">
                Maelezo ya ziada (notes)
                <textarea name="notes" rows={2} defaultValue={editing.notes ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs md:col-span-2">
                Viambatisho (URLs, moja kwa laini)
                <textarea
                  name="attachment_urls"
                  rows={2}
                  defaultValue={(editing.attachment_urls ?? []).join("\n")}
                  className="rounded-lg border px-3 py-2 text-sm"
                />
              </label>
            </div>

            <StructureLeadersInline
              entityId={editing.id}
              canMutate={
                !!editing.id &&
                canEdit &&
                rowCanEdit((byId.get(editing.id) ?? (editing as ChurchStructureEntity)) as ChurchStructureEntity)
              }
              pushToast={pushToast}
              reportError={reportError}
              onChanged={() => {
                dispatchPortalReloadMetrics();
                void load();
              }}
            />

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" className="rounded-lg border px-4 py-2 text-sm" disabled={saving} onClick={() => setEditing(null)}>
                Ghairi
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-semibold text-white">
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </form>
        </ModalScrollLayer>
      ) : null}
    </div>
  );
}
