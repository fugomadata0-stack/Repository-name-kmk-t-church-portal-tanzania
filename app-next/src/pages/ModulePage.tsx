import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ModalScrollLayer } from "../components/common/ModalScrollLayer";
import { ModuleHeader } from "../components/common/ModuleHeader";
import { PremiumTable } from "../components/common/PremiumTable";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { BrandingTablePanel } from "../components/settings/BrandingTablePanel";
import { ChurchIdentitySettingsPanel } from "../components/settings/ChurchIdentitySettingsPanel";
import { SiteTaxonomyPanel } from "../components/settings/SiteTaxonomyPanel";
import { SystemSettingsPanel } from "../components/settings/SystemSettingsPanel";
import { MasterSettingsCenterPanel } from "../components/settings/MasterSettingsCenterPanel";
import { AdvancedSettingsPanel } from "../components/settings/AdvancedSettingsPanel";
import { SeoPublicSettingsPanel } from "../components/settings/SeoPublicSettingsPanel";
import { SystemHealthCenterPanel } from "../components/superadmin/SystemHealthCenterPanel";
import { ChurchAuditLogPanel } from "../components/usalama/ChurchAuditLogPanel";
import { PortalDirectoryPanel } from "../components/usalama/PortalDirectoryPanel";
import { SecurityMatrixPanel } from "../components/usalama/SecurityMatrixPanel";
import { SecurityRolesPanel } from "../components/usalama/SecurityRolesPanel";
import { SecuritySessionsPanel } from "../components/usalama/SecuritySessionsPanel";
import { VisibilityRulesPanel } from "../components/usalama/VisibilityRulesPanel";
import { ChurchFamiliesPanel } from "../components/waumini/ChurchFamiliesPanel";
import { ChurchMembersPanel } from "../components/waumini/ChurchMembersPanel";
import { ChurchSchoolLogsPanel } from "../components/taasisi/ChurchSchoolLogsPanel";
import { DomainEntitiesPanel } from "../components/domain/DomainEntitiesPanel";
import { HierarchyTreeView } from "../components/muundo/HierarchyTreeView";
import { NgaziKuuSummary } from "../components/muundo/NgaziKuuSummary";
import { GenericModuleView } from "../components/modules/GenericModuleView";
import type { PremiumTableExcelBulk } from "../components/common/PremiumTable";
import { SubmoduleEmptyState } from "../components/common/SubmoduleEmptyState";
import { modules } from "../data/portalModules";
import { ChurchDocumentsPanel } from "../components/portal/ChurchDocumentsPanel";
import { DeveloperProfilePanel } from "../components/portal/DeveloperProfilePanel";
import { SermonsPanel } from "../components/portal/SermonsPanel";
import { EventsPanel } from "../components/stage2/EventsPanel";
import { GalleryPanel } from "../components/stage2/GalleryPanel";
import { HabariPanel } from "../components/stage2/HabariPanel";
import { VideoLibraryPanel } from "../components/stage2/VideoLibraryPanel";
import { AudioLibraryPanel } from "../components/stage2/AudioLibraryPanel";
import { AnalyticsDashboardPanel } from "../components/stage3/AnalyticsDashboardPanel";
import { AIAssistantPanel } from "../components/ai/AIAssistantPanel";
import { FileManagerPanel } from "../components/stage3/FileManagerPanel";
import { LiveStreamPanel } from "../components/stage3/LiveStreamPanel";
import { NotificationsCenterPanel } from "../components/notifications/NotificationsCenterPanel";
import { AttendancePanel } from "../components/attendance/AttendancePanel";
import { AidManagementPanel } from "../components/aid/AidManagementPanel";
import { CommunicationsPanel } from "../components/communications/CommunicationsPanel";
import { RegistrationRequestsPanel } from "../components/registration/RegistrationRequestsPanel";
import { InvitePromotePermissionsPanel } from "../components/invite/InvitePromotePermissionsPanel";
import { AboutKmktPanel } from "../components/site/AboutKmktPanel";
import { SiteBrandingPanel } from "../components/site/SiteBrandingPanel";
import { usePortal } from "../context/PortalContext";
import { getSupabase } from "../lib/supabaseClient";
import { deleteDayosisi, upsertDayosisi } from "../services/dayosisiService";
import { FedhaRecordModal } from "../components/fedha/FedhaRecordModal";
import {
  CHURCH_LEVEL_OPTIONS,
  DEFAULT_FINANCE_ENTRY_KATEGORIA,
  buildIncomeCategoryFilterTabs,
  mergeCategoryStrings,
} from "../data/financeTaxonomy";
import { deleteFinanceEntry, fetchDistinctFinanceKategoria, upsertFinanceEntry } from "../services/financeEntriesService";
import {
  deleteIncomeLine,
  deleteIncomeSource,
  isIncomeUuid,
  upsertIncomeLine,
  upsertIncomeSource,
} from "../services/incomeModuleService";
import { deleteKiongozi, isViongoziUuid, upsertKiongozi } from "../services/viongoziService";
import {
  deleteChurchJimbo,
  deleteChurchTawi,
  isPersistedUuid,
  upsertChurchJimbo,
  upsertChurchTawi,
} from "../services/muundoHierarchyService";
import { fetchCascadeOptions } from "../services/churchStructureService";
import { getPortalExcelFormSpec } from "../lib/excelModuleFormSpecs";
import {
  bulkImportDayosisi,
  bulkImportFedha,
  bulkImportMajimbo,
  bulkImportMapatoIncome,
  bulkImportMatawi,
  bulkImportViongozi,
  bulkImportVyanzoMapato,
} from "../lib/portalExcelBulkHandlers";
import type {
  ChurchStructureEntity,
  DayosisiRecord,
  FedhaRecord,
  IncomeManagementRecord,
  IncomeSourceRecord,
  JimboRecord,
  KiongoziRecord,
  TawiRecord,
} from "../types";
import { safeArray, safeIncludes, safeLower, safeString } from "../lib/safe";
import {
  createDeveloperSection,
  createDeveloperType,
  fetchDeveloperSections,
  fetchDeveloperTypes,
  type DeveloperTaxonomyRow,
} from "../services/developerTaxonomyService";
import { FINANCE_SOURCE_PRESETS } from "../data/financeSourcePresets";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  moduleKey: string;
  submodule: string;
  dayosisi: DayosisiRecord[];
  setDayosisi: Dispatch<SetStateAction<DayosisiRecord[]>>;
  majimbo: JimboRecord[];
  setMajimbo: Dispatch<SetStateAction<JimboRecord[]>>;
  matawi: TawiRecord[];
  setMatawi: Dispatch<SetStateAction<TawiRecord[]>>;
  viongozi: KiongoziRecord[];
  setViongozi: Dispatch<SetStateAction<KiongoziRecord[]>>;
  fedha: FedhaRecord[];
  setFedha: Dispatch<SetStateAction<FedhaRecord[]>>;
  incomeSources: IncomeSourceRecord[];
  setIncomeSources: Dispatch<SetStateAction<IncomeSourceRecord[]>>;
  incomeManagement: IncomeManagementRecord[];
  setIncomeManagement: Dispatch<SetStateAction<IncomeManagementRecord[]>>;
  /** Baada ya CRUD mafaniko (scroll, sidebar, angazo la safu) */
  onCrudSuccess?: (
    action: "create" | "update" | "delete",
    meta: { moduleKey: string; submodule: string; recordId?: string; targetSubmodule?: string }
  ) => void;
  /** Kutoka AppLayout: angazia safu mpya kwa muda */
  highlightRecordId?: string | null;
}

function mkId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

const DEV_ACTION_MAX_NAME = 80;
const DEV_ACTION_MAX_FIELD_KEY = 60;
const DEV_DUPLICATE_MESSAGE = "Taarifa hii tayari ipo.";
const INCOME_SOURCE_CATEGORIES = [
  "Michango ya Kiroho",
  "Makundi / Idara",
  "Maendeleo",
  "Huduma na Jamii",
  "Harambee / Special",
] as const;

const VIONGOZI_SUBMODULES = new Set(modules.find((m) => m.key === "viongozi")?.submodules ?? []);

/** Chuja viongozi kwa kipengele kamili cha menyu; ukikosa matokeo, onyesha ujumbe (si kurudi orodha nzima). */
function filterViongoziBySubmodule(
  rows: KiongoziRecord[],
  submodule: string
): { displayRows: KiongoziRecord[]; emptyHint: string | null; filtered: boolean } {
  const list = safeArray(rows);
  const key = submodule.trim();
  if (!key || !VIONGOZI_SUBMODULES.has(key)) {
    return { displayRows: list, emptyHint: null, filtered: false };
  }
  const hay = (r: KiongoziRecord) => safeLower(`${r.cheo ?? ""} ${r.ngazi ?? ""} ${r.jina ?? ""}`);
  let filteredList: KiongoziRecord[];
  switch (key) {
    case "Maaskofu":
      filteredList = list.filter((r) => hay(r).includes("askofu"));
      break;
    case "Wachungaji":
      filteredList = list.filter(
        (r) => hay(r).includes("chungaji") || hay(r).includes("pastor") || hay(r).includes("mchungaji")
      );
      break;
    case "Wainjilisti":
      filteredList = list.filter((r) => hay(r).includes("injili") || hay(r).includes("evangel"));
      break;
    case "Wazee":
      filteredList = list.filter((r) => hay(r).includes("mzee") || hay(r).includes("elder"));
      break;
    case "Mashemasi":
      filteredList = list.filter((r) => hay(r).includes("shemasi") || hay(r).includes("deacon"));
      break;
    case "KMK(T) VIONGOZI WA NGAZI KUU TANZANIA":
      filteredList = list.filter(
        (r) =>
          /\b(kuu|taifa|national|katibu)\b/i.test(safeString(`${r.ngazi} ${r.cheo}`)) ||
          hay(r).includes("kuu") ||
          hay(r).includes("mkuu")
      );
      break;
    case "Viongozi wa Matawi/Vituo":
      filteredList = list.filter((r) => {
        const tw = (r.tawi || "").trim();
        return tw.length > 0 && tw !== "—";
      });
      break;
    case "Viongozi wa Dayosisi":
      filteredList = list.filter((r) => /\bdayosisi\b/i.test(safeString(`${r.ngazi} ${r.assigned_entity ?? ""}`)) || Boolean((r.dayosisi || "").trim()));
      break;
    case "Viongozi wa Majimbo":
      filteredList = list.filter((r) => /\bjimbo\b/i.test(safeString(`${r.ngazi} ${r.assigned_entity ?? ""}`)) || Boolean((r.jimbo || "").trim()));
      break;
    case "Viongozi wa Idara":
      filteredList = list.filter((r) => Boolean((r.idara_name || "").trim()));
      break;
    case "Viongozi wa Huduma":
      filteredList = list.filter((r) => Boolean((r.huduma_name || "").trim()));
      break;
    case "Viongozi wa Taasisi":
      filteredList = list.filter((r) => Boolean((r.taasisi_name || "").trim()));
      break;
    case "Viongozi wa Jumuiya":
      filteredList = list.filter((r) => Boolean((r.jumuiya_name || "").trim()));
      break;
    default:
      filteredList = list;
  }
  if (filteredList.length === 0) return { displayRows: [], emptyHint: key, filtered: true };
  return { displayRows: filteredList, emptyHint: null, filtered: true };
}

/** Chuja miamala kwa submodule ya menyu ya Fedha (skrini moja, makundi tofauti). */
function filterFedhaRowsBySubmodule(rows: FedhaRecord[], submodule: string): FedhaRecord[] {
  const list = safeArray(rows);
  const t = submodule.trim();
  const s = safeLower(t);
  if (!t || t === "Overview") return list;
  if (s.includes("matumizi") || s.includes("expenses")) return list.filter((r) => r.aina === "Matumizi");
  if (s.includes("michango")) return list.filter((r) => r.aina === "Michango");
  if (s.includes("zaka")) return list.filter((r) => safeIncludes(r.kategoria, "zaka"));
  if (s.includes("sadaka")) return list.filter((r) => safeIncludes(r.kategoria, "sadaka"));
  if (s.includes("mapato") && !s.includes("income")) return list.filter((r) => r.aina === "Mapato");
  if (s.includes("financial reports")) return list;
  return list;
}

const DOMAIN_ENTITY_MODULE_KEYS = [
  "jumuiya",
  "taasisi",
  "matukio",
  "machapisho",
  "nyaraka",
  "ripoti",
  "communications",
  "super_admin",
] as const;

export function ModulePage(props: Props) {
  const { pushToast, reportError, site, role, saveSite, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule, canPortalExportModule } =
    usePortal();
  const [editing, setEditing] = useState<any>(null);
  const [devModal, setDevModal] = useState<null | "category" | "type" | "field" | "section">(null);
  const [devSaving, setDevSaving] = useState(false);
  const [devError, setDevError] = useState("");
  const [devTypes, setDevTypes] = useState<DeveloperTaxonomyRow[]>([]);
  const [devSections, setDevSections] = useState<DeveloperTaxonomyRow[]>([]);

  const saveSiteTaxonomyList = useCallback(
    async (kind: "categories" | "custom_fields", rows: Array<Record<string, string>>) => {
      const client = getSupabase();
      if (!client) {
        throw new Error("Muunganisho wa Supabase haujapatikana. Tafadhali hakiki .env ya app-next.");
      }
      const { data: existing, error: readErr } = await client
        .from("site_settings")
        .select("id,categories,custom_fields")
        .limit(1)
        .maybeSingle();
      if (readErr) {
        const msg = safeLower(readErr.message || "");
        if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("networkerror")) {
          throw new Error("Imeshindikana kuwasiliana na seva.");
        }
        if (msg.includes("does not exist") || msg.includes("undefined table") || msg.includes("42p01")) {
          throw new Error("Jedwali husika halijapatikana kwenye Supabase.");
        }
        console.error("[Developer:site_settings.read]", readErr);
        throw new Error(readErr.message || "Imeshindikana kusoma site_settings.");
      }
      if (existing?.id) {
        const { error: updateErr } = await client
          .from("site_settings")
          .update({
            [kind]: rows,
            updated_at: new Date().toISOString(),
          })
          .eq("id", String(existing.id));
        if (updateErr) {
          const msg = safeLower(updateErr.message || "");
          if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("networkerror")) {
            throw new Error("Imeshindikana kuwasiliana na seva.");
          }
          if (msg.includes("does not exist") || msg.includes("undefined table") || msg.includes("42p01")) {
            throw new Error("Jedwali husika halijapatikana kwenye Supabase.");
          }
          console.error("[Developer:site_settings.update]", updateErr);
          throw new Error(updateErr.message || "Imeshindikana kusasisha site_settings.");
        }
      } else {
        const payload: Record<string, unknown> = {
          hero_image_url: null,
          cross_image_url: null,
          gallery: [],
          categories: kind === "categories" ? rows : [],
          custom_fields: kind === "custom_fields" ? rows : [],
          maintenance_mode: false,
          social_links: {},
          updated_at: new Date().toISOString(),
        };
        const { error: insertErr } = await client.from("site_settings").insert(payload);
        if (insertErr) {
          const msg = safeLower(insertErr.message || "");
          if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("networkerror")) {
            throw new Error("Imeshindikana kuwasiliana na seva.");
          }
          if (msg.includes("does not exist") || msg.includes("undefined table") || msg.includes("42p01")) {
            throw new Error("Jedwali husika halijapatikana kwenye Supabase.");
          }
          console.error("[Developer:site_settings.insert]", insertErr);
          throw new Error(insertErr.message || "Imeshindikana kuanzisha site_settings.");
        }
      }
      await saveSite({});
    },
    [saveSite]
  );
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");

  const [distinctFinanceKat, setDistinctFinanceKat] = useState<string[]>([]);
  useEffect(() => {
    if (!getSupabase()) return;
    void fetchDistinctFinanceKategoria().then(setDistinctFinanceKat);
  }, []);

  const fedhaKategoriaOptions = useMemo(
    () => mergeCategoryStrings(DEFAULT_FINANCE_ENTRY_KATEGORIA, site.categories, distinctFinanceKat),
    [site.categories, distinctFinanceKat]
  );

  const incomeCategoryTabs = useMemo(() => buildIncomeCategoryFilterTabs(site.categories), [site.categories]);
  const levelFilterTabs = useMemo(() => ["ALL", ...CHURCH_LEVEL_OPTIONS], []);

  const fedhaFiltered = useMemo(() => {
    if (props.moduleKey !== "fedha") return props.fedha;
    return filterFedhaRowsBySubmodule(props.fedha, props.submodule);
  }, [props.moduleKey, props.fedha, props.submodule]);

  const emitCrud = useCallback(
    (action: "create" | "update" | "delete", recordId?: string, targetSubmodule?: string) => {
      window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
      props.onCrudSuccess?.(action, {
        moduleKey: props.moduleKey,
        submodule: props.submodule,
        recordId,
        targetSubmodule,
      });
    },
    [props]
  );

  const afterDelete = useCallback((recordId?: string) => emitCrud("delete", recordId), [emitCrud]);

  const onSave = async (payload: any) => {
    const isUpdate = Boolean(
      editing && typeof (editing as { id?: string }).id === "string" && String((editing as { id?: string }).id).length > 0
    );

    if (props.moduleKey === "muundo" && props.submodule === "Dayosisi") {
      if (!canManageMuundo) {
        pushToast("Huna ruhusa ya kusimamia muundo wa kanisa.", "error");
        return;
      }
      const merged: DayosisiRecord = editing
        ? { ...editing, ...payload }
        : ({ id: mkId("d"), ...payload } as DayosisiRecord);
      if (!merged.jina?.trim() || !merged.code?.trim()) {
        pushToast("Jina na code vinahitajika.", "error");
        return;
      }
      const duplicateCode = props.dayosisi.some(
        (x) => x.id !== editing?.id && safeLower(x.code) === safeLower(String(merged.code ?? "").trim())
      );
      if (duplicateCode) {
        pushToast("Code tayari imetumika.", "error");
        return;
      }
      if (merged.simu?.trim() && !/^[0-9+\-\s()]{7,20}$/.test(merged.simu.trim())) {
        pushToast("Namba ya simu si sahihi.", "error");
        return;
      }
      if (merged.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merged.email.trim())) {
        pushToast("Barua pepe si sahihi.", "error");
        return;
      }
      try {
        const saved = await upsertDayosisi(merged);
        props.setDayosisi((prev) =>
          editing?.id ? prev.map((x) => (x.id === editing.id ? saved : x)) : [saved, ...prev]
        );
        if (getSupabase()) pushToast("Dayosisi imehifadhiwa.", "success");
        emitCrud(isUpdate ? "update" : "create", saved.id, props.submodule);
        setEditing(null);
      } catch (err) {
        reportError(err, "Dayosisi");
      }
      return;
    }
    if (props.moduleKey === "muundo" && props.submodule === "Majimbo") {
      if (!canManageMuundo) {
        pushToast("Huna ruhusa ya kusimamia muundo wa kanisa.", "error");
        return;
      }
      const merged = (editing ? { ...editing, ...payload } : payload) as JimboRecord;
      if (!merged.jina?.trim() || !String(merged.dayosisi_id ?? merged.dayosisi ?? "").trim()) {
        pushToast("Jina la jimbo na parent (dayosisi) vinahitajika.", "error");
        return;
      }
      const duplicateName = props.majimbo.some(
        (x) =>
          x.id !== editing?.id &&
          safeLower(x.jina) === safeLower(String(merged.jina ?? "").trim()) &&
          safeLower(String(x.dayosisi_id ?? x.dayosisi ?? "")) === safeLower(String(merged.dayosisi_id ?? merged.dayosisi ?? ""))
      );
      if (duplicateName) {
        pushToast("Jina hili tayari lipo chini ya dayosisi hiyo.", "error");
        return;
      }
      if (merged.simu?.trim() && !/^[0-9+\-\s()]{7,20}$/.test(merged.simu.trim())) {
        pushToast("Namba ya simu si sahihi.", "error");
        return;
      }
      try {
        const saved = await upsertChurchJimbo(merged, props.dayosisi);
        const updating = typeof editing?.id === "string" && isPersistedUuid(editing.id);
        props.setMajimbo((prev) => (updating ? prev.map((x) => (x.id === editing.id ? saved : x)) : [saved, ...prev]));
        if (getSupabase()) pushToast("Jimbo limehifadhiwa.", "success");
        emitCrud(updating ? "update" : "create", saved.id, props.submodule);
        setEditing(null);
      } catch (err) {
        reportError(err, "Majimbo");
      }
      return;
    }
    if (props.moduleKey === "muundo" && props.submodule.includes("Matawi")) {
      if (!canManageMuundo) {
        pushToast("Huna ruhusa ya kusimamia muundo wa kanisa.", "error");
        return;
      }
      const merged = (editing ? { ...editing, ...payload } : payload) as TawiRecord;
      if (!merged.jina?.trim() || !String(merged.jimbo_id ?? merged.jimbo ?? "").trim()) {
        pushToast("Jina la tawi na parent (jimbo) vinahitajika.", "error");
        return;
      }
      const duplicateName = props.matawi.some(
        (x) =>
          x.id !== editing?.id &&
          safeLower(x.jina) === safeLower(String(merged.jina ?? "").trim()) &&
          safeLower(String(x.jimbo_id ?? x.jimbo ?? "")) === safeLower(String(merged.jimbo_id ?? merged.jimbo ?? ""))
      );
      if (duplicateName) {
        pushToast("Jina hili tayari lipo chini ya jimbo hilo.", "error");
        return;
      }
      if (merged.simu?.trim() && !/^[0-9+\-\s()]{7,20}$/.test(merged.simu.trim())) {
        pushToast("Namba ya simu si sahihi.", "error");
        return;
      }
      try {
        const saved = await upsertChurchTawi(merged, props.dayosisi, props.majimbo);
        const updating = typeof editing?.id === "string" && isPersistedUuid(editing.id);
        props.setMatawi((prev) => (updating ? prev.map((x) => (x.id === editing.id ? saved : x)) : [saved, ...prev]));
        if (getSupabase()) pushToast("Tawi limehifadhiwa.", "success");
        emitCrud(updating ? "update" : "create", saved.id, props.submodule);
        setEditing(null);
      } catch (err) {
        reportError(err, "Matawi");
      }
      return;
    }
    if (props.moduleKey === "viongozi") {
      const merged = (editing ? { ...editing, ...payload } : payload) as KiongoziRecord;
      const duplicateActive = props.viongozi.some(
        (x) =>
          x.id !== editing?.id &&
          String(x.cheo || "").trim().toLowerCase() === String(merged.cheo || "").trim().toLowerCase() &&
          String(x.assigned_entity || "").trim().toLowerCase() === String(merged.assigned_entity || "").trim().toLowerCase() &&
          String(x.term_status || "active").toLowerCase() === "active"
      );
      if (duplicateActive) {
        pushToast("Nafasi hii tayari ina kiongozi active kwenye entity hili.", "error");
        return;
      }
      try {
        const saved = await upsertKiongozi(merged);
        const updating = typeof editing?.id === "string" && isViongoziUuid(editing.id);
        props.setViongozi((prev) => (updating ? prev.map((x) => (x.id === editing.id ? saved : x)) : [saved, ...prev]));
        if (getSupabase()) pushToast("Kiongozi amehifadhiwa.", "success");
        emitCrud(updating ? "update" : "create", saved.id, props.submodule);
        setEditing(null);
      } catch (err) {
        reportError(err, "Viongozi");
      }
      return;
    }
    if (props.moduleKey === "fedha") {
      const merged = (editing ? { ...editing, ...payload } : payload) as FedhaRecord;
      try {
        const saved = await upsertFinanceEntry(merged);
        const updating = typeof editing?.id === "string" && isPersistedUuid(editing.id);
        props.setFedha((prev) => (updating ? prev.map((x) => (x.id === editing.id ? saved : x)) : [saved, ...prev]));
        if (getSupabase()) {
          pushToast("Miamala imehifadhiwa.", "success");
          void fetchDistinctFinanceKategoria().then(setDistinctFinanceKat);
        }
        emitCrud(updating ? "update" : "create", saved.id, props.submodule);
        setEditing(null);
      } catch (err) {
        reportError(err, "Fedha");
      }
      return;
    }
    if (props.moduleKey === "vyanzo_mapato") {
      const ainaNorm: IncomeSourceRecord["aina"] = String(payload.aina ?? "")
        .toLowerCase()
        .includes("taarifa")
        ? "Taarifa ya Msingi"
        : "Mapato Halisi";
      const chanzoNorm = String(payload.chanzo ?? editing?.chanzo ?? "").trim();
      const codeNorm = String(payload.source_code ?? editing?.source_code ?? "").trim().toUpperCase();
      if (!chanzoNorm || !codeNorm) {
        pushToast("Jaza taarifa muhimu.", "error");
        return;
      }
      const duplicateSource = props.incomeSources.some(
        (x) => x.id !== editing?.id && safeLower(x.chanzo) === safeLower(chanzoNorm)
      );
      if (duplicateSource) {
        pushToast("Source tayari ipo.", "error");
        return;
      }
      const duplicateCode = props.incomeSources.some(
        (x) => x.id !== editing?.id && safeLower(String(x.source_code ?? "")) === safeLower(codeNorm)
      );
      if (duplicateCode) {
        pushToast("Code tayari imetumika.", "error");
        return;
      }
      const merged = (
        editing
          ? { ...editing, ...payload, aina: ainaNorm, chanzo: chanzoNorm, source_code: codeNorm }
          : { ...payload, aina: ainaNorm, chanzo: chanzoNorm, source_code: codeNorm }
      ) as Partial<IncomeSourceRecord> & { chanzo: string };
      try {
        const saved = await upsertIncomeSource(merged);
        const updating = typeof editing?.id === "string" && isIncomeUuid(editing.id);
        props.setIncomeSources((prev) => (updating ? prev.map((x) => (x.id === editing.id ? saved : x)) : [saved, ...prev]));
        if (getSupabase()) pushToast("Chanzo kimehifadhiwa.", "success");
        emitCrud(updating ? "update" : "create", saved.id, props.submodule);
        setEditing(null);
      } catch (err) {
        reportError(err, "Vyanzo vya mapato");
      }
      return;
    }
    if (props.moduleKey === "mapato_income") {
      const merged = (editing ? { ...editing, ...payload } : payload) as IncomeManagementRecord;
      if (typeof merged.amount !== "number") merged.amount = Number(payload.amount ?? 0);
      const sourceId = String(merged.sourceId ?? "").trim();
      if (!sourceId) {
        pushToast("Jaza taarifa muhimu.", "error");
        return;
      }
      if (!merged.collectionDate || String(merged.collectionDate).trim().length < 10 || Number(merged.amount || 0) <= 0) {
        pushToast("Jaza taarifa muhimu.", "error");
        return;
      }
      const selectedSource = props.incomeSources.find((x) => x.id === sourceId);
      if (!selectedSource) {
        pushToast("Hakuna source za mapato bado.", "error");
        return;
      }
      merged.sourceId = sourceId;
      merged.sourceName = String(merged.sourceName ?? "").trim() || selectedSource.chanzo;
      merged.mainCategory = String(merged.mainCategory ?? "").trim() || String(selectedSource.category ?? "");
      merged.frequency = (String(merged.frequency ?? "").trim() || String(selectedSource.frequency ?? "Monthly")) as IncomeManagementRecord["frequency"];
      merged.restrictedFund = (String(merged.restrictedFund ?? "").trim() || String(selectedSource.restrictedFund ?? "No")) as "Yes" | "No";
      merged.approvalRequired = (String(merged.approvalRequired ?? "").trim() ||
        String(selectedSource.approvalRequired ?? (selectedSource.restrictedFund === "Yes" ? "Yes" : "No"))) as "Yes" | "No";
      if (
        String(merged.restrictedFund ?? "No") === "Yes" &&
        selectedSource.category &&
        merged.mainCategory &&
        safeLower(String(merged.mainCategory)) !== safeLower(selectedSource.category)
      ) {
        pushToast("Restricted fund haiwezi kupelekwa category isiyo sahihi.", "error");
        return;
      }
      const duplicateIncomeCode = props.incomeManagement.some(
        (x) => x.id !== editing?.id && safeLower(String(x.incomeCode ?? "").trim()) === safeLower(String(merged.incomeCode ?? "").trim())
      );
      if (duplicateIncomeCode) {
        pushToast("Code tayari imetumika.", "error");
        return;
      }
      const receiptNo = String(merged.receiptNo ?? "").trim();
      if (receiptNo) {
        const duplicateReceipt = props.incomeManagement.some(
          (x) => x.id !== editing?.id && safeLower(String(x.receiptNo ?? "").trim()) === safeLower(receiptNo)
        );
        if (duplicateReceipt) {
          pushToast("Receipt tayari imetumika.", "error");
          return;
        }
      }
      try {
        const saved = await upsertIncomeLine(merged);
        const updating = typeof editing?.id === "string" && isIncomeUuid(editing.id);
        props.setIncomeManagement((prev) => (updating ? prev.map((x) => (x.id === editing.id ? saved : x)) : [saved, ...prev]));
        if (getSupabase()) pushToast("Mstari wa mapato umehifadhiwa.", "success");
        emitCrud(updating ? "update" : "create", saved.id, props.submodule);
        setEditing(null);
      } catch (err) {
        reportError(err, "Mapato (mstari)");
      }
      return;
    }
  };

  const shared = useMemo(
    () => ({
      canAdd: canPortalCreateModule(props.moduleKey),
      canEdit: canPortalEditModule(props.moduleKey),
      canDelete: canPortalDeleteModule(props.moduleKey),
      canExport: canPortalExportModule(props.moduleKey),
    }),
    [
      props.moduleKey,
      canPortalCreateModule,
      canPortalEditModule,
      canPortalDeleteModule,
      canPortalExportModule,
    ]
  );

  const moduleUsesOwnCrudUi =
    props.moduleKey === "developer" ||
    props.moduleKey === "documents" ||
    props.moduleKey === "mahubiri" ||
    props.moduleKey === "events" ||
    props.moduleKey === "gallery" ||
    props.moduleKey === "habari" ||
    props.moduleKey === "video_library" ||
    props.moduleKey === "audio_library" ||
    props.moduleKey === "file_manager" ||
    props.moduleKey === "live_stream" ||
    props.moduleKey === "analytics" ||
    props.moduleKey === "ai_assistant" ||
    props.moduleKey === "notifications" ||
    props.moduleKey === "aid_management" ||
    props.moduleKey === "communications" ||
    props.moduleKey === "registration_requests" ||
    props.moduleKey === "invite_promote_permissions";
  const canUseDeveloperActions = role === "super_admin";
  const canManageMuundo = role === "super_admin";
  const moduleHeaderCanAdd = (props.moduleKey === "muundo" ? canManageMuundo : shared.canAdd) && !moduleUsesOwnCrudUi;

  const loadDeveloperLists = useCallback(async () => {
    const [types, sections] = await Promise.all([fetchDeveloperTypes(), fetchDeveloperSections()]);
    setDevTypes(types);
    setDevSections(sections);
  }, []);

  const openDeveloperModal = useCallback(
    (target: "category" | "type" | "field" | "section") => {
      if (!canUseDeveloperActions) {
        pushToast("Huna ruhusa ya kufanya kitendo hiki", "error");
        return;
      }
      setDevError("");
      setDevModal(target);
      if (target === "type" || target === "section") {
        void loadDeveloperLists().catch((err) => {
          reportError(err, "Developer taxonomy");
        });
      }
    },
    [canUseDeveloperActions, loadDeveloperLists, pushToast, reportError]
  );

  const closeDeveloperModal = useCallback(() => {
    if (devSaving) return;
    setDevError("");
    setDevModal(null);
  }, [devSaving]);

  const saveDeveloperAction = useCallback(
    async (payload: { name: string; fieldKey?: string }) => {
      if (!devModal || devSaving) return;
      if (!canUseDeveloperActions) {
        setDevError("Huna ruhusa ya kufanya kitendo hiki");
        return;
      }
      const name = payload.name.trim();
      const fieldKey = safeLower(String(payload.fieldKey ?? "").trim());
      const normalizedName = safeLower(name);
      if (!name) {
        setDevError("Jina/label linahitajika.");
        return;
      }
      if (name.length > DEV_ACTION_MAX_NAME) {
        setDevError(`Jina lisizidi herufi ${DEV_ACTION_MAX_NAME}.`);
        return;
      }
      if (devModal === "field" && !fieldKey) {
        setDevError("Field key inahitajika.");
        return;
      }
      if (devModal === "field" && fieldKey.length > DEV_ACTION_MAX_FIELD_KEY) {
        setDevError(`Field key isizidi herufi ${DEV_ACTION_MAX_FIELD_KEY}.`);
        return;
      }
      if (devModal === "field" && !/^[a-z0-9_]+$/.test(fieldKey)) {
        setDevError("Field key lazima iwe herufi ndogo, namba au underscore (_) bila nafasi.");
        return;
      }
      setDevSaving(true);
      setDevError("");
      try {
        if (devModal === "category") {
          const duplicate = site.categories.some((x) => safeLower(x.name) === normalizedName);
          if (duplicate) {
            setDevError(DEV_DUPLICATE_MESSAGE);
            return;
          }
          const next = [...site.categories, { id: `c-${Date.now()}`, name }];
          await saveSiteTaxonomyList("categories", next as unknown as Array<Record<string, string>>);
          pushToast("Imehifadhiwa kikamilifu", "success");
        } else if (devModal === "field") {
          const duplicate = site.custom_fields.some(
            (x) => safeLower(x.label) === normalizedName || safeLower(String(x.field_key ?? "")) === fieldKey
          );
          if (duplicate) {
            setDevError(DEV_DUPLICATE_MESSAGE);
            return;
          }
          const next = [...site.custom_fields, { id: `f-${Date.now()}`, label: name, field_key: fieldKey }];
          await saveSiteTaxonomyList("custom_fields", next as unknown as Array<Record<string, string>>);
          pushToast("Imehifadhiwa kikamilifu", "success");
        } else if (devModal === "type") {
          const duplicate = devTypes.some((x) => safeLower(x.name) === normalizedName);
          if (duplicate) {
            setDevError(DEV_DUPLICATE_MESSAGE);
            return;
          }
          await createDeveloperType(name);
          await loadDeveloperLists();
          pushToast("Imehifadhiwa kikamilifu", "success");
        } else {
          const duplicate = devSections.some((x) => safeLower(x.name) === normalizedName);
          if (duplicate) {
            setDevError(DEV_DUPLICATE_MESSAGE);
            return;
          }
          await createDeveloperSection(name);
          await loadDeveloperLists();
          pushToast("Imehifadhiwa kikamilifu", "success");
        }
        setDevModal(null);
      } catch (err) {
        console.error("[Developer:saveDeveloperAction]", err);
        const msg = err instanceof Error && err.message ? err.message : "Imeshindikana kuhifadhi. Jaribu tena.";
        setDevError(msg);
      } finally {
        setDevSaving(false);
      }
    },
    [
      canUseDeveloperActions,
      devModal,
      devSaving,
      devSections,
      devTypes,
      loadDeveloperLists,
      pushToast,
      saveSiteTaxonomyList,
      site.categories,
      site.custom_fields,
    ]
  );

  const view = useMemo(() => {
    if (props.moduleKey === "developer") {
      return <DeveloperProfilePanel />;
    }
    if (props.moduleKey === "documents") {
      return <ChurchDocumentsPanel highlightRecordId={props.highlightRecordId} />;
    }
    if (props.moduleKey === "mahubiri") {
      return <SermonsPanel highlightRecordId={props.highlightRecordId} />;
    }
    if (props.moduleKey === "events") {
      return <EventsPanel submodule={props.submodule} highlightRecordId={props.highlightRecordId} />;
    }
    if (props.moduleKey === "gallery") {
      return <GalleryPanel highlightRecordId={props.highlightRecordId} />;
    }
    if (props.moduleKey === "habari") {
      return <HabariPanel highlightRecordId={props.highlightRecordId} />;
    }
    if (props.moduleKey === "video_library") {
      return <VideoLibraryPanel highlightRecordId={props.highlightRecordId} />;
    }
    if (props.moduleKey === "audio_library") {
      return <AudioLibraryPanel highlightRecordId={props.highlightRecordId} />;
    }
    if (props.moduleKey === "file_manager") {
      return <FileManagerPanel />;
    }
    if (props.moduleKey === "live_stream") {
      return <LiveStreamPanel submodule={props.submodule} />;
    }
    if (props.moduleKey === "analytics") {
      const ripoti = (props.submodule ?? "").trim().toLowerCase().includes("ripoti");
      return <AnalyticsDashboardPanel variant={ripoti ? "ripoti" : "dashibodi"} />;
    }
    if (props.moduleKey === "ai_assistant") {
      return <AIAssistantPanel submodule={props.submodule} />;
    }
    if (props.moduleKey === "notifications") {
      return <NotificationsCenterPanel submodule={props.submodule} />;
    }
    if (props.moduleKey === "attendance") {
      return <AttendancePanel />;
    }
    if (props.moduleKey === "aid_management") {
      return <AidManagementPanel submodule={props.submodule} highlightRecordId={props.highlightRecordId} />;
    }
    if (props.moduleKey === "communications") {
      return <CommunicationsPanel submodule={props.submodule} highlightRecordId={props.highlightRecordId} />;
    }
    if (props.moduleKey === "registration_requests") {
      return <RegistrationRequestsPanel />;
    }
    if (props.moduleKey === "invite_promote_permissions") {
      return <InvitePromotePermissionsPanel submodule={props.submodule} />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "Church Identity") {
      return <ChurchIdentitySettingsPanel />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "Logo & Branding") {
      return <BrandingTablePanel />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "Tovuti & Picha za Juu") {
      return <SiteBrandingPanel />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "Kuhusu KMKT") {
      return <AboutKmktPanel />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "Categories") {
      return <SiteTaxonomyPanel mode="categories" />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "Custom Fields") {
      return <SiteTaxonomyPanel mode="custom_fields" />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "Global Settings") {
      return <SystemSettingsPanel />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "Master Settings Center") {
      return <MasterSettingsCenterPanel />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "Mipangilio ya ziada") {
      return <AdvancedSettingsPanel />;
    }
    if (props.moduleKey === "mipangilio" && props.submodule === "SEO & Umma") {
      return <SeoPublicSettingsPanel />;
    }
    if (props.moduleKey === "waumini" && props.submodule === "Orodha ya Waumini") {
      return (
        <ChurchMembersPanel
          dayosisi={props.dayosisi}
          mode="list"
          highlightRecordId={props.highlightRecordId}
          crudContext={{ moduleKey: props.moduleKey, submodule: props.submodule }}
          onCrudSuccess={props.onCrudSuccess}
        />
      );
    }
    if (props.moduleKey === "waumini" && props.submodule === "Familia") {
      return (
        <ChurchFamiliesPanel
          dayosisi={props.dayosisi}
          highlightRecordId={props.highlightRecordId}
          crudContext={{ moduleKey: props.moduleKey, submodule: props.submodule }}
          onCrudSuccess={props.onCrudSuccess}
        />
      );
    }
    if (props.moduleKey === "waumini" && props.submodule === "Ubatizo") {
      return (
        <ChurchMembersPanel
          dayosisi={props.dayosisi}
          mode="baptism"
          highlightRecordId={props.highlightRecordId}
          crudContext={{ moduleKey: props.moduleKey, submodule: props.submodule }}
          onCrudSuccess={props.onCrudSuccess}
        />
      );
    }
    if (props.moduleKey === "waumini" && props.submodule === "Membership Status") {
      return (
        <ChurchMembersPanel
          dayosisi={props.dayosisi}
          mode="status"
          highlightRecordId={props.highlightRecordId}
          crudContext={{ moduleKey: props.moduleKey, submodule: props.submodule }}
          onCrudSuccess={props.onCrudSuccess}
        />
      );
    }
    if (props.moduleKey === "waumini" && props.submodule === "Member Profiles") {
      return (
        <ChurchMembersPanel
          dayosisi={props.dayosisi}
          mode="profiles"
          highlightRecordId={props.highlightRecordId}
          crudContext={{ moduleKey: props.moduleKey, submodule: props.submodule }}
          onCrudSuccess={props.onCrudSuccess}
        />
      );
    }
    if (props.moduleKey === "usalama" && props.submodule === "Users") {
      return <PortalDirectoryPanel />;
    }
    if (props.moduleKey === "usalama" && props.submodule === "Roles") {
      return <SecurityRolesPanel />;
    }
    if (props.moduleKey === "usalama" && props.submodule === "Permissions") {
      return <SecurityMatrixPanel />;
    }
    if (props.moduleKey === "usalama" && props.submodule === "Sessions") {
      return <SecuritySessionsPanel />;
    }
    if (props.moduleKey === "usalama" && props.submodule === "Visibility Rules") {
      return <VisibilityRulesPanel />;
    }
    if (props.moduleKey === "usalama" && props.submodule === "Audit Logs") {
      return <ChurchAuditLogPanel contextLabel="Mipangilio ya Usalama" />;
    }
    if (
      props.moduleKey === "super_admin" &&
      ["System Health", "Backups", "Error Logs", "Storage", "Deployment", "Maintenance"].includes(props.submodule)
    ) {
      return <SystemHealthCenterPanel />;
    }
    if (props.moduleKey === "fedha" && props.submodule === "Audit Trail") {
      return <ChurchAuditLogPanel contextLabel="Fedha — uchunguzi wa nyumba" />;
    }
    if (props.moduleKey === "muundo" && (props.submodule === "Ngazi Kuu" || props.submodule === "KMK(T)")) {
      return <NgaziKuuSummary dayosisi={props.dayosisi} majimbo={props.majimbo} matawi={props.matawi} />;
    }
    if (props.moduleKey === "muundo" && props.submodule.includes("Hierarchy")) {
      return <HierarchyTreeView dayosisi={props.dayosisi} majimbo={props.majimbo} matawi={props.matawi} />;
    }
    if (props.moduleKey === "muundo" && ["Idara", "Huduma", "Taasisi", "Jumuiya"].includes(props.submodule)) {
      return (
        <DomainEntitiesPanel
          moduleKey="muundo"
          submodule={props.submodule}
          title={`${props.submodule} — Muundo wa Kanisa`}
          subtitle="Usajili wa ngazi ya kimuundo (parent, mawasiliano, status)"
          highlightRecordId={props.highlightRecordId}
          onCrudSuccess={props.onCrudSuccess}
        />
      );
    }
    if (props.moduleKey === "taasisi" && props.submodule === "Log ya Shule") {
      return (
        <ChurchSchoolLogsPanel
          highlightRecordId={props.highlightRecordId}
          onCrudSuccess={props.onCrudSuccess}
        />
      );
    }
    if (DOMAIN_ENTITY_MODULE_KEYS.includes(props.moduleKey as (typeof DOMAIN_ENTITY_MODULE_KEYS)[number])) {
      return (
        <DomainEntitiesPanel
          moduleKey={props.moduleKey}
          submodule={props.submodule}
          highlightRecordId={props.highlightRecordId}
          onCrudSuccess={props.onCrudSuccess}
        />
      );
    }
    if (props.moduleKey === "muundo" && props.submodule === "Dayosisi") {
      const dayosisiSpec = getPortalExcelFormSpec("muundo", "Dayosisi");
      const dayosisiExcel: PremiumTableExcelBulk | undefined = dayosisiSpec
        ? {
            specTitle: dayosisiSpec.specTitle,
            specSubtitle: dayosisiSpec.specSubtitle,
            templateBasename: dayosisiSpec.templateBasename,
            columns: dayosisiSpec.columns,
            instructionRows: dayosisiSpec.instructionRows,
            onImportRows: shared.canAdd
              ? async (rows) => {
                  const r = await bulkImportDayosisi(rows, props.setDayosisi, (a, id) => emitCrud(a, id, props.submodule));
                  return {
                    ok: r.ok,
                    fail: r.fail,
                    message: `Excel: ${r.ok} zimehifadhiwa; ${r.fail} zimeshindwa.`,
                  };
                }
              : undefined,
          }
        : undefined;
      return (
        <div className="space-y-2">
          {!canManageMuundo ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Huna ruhusa ya kusimamia muundo wa kanisa.
            </div>
          ) : null}
          <PremiumTable
            title="Orodha ya Dayosisi"
            subtitle="Usimamizi wa dayosisi zote"
            rows={props.dayosisi}
            columns={[{ key: "jina", label: "Jina la Dayosisi" }, { key: "askofu", label: "Askofu wa Dayosisi" }, { key: "makao", label: "Makao Makuu" }, { key: "simu", label: "Simu" }, { key: "email", label: "Email" }, { key: "status", label: "Status" }]}
            onAdd={canManageMuundo ? () => setEditing({}) : undefined}
            onEdit={canManageMuundo ? (r) => setEditing(r) : undefined}
            onDelete={canManageMuundo ? async (id) => {
              try {
                await deleteDayosisi(id);
                props.setDayosisi((p) => p.filter((x) => x.id !== id));
                pushToast("Dayosisi imefutwa.", "success");
                afterDelete(id);
              } catch (err) {
                reportError(err, "Kufuta dayosisi");
              }
            } : undefined}
            highlightRowId={props.highlightRecordId ?? undefined}
            actionsDisabled={!!editing}
            excelBulk={dayosisiExcel}
            canAdd={canManageMuundo}
            canEdit={canManageMuundo}
            canDelete={canManageMuundo}
            canExport={shared.canExport}
          />
        </div>
      );
    }
    if (props.moduleKey === "muundo" && props.submodule === "Majimbo") {
      const majimboSpec = getPortalExcelFormSpec("muundo", "Majimbo");
      const majimboExcel: PremiumTableExcelBulk | undefined = majimboSpec
        ? {
            specTitle: majimboSpec.specTitle,
            specSubtitle: majimboSpec.specSubtitle,
            templateBasename: majimboSpec.templateBasename,
            columns: majimboSpec.columns,
            instructionRows: majimboSpec.instructionRows,
            onImportRows: shared.canAdd
              ? async (rows) => {
                  const r = await bulkImportMajimbo(rows, props.dayosisi, props.setMajimbo, (a, id) =>
                    emitCrud(a, id, props.submodule)
                  );
                  return {
                    ok: r.ok,
                    fail: r.fail,
                    message: `Excel: ${r.ok} zimehifadhiwa; ${r.fail} zimeshindwa.`,
                  };
                }
              : undefined,
          }
        : undefined;
      return (
        <div className="space-y-2">
          {!canManageMuundo ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Huna ruhusa ya kusimamia muundo wa kanisa.
            </div>
          ) : null}
          <PremiumTable
            title="Orodha ya Majimbo"
            subtitle="Majimbo kwa dayosisi"
            rows={props.majimbo}
            columns={[{ key: "jina", label: "Jina la Jimbo" }, { key: "dayosisi", label: "Dayosisi" }, { key: "mkuu", label: "Mkuu wa Jimbo" }, { key: "mkoa", label: "Mkoa" }, { key: "simu", label: "Simu" }, { key: "status", label: "Status" }]}
            onAdd={canManageMuundo ? () => setEditing({}) : undefined}
            onEdit={canManageMuundo ? (r) => setEditing(r) : undefined}
            onDelete={canManageMuundo ? async (id) => {
              if (getSupabase()) {
                try {
                  await deleteChurchJimbo(id);
                  props.setMajimbo((p) => p.filter((x) => x.id !== id));
                  pushToast("Jimbo limefutwa.", "success");
                  afterDelete(id);
                } catch (err) {
                  reportError(err, "Kufuta jimbo");
                }
              } else {
                pushToast("Imeshindikana kuwasiliana na seva.", "error");
              }
            } : undefined}
            highlightRowId={props.highlightRecordId ?? undefined}
            actionsDisabled={!!editing}
            excelBulk={majimboExcel}
            canAdd={canManageMuundo}
            canEdit={canManageMuundo}
            canDelete={canManageMuundo}
            canExport={shared.canExport}
          />
        </div>
      );
    }
    if (props.moduleKey === "muundo" && props.submodule.includes("Matawi")) {
      const matawiSpec = getPortalExcelFormSpec("muundo", props.submodule);
      const matawiExcel: PremiumTableExcelBulk | undefined = matawiSpec
        ? {
            specTitle: matawiSpec.specTitle,
            specSubtitle: matawiSpec.specSubtitle,
            templateBasename: matawiSpec.templateBasename,
            columns: matawiSpec.columns,
            instructionRows: matawiSpec.instructionRows,
            onImportRows: shared.canAdd
              ? async (rows) => {
                  const r = await bulkImportMatawi(rows, props.dayosisi, props.majimbo, props.setMatawi, (a, id) =>
                    emitCrud(a, id, props.submodule)
                  );
                  return {
                    ok: r.ok,
                    fail: r.fail,
                    message: `Excel: ${r.ok} zimehifadhiwa; ${r.fail} zimeshindwa.`,
                  };
                }
              : undefined,
          }
        : undefined;
      return (
        <div className="space-y-2">
          {!canManageMuundo ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Huna ruhusa ya kusimamia muundo wa kanisa.
            </div>
          ) : null}
          <PremiumTable
            title="Orodha ya Matawi / Vituo"
            subtitle="Matawi na vituo vya huduma"
            rows={props.matawi}
            columns={[{ key: "jina", label: "Jina la Tawi/Kituo" }, { key: "aina", label: "Aina" }, { key: "dayosisi", label: "Dayosisi" }, { key: "jimbo", label: "Jimbo" }, { key: "kiongozi", label: "Kiongozi" }, { key: "simu", label: "Simu" }, { key: "status", label: "Status" }]}
            onAdd={canManageMuundo ? () => setEditing({}) : undefined}
            onEdit={canManageMuundo ? (r) => setEditing(r) : undefined}
            onDelete={canManageMuundo ? async (id) => {
              if (getSupabase()) {
                try {
                  await deleteChurchTawi(id);
                  props.setMatawi((p) => p.filter((x) => x.id !== id));
                  pushToast("Tawi limefutwa.", "success");
                  afterDelete(id);
                } catch (err) {
                  reportError(err, "Kufuta tawi");
                }
              } else {
                pushToast("Imeshindikana kuwasiliana na seva.", "error");
              }
            } : undefined}
            highlightRowId={props.highlightRecordId ?? undefined}
            actionsDisabled={!!editing}
            excelBulk={matawiExcel}
            canAdd={canManageMuundo}
            canEdit={canManageMuundo}
            canDelete={canManageMuundo}
            canExport={shared.canExport}
          />
        </div>
      );
    }
    if (props.moduleKey === "viongozi") {
      const { displayRows, emptyHint, filtered } = filterViongoziBySubmodule(props.viongozi, props.submodule);
      const viongoziSpec = getPortalExcelFormSpec("viongozi", props.submodule);
      const viongoziExcel: PremiumTableExcelBulk | undefined = viongoziSpec
        ? {
            specTitle: viongoziSpec.specTitle,
            specSubtitle: viongoziSpec.specSubtitle,
            templateBasename: viongoziSpec.templateBasename,
            columns: viongoziSpec.columns,
            instructionRows: viongoziSpec.instructionRows,
            onImportRows: shared.canAdd
              ? async (rows) => {
                  const r = await bulkImportViongozi(
                    rows,
                    props.dayosisi,
                    props.majimbo,
                    props.matawi,
                    props.setViongozi,
                    (a, id) => emitCrud(a, id, props.submodule)
                  );
                  return {
                    ok: r.ok,
                    fail: r.fail,
                    message: `Excel: ${r.ok} zimehifadhiwa; ${r.fail} zimeshindwa.`,
                  };
                }
              : undefined,
          }
        : undefined;
      return (
        <div className="space-y-3">
          {!emptyHint && displayRows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-700">Hakuna viongozi bado</div>
          ) : null}
          {emptyHint ? (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-center text-sm text-slate-700"
              role="status"
            >
              Hakuna viongozi wanaolingana na <strong>{emptyHint}</strong>. Ingiza taarifa sahihi katika Cheo / Ngazi au chagua kundi lingine.
            </div>
          ) : null}
          {!(emptyHint && displayRows.length === 0) ? (
          <PremiumTable
          title="ORODHA YA VIONGOZI"
          subtitle={`${props.submodule}${filtered ? " · kichujio kimewekwa" : ""} · Leadership registry ya KMK(T)`}
          rows={displayRows}
          columns={[
            { key: "jina", label: "Jina Kamili" },
            { key: "cheo", label: "Cheo" },
            { key: "leadership_level", label: "Level" },
            { key: "assigned_entity", label: "Assigned Entity" },
            { key: "dayosisi", label: "Dayosisi" },
            { key: "jimbo", label: "Jimbo" },
            { key: "tawi", label: "Tawi" },
            { key: "term_status", label: "Term" },
            { key: "simu", label: "Simu" },
            { key: "status", label: "Status" },
          ]}
          onAdd={() => setEditing({})}
          onEdit={(r) => setEditing(r)}
          onDelete={async (id) => {
            if (getSupabase()) {
              try {
                await deleteKiongozi(id);
                props.setViongozi((p) => p.filter((x) => x.id !== id));
                pushToast("Kiongozi amewekwa archive.", "success");
                afterDelete(id);
              } catch (err) {
                reportError(err, "Kufuta kiongozi");
              }
            } else {
              props.setViongozi((p) => p.filter((x) => x.id !== id));
              pushToast("Kiongozi amewekwa archive kwenye orodha ya ndani.", "info");
              afterDelete(id);
            }
          }}
          highlightRowId={props.highlightRecordId ?? undefined}
          actionsDisabled={!!editing}
          excelBulk={viongoziExcel}
          {...shared}
        />
          ) : null}
        </div>
      );
    }
    if (props.moduleKey === "fedha") {
      const fedhaSpec = getPortalExcelFormSpec("fedha", props.submodule);
      const fedhaExcel: PremiumTableExcelBulk | undefined = fedhaSpec
        ? {
            specTitle: fedhaSpec.specTitle,
            specSubtitle: fedhaSpec.specSubtitle,
            templateBasename: fedhaSpec.templateBasename,
            columns: fedhaSpec.columns,
            instructionRows: fedhaSpec.instructionRows,
            onImportRows: shared.canAdd
              ? async (rows) => {
                  const r = await bulkImportFedha(
                    rows,
                    props.dayosisi,
                    props.majimbo,
                    props.matawi,
                    props.setFedha,
                    (a, id) => emitCrud(a, id, props.submodule)
                  );
                  return {
                    ok: r.ok,
                    fail: r.fail,
                    message: `Excel: ${r.ok} zimehifadhiwa; ${r.fail} zimeshindwa.`,
                  };
                }
              : undefined,
          }
        : undefined;
      return (
        <PremiumTable
          title="Miamala ya Fedha"
          subtitle={`${props.submodule} · Mapato, michango, matumizi`}
          rows={fedhaFiltered}
          columns={[{ key: "tarehe", label: "Tarehe" }, { key: "aina", label: "Aina" }, { key: "kategoria", label: "Kategoria" }, { key: "kiasi", label: "Kiasi" }, { key: "ngazi", label: "Ngazi" }, { key: "dayosisi", label: "Dayosisi" }, { key: "jimbo", label: "Jimbo" }, { key: "tawi", label: "Tawi" }, { key: "status", label: "Status" }]}
          onAdd={() => setEditing({})}
          onEdit={(r) => setEditing(r)}
          onDelete={async (id) => {
            if (getSupabase()) {
              try {
                await deleteFinanceEntry(id);
                props.setFedha((p) => p.filter((x) => x.id !== id));
                pushToast("Miamala imefutwa.", "success");
                afterDelete(id);
              } catch (err) {
                reportError(err, "Kufuta miamala ya fedha");
              }
            } else {
              props.setFedha((p) => p.filter((x) => x.id !== id));
              pushToast("Miamala imeondolewa kwenye orodha (hakuna Supabase).", "info");
              afterDelete(id);
            }
          }}
          highlightRowId={props.highlightRecordId ?? undefined}
          actionsDisabled={!!editing}
          excelBulk={fedhaExcel}
          {...shared}
        />
      );
    }
    if (props.moduleKey === "vyanzo_mapato") {
      const vyanzoSpec = getPortalExcelFormSpec("vyanzo_mapato", props.submodule);
      const vyanzoExcel: PremiumTableExcelBulk | undefined = vyanzoSpec
        ? {
            specTitle: vyanzoSpec.specTitle,
            specSubtitle: vyanzoSpec.specSubtitle,
            templateBasename: vyanzoSpec.templateBasename,
            columns: vyanzoSpec.columns,
            instructionRows: vyanzoSpec.instructionRows,
            onImportRows: shared.canAdd
              ? async (rows) => {
                  const r = await bulkImportVyanzoMapato(rows, props.setIncomeSources, (a, id) =>
                    emitCrud(a, id, props.submodule)
                  );
                  return {
                    ok: r.ok,
                    fail: r.fail,
                    message: `Excel: ${r.ok} zimehifadhiwa; ${r.fail} zimeshindwa.`,
                  };
                }
              : undefined,
          }
        : undefined;
      return (
        <PremiumTable
          title="VYANZO VYA MAPATO (CHANZO CHA MAPATO YA KANISA)"
          subtitle="Makundi: Mapato ya Kawaida, Makusudi, Vikundi/Idara, Mengine, na taarifa za msingi"
          rows={props.incomeSources}
          columns={[
            { key: "chanzo", label: "Chanzo" },
            { key: "source_type", label: "Aina ya Source" },
            { key: "source_code", label: "Code" },
            { key: "category", label: "Category / Kundi" },
            { key: "frequency", label: "Frequency" },
            { key: "restrictedFund", label: "Restricted Fund" },
            { key: "subtitle", label: "Subtitle" },
            { key: "aina", label: "Aina" },
            { key: "maelezo", label: "Maelezo" },
            { key: "status", label: "Status" },
          ]}
          onAdd={shared.canAdd ? () => setEditing({}) : undefined}
          onEdit={shared.canEdit ? (r) => setEditing(r) : undefined}
          onDelete={shared.canDelete ? async (id) => {
            if (getSupabase()) {
              try {
                await deleteIncomeSource(id);
                props.setIncomeSources((p) => p.filter((x) => x.id !== id));
                pushToast("Chanzo kimefutwa.", "success");
                afterDelete(id);
              } catch (err) {
                reportError(err, "Kufuta chanzo cha mapato");
              }
            } else {
              pushToast("Imeshindikana kuwasiliana na seva.", "error");
            }
          } : undefined}
          highlightRowId={props.highlightRecordId ?? undefined}
          actionsDisabled={!!editing}
          excelBulk={vyanzoExcel}
          {...shared}
        />
      );
    }
    if (props.moduleKey === "mapato_income") {
      const rows = props.incomeManagement.filter(
        (r) =>
          (categoryFilter === "ALL" || r.mainCategory === categoryFilter || r.subCategory === categoryFilter) &&
          (statusFilter === "ALL" || r.status === statusFilter) &&
          (levelFilter === "ALL" || r.churchLevel === levelFilter) &&
          (sourceFilter === "ALL" || r.sourceName === sourceFilter) &&
          (paymentFilter === "ALL" || r.incomeType === paymentFilter) &&
          (!fromDateFilter || String(r.collectionDate ?? "") >= fromDateFilter) &&
          (!toDateFilter || String(r.collectionDate ?? "") <= toDateFilter)
      );
      const statuses = ["ALL", "Draft", "Submitted", "Verified", "Approved", "Posted to Ledger", "Locked", "Reversed / Cancelled"];
      const paymentMethods = ["ALL", "Cash", "Bank", "Mobile Money", "In-kind", "Transfer"];
      const sourceOptions = ["ALL", ...new Set(rows.map((r) => r.sourceName || "N/A"))];
      const levelTotals = levelFilterTabs
        .filter((x) => x !== "ALL")
        .map((lv) => ({
          level: lv,
          amount: rows.filter((r) => r.churchLevel === lv).reduce((s, x) => s + x.amount, 0),
        }));
      const grandTotal = rows.reduce((s, x) => s + x.amount, 0);
      const topSources = Object.entries(
        rows.reduce<Record<string, number>>((acc, row) => {
          acc[row.sourceName] = (acc[row.sourceName] || 0) + row.amount;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25);
      const topBranches = Object.entries(
        rows.reduce<Record<string, number>>((acc, row) => {
          const k = row.branchCenter || "N/A";
          acc[k] = (acc[k] || 0) + row.amount;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25);
      const topDepartments = Object.entries(
        rows.reduce<Record<string, number>>((acc, row) => {
          const k =
            row.mainCategory === "Mapato ya Idara na Vikundi"
              ? row.sourceName
              : row.mainCategory;
          acc[k] = (acc[k] || 0) + row.amount;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25);
      const budgetByCategory = Object.entries(
        rows.reduce<Record<string, { actual: number; budget: number }>>(
          (acc, row) => {
            const k = row.mainCategory || "Other";
            if (!acc[k]) acc[k] = { actual: 0, budget: 0 };
            acc[k].actual += row.amount;
            acc[k].budget += row.budgeted === "Yes" ? row.amount * 1.12 : row.amount * 0.88;
            return acc;
          },
          {}
        )
      );
      const byReceipt = rows.reduce<Record<string, number>>((acc, row) => {
        const key = row.receiptNo || "N/A";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const duplicateReceipts = Object.entries(byReceipt)
        .filter((x) => x[0] !== "N/A" && x[1] > 1)
        .map(([receiptNo, count]) => ({ receiptNo, count }));
      const suspiciousEntries = rows
        .filter((r) => r.amount >= 10000000 || (r.restrictedFund === "Yes" && r.status === "Draft"))
        .slice(0, 12);
      const cashTotal = rows.filter((r) => r.incomeType === "Cash").reduce((s, x) => s + x.amount, 0);
      const bankTotal = rows.filter((r) => r.incomeType === "Bank").reduce((s, x) => s + x.amount, 0);
      const mobileTotal = rows.filter((r) => r.incomeType === "Mobile Money").reduce((s, x) => s + x.amount, 0);
      const typeDen = Math.max(cashTotal + bankTotal + mobileTotal, 1);
      const typeRatio = {
        cash: Math.round((cashTotal / typeDen) * 100),
        bank: Math.round((bankTotal / typeDen) * 100),
        mobile: Math.round((mobileTotal / typeDen) * 100),
      };
      const now = new Date();
      const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const yearPrefix = `${now.getFullYear()}-`;
      const thisMonthIncome = rows
        .filter((r) => String(r.collectionDate ?? "").startsWith(monthPrefix))
        .reduce((s, x) => s + x.amount, 0);
      const thisYearIncome = rows
        .filter((r) => String(r.collectionDate ?? "").startsWith(yearPrefix))
        .reduce((s, x) => s + x.amount, 0);
      const topSource = topSources[0]?.[0] ?? "—";
      const topCategory = topDepartments[0]?.[0] ?? "—";
      const pendingAmount = rows
        .filter((r) => ["Draft", "Submitted", "Verified"].includes(String(r.status ?? "")))
        .reduce((s, x) => s + x.amount, 0);
      const restrictedBalance = rows
        .filter((r) => r.restrictedFund === "Yes")
        .reduce((s, x) => s + x.amount, 0);
      const monthlyTrendData = Object.entries(
        rows.reduce<Record<string, number>>((acc, row) => {
          const key = String(row.collectionDate ?? "").slice(0, 7) || "N/A";
          acc[key] = (acc[key] || 0) + row.amount;
          return acc;
        }, {})
      )
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);
      const incomeByCategoryData = topDepartments.map(([name, amount]) => ({ name, amount }));
      const incomeBySourceData = topSources.map(([name, amount]) => ({ name, amount }));
      const paymentMethodData = [
        { name: "Cash", value: cashTotal },
        { name: "Bank", value: bankTotal },
        { name: "Mobile", value: mobileTotal },
      ];
      const financeFilterSummary = `Category: ${categoryFilter} | Status: ${statusFilter} | Level: ${levelFilter} | Source: ${sourceFilter} | Payment: ${paymentFilter} | Date: ${fromDateFilter || "ALL"} - ${toDateFilter || "ALL"}`;
      const exportFinanceExcel = async () => {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.aoa_to_sheet([
          ["KMK(T) FINANCE REPORT"],
          [`Generated: ${new Date().toLocaleString()}`],
          [`Filters: ${financeFilterSummary}`],
          [],
          ["Income Code", "Source", "Category", "Status", "Date", "Payment", "Amount", "Restricted Fund"],
          ...rows.map((r) => [r.incomeCode, r.sourceName, r.mainCategory, r.status, r.collectionDate, r.incomeType, r.amount, r.restrictedFund]),
        ]);
        ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }];
        ws["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
        (ws as Record<string, unknown>)["!freeze"] = { xSplit: 0, ySplit: 5 };
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Finance");
        XLSX.writeFile(wb, `KMKT_FINANCE_REPORT_${new Date().toISOString().slice(0, 10)}.xlsx`);
      };
      const exportFinancePdf = async () => {
        const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
        const autoTable = autoTableMod.default;
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const w = doc.internal.pageSize.getWidth();
        doc.setFillColor(11, 31, 58);
        doc.rect(0, 0, w, 24, "F");
        doc.setTextColor(212, 175, 55);
        doc.setFontSize(14);
        doc.text("KMK(T) FINANCE REPORT", 14, 10);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text("ORODHA YA MAPATO", 14, 18);
        doc.setTextColor(15, 30, 70);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Filters: ${financeFilterSummary}`, 14, 35);
        autoTable(doc, {
          startY: 38,
          head: [["Income Code", "Source", "Category", "Status", "Date", "Payment", "Amount", "Restricted"]],
          body: rows.map((r) => [r.incomeCode, r.sourceName, r.mainCategory, r.status, r.collectionDate, r.incomeType, r.amount.toLocaleString(), r.restrictedFund]),
          styles: { fontSize: 8, overflow: "linebreak", valign: "top" },
          headStyles: { fillColor: [11, 31, 58], textColor: [212, 175, 55], fontStyle: "bold" },
          didDrawPage: () => {
            const page = doc.getCurrentPageInfo().pageNumber;
            const pages = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(`Ukurasa ${page}/${pages}`, w - 30, 205);
            doc.text("Sahihi: ____________________", 14, 205);
          },
        });
        doc.save(`KMKT_FINANCE_REPORT_${new Date().toISOString().slice(0, 10)}.pdf`);
      };
      const printFinanceReport = () => {
        const win = window.open("", "_blank", "width=1200,height=800");
        if (!win) return;
        const body = rows
          .map((r) => `<tr><td>${r.incomeCode}</td><td>${r.sourceName}</td><td>${r.mainCategory}</td><td>${r.status}</td><td>${r.collectionDate}</td><td>${r.incomeType}</td><td>${r.amount.toLocaleString()}</td><td>${r.restrictedFund}</td></tr>`)
          .join("");
        win.document.write(`<!doctype html><html><head><title>FINANCE REPORT</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#0B1F3A}.header{background:#0B1F3A;color:#D4AF37;padding:10px;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left;word-break:break-word}th{background:#0B1F3A;color:#D4AF37}</style></head><body><div class="header"><h2>KMK(T) FINANCE REPORT</h2><p>${new Date().toLocaleString()}</p><p>${financeFilterSummary}</p></div><table><thead><tr><th>Income Code</th><th>Source</th><th>Category</th><th>Status</th><th>Date</th><th>Payment</th><th>Amount</th><th>Restricted</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`);
        win.document.close();
      };
      return (
        <div className="space-y-3">
          <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow"><p className="text-xs text-slate-600">Total Income</p><p className="text-lg font-bold text-[#0B1F3A]">TZS {grandTotal.toLocaleString()}</p></article>
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow"><p className="text-xs text-slate-600">This Month / Year</p><p className="text-lg font-bold text-[#0B1F3A]">TZS {thisMonthIncome.toLocaleString()} / {thisYearIncome.toLocaleString()}</p></article>
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow"><p className="text-xs text-slate-600">Top Source / Category</p><p className="text-sm font-bold text-[#0B1F3A]">{topSource} / {topCategory}</p></article>
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow"><p className="text-xs text-slate-600">Pending / Restricted</p><p className="text-lg font-bold text-[#0B1F3A]">TZS {pendingAmount.toLocaleString()} / {restrictedBalance.toLocaleString()}</p></article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void exportFinanceExcel()} className="rounded-xl border border-[#D4AF37] bg-amber-50 px-3 py-2 text-sm font-semibold text-[#0B1F3A]">Excel</button>
              <button type="button" onClick={() => void exportFinancePdf()} className="rounded-xl bg-[#0B1F3A] px-3 py-2 text-sm font-semibold text-[#D4AF37]">PDF</button>
              <button type="button" onClick={printFinanceReport} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#0B1F3A]">Chapisha</button>
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
              <h4 className="text-sm font-bold text-[#0B1F3A]">Monthly Income Trend</h4>
              {monthlyTrendData.length === 0 ? <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p> : (
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="amount" stroke="#0B1F3A" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
              <h4 className="text-sm font-bold text-[#0B1F3A]">Payment Method Breakdown</h4>
              {paymentMethodData.every((x) => x.value === 0) ? <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p> : (
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentMethodData} dataKey="value" nameKey="name" outerRadius={72} label>
                        {paymentMethodData.map((_, i) => (
                          <Cell key={`pay-${i}`} fill={["#0B1F3A", "#123C69", "#D4AF37"][i % 3]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
              <h4 className="text-sm font-bold text-[#0B1F3A]">Income by Category</h4>
              {incomeByCategoryData.length === 0 ? <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p> : (
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeByCategoryData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#123C69" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
              <h4 className="text-sm font-bold text-[#0B1F3A]">Income by Source</h4>
              {incomeBySourceData.length === 0 ? <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p> : (
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeBySourceData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#0B1F3A" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </section>

          <section className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-4 text-white shadow-xl">
            <h4 className="text-sm font-bold">Jumla Kuu ya Mapato (All Levels Combined)</h4>
            <p className="mt-1 text-2xl font-extrabold">TZS {grandTotal.toLocaleString()}</p>
            <p className="text-xs text-emerald-100">Makao Makuu + Dayosisi + Jimbo + Tawi + Idara + Taasisi</p>
          </section>

          <section className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            {levelTotals.map((lt) => (
              <article key={lt.level} className="rounded-xl border border-emerald-200 bg-white p-3 shadow">
                <p className="text-xs font-semibold text-slate-600">{lt.level}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">TZS {lt.amount.toLocaleString()}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-blue-200 bg-white p-3 shadow">
              <p className="text-xs font-semibold text-slate-600">Cash vs Bank vs Mobile Money</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Cash {typeRatio.cash}% • Bank {typeRatio.bank}% • Mobile {typeRatio.mobile}%</p>
            </article>
            <article className="rounded-xl border border-amber-200 bg-white p-3 shadow">
              <p className="text-xs font-semibold text-slate-600">Duplicate Receipt Detection</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{duplicateReceipts.length} duplicates</p>
            </article>
            <article className="rounded-xl border border-rose-200 bg-white p-3 shadow">
              <p className="text-xs font-semibold text-slate-600">Suspicious Entries</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{suspiciousEntries.length} flagged</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-white p-3 shadow">
              <p className="text-xs font-semibold text-slate-600">Ulinganisho wa benki (mapato ya benki)</p>
              <p className="mt-1 text-sm font-bold text-slate-900">TZS {bankTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Chini: rekodi za mkono za kulinganisha na taarifa za benki.</p>
            </article>
          </section>

          <DomainEntitiesPanel
            moduleKey="mapato_income"
            submodule={props.submodule}
            contextKey="bank_reconciliation"
            title="Rekodi za ulinganisho wa benki"
            subtitle="Salio, makuzi ya wiki, maandalizi ya CSV — API utawekwa baadaye."
            highlightRecordId={props.highlightRecordId}
            onCrudSuccess={props.onCrudSuccess}
          />

          <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow">
            <h4 className="text-sm font-bold text-slate-900">Filters / Uchujaji wa Mapato</h4>
            <div className="mt-2 flex max-h-56 flex-wrap gap-2 overflow-y-auto overscroll-contain pr-1">
              {incomeCategoryTabs.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`max-w-[220px] truncate rounded-full border px-3 py-1 text-xs ${categoryFilter === c ? "bg-emerald-700 text-white" : "border-emerald-200 bg-white hover:bg-emerald-50"}`}
                  title={c === "ALL" ? "Makundi Yote" : c}
                >
                  {c === "ALL" ? "Makundi Yote" : c}
                </button>
              ))}
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-2 py-1 text-xs">
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "Status Zote" : s}
                  </option>
                ))}
              </select>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="max-h-52 rounded-lg border px-2 py-1 text-xs">
                {levelFilterTabs.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "Ngazi Zote" : s}
                  </option>
                ))}
              </select>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="max-h-52 rounded-lg border px-2 py-1 text-xs">
                {sourceOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "Source Zote" : s}
                  </option>
                ))}
              </select>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="max-h-52 rounded-lg border px-2 py-1 text-xs">
                {paymentMethods.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "Payment Zote" : s}
                  </option>
                ))}
              </select>
              <input type="date" value={fromDateFilter} onChange={(e) => setFromDateFilter(e.target.value)} className="rounded-lg border px-2 py-1 text-xs" />
              <input type="date" value={toDateFilter} onChange={(e) => setToDateFilter(e.target.value)} className="rounded-lg border px-2 py-1 text-xs" />
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("ALL");
                  setStatusFilter("ALL");
                  setLevelFilter("ALL");
                  setSourceFilter("ALL");
                  setPaymentFilter("ALL");
                  setFromDateFilter("");
                  setToDateFilter("");
                  pushToast("Vichujio vimesafishwa.", "success");
                }}
                className="rounded-lg border px-2 py-1 text-xs"
              >
                Safisha Vichujio
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow">
            <h4 className="text-sm font-bold text-slate-900">Vyanzo vya mapato (had 25 bora)</h4>
            <div className="mt-2 overflow-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Chanzo</th>
                    <th className="px-3 py-2 text-left">Jumla</th>
                  </tr>
                </thead>
                <tbody>
                  {topSources.length === 0 ? (
                    <tr><td className="px-3 py-3 text-slate-500" colSpan={3}>Hakuna data kwa filters hizi.</td></tr>
                  ) : (
                    topSources.map((x, i) => (
                      <tr key={x[0]} className="border-t">
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2">{x[0]}</td>
                        <td className="px-3 py-2 font-semibold">TZS {x[1].toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow">
              <h4 className="text-sm font-bold text-slate-900">Branches Zinazoongoza kwa Mapato</h4>
              <div className="mt-2 overflow-auto rounded-lg border">
                <table className="w-full min-w-[460px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Branch / Center</th>
                      <th className="px-3 py-2 text-left">Jumla</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topBranches.map((x, i) => (
                      <tr key={x[0]} className="border-t">
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2">{x[0]}</td>
                        <td className="px-3 py-2 font-semibold">TZS {x[1].toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow">
              <h4 className="text-sm font-bold text-slate-900">Departments Zinazoongoza</h4>
              <div className="mt-2 overflow-auto rounded-lg border">
                <table className="w-full min-w-[460px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Department / Category</th>
                      <th className="px-3 py-2 text-left">Jumla</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDepartments.map((x, i) => (
                      <tr key={x[0]} className="border-t">
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2">{x[0]}</td>
                        <td className="px-3 py-2 font-semibold">TZS {x[1].toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow">
            <h4 className="text-sm font-bold text-slate-900">Budget vs Actual Income (kwa kila Category)</h4>
            <div className="mt-2 overflow-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Budget</th>
                    <th className="px-3 py-2 text-left">Actual</th>
                    <th className="px-3 py-2 text-left">Variance</th>
                    <th className="px-3 py-2 text-left">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetByCategory.map(([cat, v]) => {
                    const variance = v.actual - v.budget;
                    const progress = Math.max(0, Math.min(150, Math.round((v.actual / Math.max(v.budget, 1)) * 100)));
                    return (
                      <tr key={cat} className="border-t">
                        <td className="px-3 py-2">{cat}</td>
                        <td className="px-3 py-2">TZS {Math.round(v.budget).toLocaleString()}</td>
                        <td className="px-3 py-2 font-semibold">TZS {Math.round(v.actual).toLocaleString()}</td>
                        <td className={`px-3 py-2 ${variance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {variance >= 0 ? "+" : "-"}TZS {Math.abs(Math.round(variance)).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <div className="h-2 w-full rounded bg-slate-200">
                            <div className="h-2 rounded bg-emerald-600" style={{ width: `${Math.min(progress, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{progress}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow">
              <h4 className="text-sm font-bold text-slate-900">Duplicate Receipts (Audit Focus)</h4>
              <div className="mt-2 overflow-auto rounded-lg border">
                <table className="w-full min-w-[400px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Receipt No</th>
                      <th className="px-3 py-2 text-left">Occurrences</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicateReceipts.length === 0 ? (
                      <tr><td className="px-3 py-3 text-slate-500" colSpan={3}>Hakuna duplicate receipts kwa sasa.</td></tr>
                    ) : (
                      duplicateReceipts.map((x) => (
                        <tr key={x.receiptNo} className="border-t">
                          <td className="px-3 py-2">{x.receiptNo}</td>
                          <td className="px-3 py-2">{x.count}</td>
                          <td className="px-3 py-2"><span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Needs Review</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow">
              <h4 className="text-sm font-bold text-slate-900">Suspicious Entries (Auto Flag)</h4>
              <div className="mt-2 overflow-auto rounded-lg border">
                <table className="w-full min-w-[460px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Income Code</th>
                      <th className="px-3 py-2 text-left">Source</th>
                      <th className="px-3 py-2 text-left">Amount</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suspiciousEntries.length === 0 ? (
                      <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Hakuna suspicious entries kwa sasa.</td></tr>
                    ) : (
                      suspiciousEntries.map((x) => (
                        <tr key={x.id} className="border-t">
                          <td className="px-3 py-2">{x.incomeCode}</td>
                          <td className="px-3 py-2">{x.sourceName}</td>
                          <td className="px-3 py-2 font-semibold">TZS {x.amount.toLocaleString()}</td>
                          <td className="px-3 py-2"><span className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Flagged</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <PremiumTable
            title="MAPATO / INCOME MANAGEMENT"
            subtitle="Submodules 8 + entry table ya kila ngazi + jumla kuu ya mapato"
            rows={rows}
            columns={[
              { key: "incomeCode", label: "Income Code" },
              { key: "sourceName", label: "Jina la Chanzo cha Mapato" },
              { key: "mainCategory", label: "Kundi Kuu" },
              { key: "subCategory", label: "Sub-Category" },
              { key: "churchLevel", label: "Ngazi ya Kanisa" },
              { key: "incomeType", label: "Aina ya Mapato" },
              { key: "frequency", label: "Frequency" },
              { key: "budgeted", label: "Budgeted?" },
              { key: "restrictedFund", label: "Restricted Fund?" },
              { key: "fundPurpose", label: "Fund Purpose" },
              { key: "collectionDate", label: "Collection Date" },
              { key: "serviceEventDate", label: "Service/Event Date" },
              { key: "collectorReceiver", label: "Collector / Receiver" },
              { key: "approvedBy", label: "Approved By" },
              { key: "receiptNo", label: "Receipt No" },
              { key: "transactionReference", label: "Transaction Ref" },
              { key: "amount", label: "Amount" },
              { key: "currency", label: "Currency" },
              {
                key: "status",
                label: "Status",
                filterValues: [
                  "Draft",
                  "Submitted",
                  "Verified",
                  "Approved",
                  "Posted to Ledger",
                  "Locked",
                  "Reversed / Cancelled",
                ],
              },
              { key: "branchCenter", label: "Branch / Church Center" },
              { key: "remarks", label: "Remarks / Maelezo" },
            ]}
            onAdd={shared.canAdd ? () => setEditing({}) : undefined}
            onEdit={shared.canEdit ? (r) => setEditing(r) : undefined}
            onDelete={shared.canDelete ? async (id) => {
              if (getSupabase()) {
                try {
                  await deleteIncomeLine(id);
                  props.setIncomeManagement((p) => p.filter((x) => x.id !== id));
                  pushToast("Mstari wa mapato umefutwa.", "success");
                  afterDelete(id);
                } catch (err) {
                  reportError(err, "Kufuta mstari wa mapato");
                }
              } else {
                pushToast("Imeshindikana kuwasiliana na seva.", "error");
              }
            } : undefined}
            highlightRowId={props.highlightRecordId ?? undefined}
            actionsDisabled={!!editing}
            excelBulk={(() => {
              const spec = getPortalExcelFormSpec("mapato_income", props.submodule);
              if (!spec) return undefined;
              return {
                specTitle: spec.specTitle,
                specSubtitle: spec.specSubtitle,
                templateBasename: spec.templateBasename,
                columns: spec.columns,
                instructionRows: spec.instructionRows,
                onImportRows: shared.canAdd
                  ? async (recs) => {
                      const r = await bulkImportMapatoIncome(recs, props.setIncomeManagement, (a, id) =>
                        emitCrud(a, id, props.submodule)
                      );
                      return {
                        ok: r.ok,
                        fail: r.fail,
                        message: `Excel: ${r.ok} zimehifadhiwa; ${r.fail} zimeshindwa.`,
                      };
                    }
                  : undefined,
              } satisfies PremiumTableExcelBulk;
            })()}
            {...shared}
          />
        </div>
      );
    }
    if (props.moduleKey === "mipangilio") {
      const avail = modules.find((m) => m.key === "mipangilio")?.submodules ?? [];
      return <SubmoduleEmptyState moduleKey="mipangilio" submodule={props.submodule} availableSubmodules={avail} />;
    }
    const modFallback = modules.find((m) => m.key === props.moduleKey);
    if (modFallback?.submodules.includes(props.submodule)) {
      return (
        <SubmoduleEmptyState
          moduleKey={props.moduleKey}
          submodule={props.submodule}
          availableSubmodules={modFallback.submodules}
        />
      );
    }
    return <GenericModuleView moduleKey={props.moduleKey} submodule={props.submodule} />;
  }, [
    props,
    shared,
    editing,
    categoryFilter,
    statusFilter,
    levelFilter,
    sourceFilter,
    paymentFilter,
    fromDateFilter,
    toDateFilter,
    canManageMuundo,
    incomeCategoryTabs,
    levelFilterTabs,
    fedhaFiltered,
    afterDelete,
    emitCrud,
    reportError,
    pushToast,
  ]);

  return (
    <div className="space-y-4">
      <ModuleHeader
        title={`${props.submodule}`}
        subtitle="Ongoza, hariri, futa — Excel: Pakua blanki (Maelekezo + Data), jaza jalada Data, Pakia; au Excel orodha, PDF, chapisha."
        onAdd={() => setEditing({})}
        canAdd={moduleHeaderCanAdd}
        addDisabled={!!editing}
        actionButtons={
          props.moduleKey === "developer"
            ? [
                {
                  key: "add-category",
                  label: "Ongeza Kategoria",
                  onClick: () => openDeveloperModal("category"),
                  disabled: !canUseDeveloperActions,
                  disabledMessage: "Huna ruhusa ya kufanya kitendo hiki",
                },
                {
                  key: "add-type",
                  label: "Ongeza Aina",
                  onClick: () => openDeveloperModal("type"),
                  disabled: !canUseDeveloperActions,
                  disabledMessage: "Huna ruhusa ya kufanya kitendo hiki",
                },
                {
                  key: "add-field",
                  label: "Ongeza Field",
                  onClick: () => openDeveloperModal("field"),
                  disabled: !canUseDeveloperActions,
                  disabledMessage: "Huna ruhusa ya kufanya kitendo hiki",
                },
                {
                  key: "add-section",
                  label: "Ongeza Sehemu",
                  onClick: () => openDeveloperModal("section"),
                  disabled: !canUseDeveloperActions,
                  disabledMessage: "Huna ruhusa ya kufanya kitendo hiki",
                },
              ]
            : []
        }
      />
      {props.moduleKey === "developer" ? <ErrorBoundary>{view}</ErrorBoundary> : view}
      {props.moduleKey === "developer" && devModal ? (
        <ErrorBoundary>
          <DeveloperQuickActionModal
            kind={devModal}
            saving={devSaving}
            error={devError}
            existingNames={
              devModal === "category"
                ? site.categories.map((x) => x.name)
                : devModal === "field"
                ? site.custom_fields.flatMap((x) => [x.label, x.field_key])
                : devModal === "type"
                ? devTypes.map((x) => x.name)
                : devSections.map((x) => x.name)
            }
            onClose={closeDeveloperModal}
            onSave={saveDeveloperAction}
          />
        </ErrorBoundary>
      ) : null}
      {editing && !moduleUsesOwnCrudUi && props.moduleKey === "fedha" ? (
        <FedhaRecordModal
          initial={editing}
          dayosisi={props.dayosisi}
          majimbo={props.majimbo}
          matawi={props.matawi}
          kategoriaOptions={fedhaKategoriaOptions}
          onClose={() => setEditing(null)}
          onSave={onSave as (p: Partial<FedhaRecord> & { kiasi: number | string }) => void | Promise<void>}
        />
      ) : editing && !moduleUsesOwnCrudUi ? (
        <RecordModal
          moduleKey={props.moduleKey}
          submodule={props.submodule}
          initial={editing}
          incomeSources={props.incomeSources}
          canCreateIncomeSource={canPortalCreateModule("vyanzo_mapato")}
          hierarchy={{ dayosisi: props.dayosisi, majimbo: props.majimbo, matawi: props.matawi }}
          onClose={() => setEditing(null)}
          onSave={onSave as (p: any) => void | Promise<void>}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-xs">
      {label}
      <input
        name={name}
        defaultValue={String(defaultValue ?? "")}
        className="rounded-lg border px-3 py-2 text-sm"
        required={required}
      />
    </label>
  );
}

function DeveloperQuickActionModal({
  kind,
  saving,
  error,
  existingNames,
  onClose,
  onSave,
}: {
  kind: "category" | "type" | "field" | "section";
  saving: boolean;
  error: string;
  existingNames: string[];
  onClose: () => void;
  onSave: (payload: { name: string; fieldKey?: string }) => Promise<void>;
}) {
  const labels = {
    category: { title: "Ongeza Kategoria", name: "Jina la kategoria", action: "Hifadhi kategoria" },
    type: { title: "Ongeza Aina", name: "Jina la aina", action: "Hifadhi aina" },
    field: { title: "Ongeza Field", name: "Lebo ya field", action: "Hifadhi field" },
    section: { title: "Ongeza Sehemu", name: "Jina la sehemu", action: "Hifadhi sehemu" },
  } as const;
  const t = labels[kind];

  return (
    <ModalScrollLayer onBackdropClick={onClose}>
      <form
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-amber-50 p-4 text-[#0B1F3A] shadow-lg"
        onSubmit={(e) => {
          e.preventDefault();
          if (saving) return;
          const fd = new FormData(e.currentTarget);
          const name = String(fd.get("name") ?? "");
          const fieldKey = kind === "field" ? String(fd.get("field_key") ?? "") : undefined;
          void onSave({ name, fieldKey });
        }}
      >
        <h3 className="text-lg font-bold text-[#0B1F3A]">{t.title}</h3>
        <p className="mt-1 text-sm text-slate-600">Jaza taarifa muhimu kisha hifadhi kwenye Supabase.</p>
        {error ? <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs md:col-span-2">
            {t.name}
            <input
              name="name"
              required
              maxLength={DEV_ACTION_MAX_NAME}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder={t.name}
            />
          </label>
          {kind === "field" ? (
            <label className="grid gap-1 text-xs md:col-span-2">
              Field key (slug)
              <input
                name="field_key"
                required
                maxLength={DEV_ACTION_MAX_FIELD_KEY}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder="mfano: church_code"
              />
            </label>
          ) : null}
        </div>
        {existingNames.length > 0 ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Vilivyopo sasa</p>
            <p className="mt-1 text-sm text-slate-600">{existingNames.join(", ")}</p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-700">Hakuna data bado</p>
            <p className="text-sm text-slate-600">Ongeza taarifa ili zionekane hapa</p>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
          >
            Ghairi
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#0B1F3A] px-3 py-2 text-sm font-semibold text-[#D4AF37] shadow-md disabled:opacity-50"
          >
            {saving ? "Inahifadhi..." : t.action}
          </button>
        </div>
      </form>
    </ModalScrollLayer>
  );
}

function FinanceSourceFields({ initial }: { initial: Partial<IncomeSourceRecord> & { id?: string } }) {
  const [mode, setMode] = useState<"auto" | "manual">(
    initial?.source_type === "predefined" ? "auto" : "manual"
  );
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState(String(initial?.chanzo ?? ""));
  const selectedPreset = FINANCE_SOURCE_PRESETS.find((p) => p.name === selectedName) ?? null;
  const results = FINANCE_SOURCE_PRESETS.filter((p) => safeLower(`${p.group} ${p.name}`).includes(safeLower(query.trim())));
  const grouped = results.reduce<Record<string, typeof FINANCE_SOURCE_PRESETS>>((acc, p) => {
    (acc[p.group] ||= []).push(p);
    return acc;
  }, {});

  return (
    <>
      <label className="grid gap-1 text-xs md:col-span-2">
        Mode ya kuingiza source
        <div className="flex gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <input type="radio" name="source_mode" value="auto" checked={mode === "auto"} onChange={() => setMode("auto")} />
            Auto Select
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <input type="radio" name="source_mode" value="manual" checked={mode === "manual"} onChange={() => setMode("manual")} />
            Manual Entry
          </label>
        </div>
      </label>
      <input type="hidden" name="source_type" value={mode === "auto" ? "predefined" : "custom"} />
      {mode === "auto" ? (
        <>
          <label className="grid gap-1 text-xs md:col-span-2">
            Tafuta source iliyopo
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Tafuta Zaka, Ujenzi..."
            />
          </label>
          <label className="grid gap-1 text-xs md:col-span-2">
            Chagua source
            <select
              name="chanzo"
              required
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">— Chagua source —</option>
              {Object.entries(grouped).map(([group, list]) => (
                <optgroup key={group} label={group}>
                  {list.map((p) => (
                    <option key={p.code} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Field label="Code" name="source_code" defaultValue={selectedPreset?.code ?? initial?.source_code ?? ""} />
          <Field label="Category / Kundi" name="category" defaultValue={selectedPreset?.category ?? initial?.category ?? ""} />
          <Field label="Frequency" name="frequency" defaultValue={selectedPreset?.frequency ?? initial?.frequency ?? "Monthly"} />
          <Field
            label="Restricted Fund (Yes/No)"
            name="restrictedFund"
            defaultValue={selectedPreset?.restrictedFund ?? initial?.restrictedFund ?? "No"}
          />
          <Field
            label="Approval Required (Yes/No)"
            name="approvalRequired"
            defaultValue={initial?.approvalRequired ?? (selectedPreset?.restrictedFund === "Yes" ? "Yes" : "No")}
          />
          <Field label="Aina" name="aina" defaultValue={initial?.aina ?? "Mapato Halisi"} />
          <Field label="Status" name="status" defaultValue={selectedPreset?.defaultStatus ?? initial?.status ?? "Active"} />
          <label className="grid gap-1 text-xs md:col-span-2">
            Maelezo
            <textarea
              name="maelezo"
              defaultValue={selectedPreset?.description ?? initial?.maelezo ?? ""}
              className="rounded-lg border px-3 py-2 text-sm"
              rows={3}
            />
          </label>
          <Field label="Subtitle" name="subtitle" defaultValue={initial?.subtitle ?? ""} required={false} />
        </>
      ) : (
        <>
          <Field label="Jina la Source" name="chanzo" defaultValue={initial?.chanzo ?? ""} />
          <Field label="Code" name="source_code" defaultValue={initial?.source_code ?? ""} />
          <label className="grid gap-1 text-xs md:col-span-2">
            Category / Kundi
            <select name="category" defaultValue={initial?.category ?? ""} className="rounded-lg border px-3 py-2 text-sm">
              <option value="">— Chagua category —</option>
              {INCOME_SOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Field label="Frequency" name="frequency" defaultValue={initial?.frequency ?? "Monthly"} />
          <Field label="Restricted Fund (Yes/No)" name="restrictedFund" defaultValue={initial?.restrictedFund ?? "No"} />
          <Field label="Approval Required (Yes/No)" name="approvalRequired" defaultValue={initial?.approvalRequired ?? "No"} />
          <Field label="Aina" name="aina" defaultValue={initial?.aina ?? "Mapato Halisi"} />
          <Field label="Status" name="status" defaultValue={initial?.status ?? "Active"} />
          <Field label="Subtitle" name="subtitle" defaultValue={initial?.subtitle ?? ""} required={false} />
          <label className="grid gap-1 text-xs md:col-span-2">
            Maelezo
            <textarea name="maelezo" defaultValue={initial?.maelezo ?? ""} className="rounded-lg border px-3 py-2 text-sm" rows={3} />
          </label>
        </>
      )}
    </>
  );
}

function MapatoIncomeFields({
  initial,
  incomeSources,
  canCreateIncomeSource,
}: {
  initial: Partial<IncomeManagementRecord> & { id?: string };
  incomeSources: IncomeSourceRecord[];
  canCreateIncomeSource: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(String(initial?.sourceId ?? ""));
  const selectedSource = useMemo(
    () => incomeSources.find((s) => s.id === selectedId) ?? null,
    [incomeSources, selectedId]
  );
  const filteredSources = useMemo(
    () =>
      incomeSources.filter((s) =>
        safeLower(`${s.chanzo} ${s.source_code ?? ""} ${s.category ?? ""}`).includes(safeLower(query))
      ),
    [incomeSources, query]
  );

  return (
    <>
      <label className="grid gap-1 text-xs md:col-span-2">
        Tafuta source ya mapato
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          placeholder="Tafuta Zaka, SAD001, Michango..."
        />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Source ya mapato
        <select
          name="sourceId"
          required
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">— Chagua source —</option>
          {filteredSources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.chanzo} ({s.source_code || "NO-CODE"})
            </option>
          ))}
        </select>
      </label>
      {selectedSource ? (
        <div className="rounded-lg border border-[#D4AF37]/40 bg-[#0B1F3A]/5 px-3 py-2 text-xs md:col-span-2">
          <span className="font-semibold text-[#0B1F3A]">{selectedSource.category || "Hakuna category"}</span>
          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
            Restricted: {selectedSource.restrictedFund ?? "No"}
          </span>
          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800">
            Approval: {selectedSource.approvalRequired ?? (selectedSource.restrictedFund === "Yes" ? "Yes" : "No")}
          </span>
        </div>
      ) : null}
      <input
        type="hidden"
        name="approvalRequired"
        value={selectedSource?.approvalRequired ?? (selectedSource?.restrictedFund === "Yes" ? "Yes" : String(initial?.approvalRequired ?? "No"))}
      />
      <Field label="Income Code" name="incomeCode" defaultValue={initial?.incomeCode ?? ""} />
      <Field
        key={`sourceName-${selectedId || "none"}`}
        label="Jina la Chanzo cha Mapato"
        name="sourceName"
        defaultValue={selectedSource?.chanzo ?? initial?.sourceName ?? ""}
      />
      <Field
        key={`mainCategory-${selectedId || "none"}`}
        label="Kundi Kuu"
        name="mainCategory"
        defaultValue={selectedSource?.category ?? initial?.mainCategory ?? ""}
      />
      <Field label="Sub-Category" name="subCategory" defaultValue={initial?.subCategory ?? ""} required={false} />
      <Field label="Ngazi ya Kanisa" name="churchLevel" defaultValue={initial?.churchLevel ?? ""} required={false} />
      <Field label="Aina ya Mapato" name="incomeType" defaultValue={initial?.incomeType ?? "Mapato Halisi"} />
      <Field
        key={`frequency-${selectedId || "none"}`}
        label="Frequency"
        name="frequency"
        defaultValue={selectedSource?.frequency ?? initial?.frequency ?? "Monthly"}
      />
      <Field label="Budgeted?" name="budgeted" defaultValue={initial?.budgeted ?? "No"} />
      <Field
        key={`restricted-${selectedId || "none"}`}
        label="Restricted Fund?"
        name="restrictedFund"
        defaultValue={selectedSource?.restrictedFund ?? initial?.restrictedFund ?? "No"}
      />
      <Field label="Fund Purpose" name="fundPurpose" defaultValue={initial?.fundPurpose ?? ""} required={false} />
      <Field label="Collection Date" name="collectionDate" defaultValue={initial?.collectionDate ?? ""} />
      <Field label="Service/Event Date" name="serviceEventDate" defaultValue={initial?.serviceEventDate ?? ""} required={false} />
      <Field label="Collector / Receiver" name="collectorReceiver" defaultValue={initial?.collectorReceiver ?? ""} required={false} />
      <Field label="Approved By" name="approvedBy" defaultValue={initial?.approvedBy ?? ""} required={false} />
      <Field label="Receipt No" name="receiptNo" defaultValue={initial?.receiptNo ?? ""} required={false} />
      <Field label="Transaction Reference" name="transactionReference" defaultValue={initial?.transactionReference ?? ""} required={false} />
      <Field label="Amount" name="amount" defaultValue={initial?.amount ?? ""} />
      <Field label="Currency" name="currency" defaultValue={initial?.currency ?? "TZS"} />
      <Field label="Status" name="status" defaultValue={initial?.status ?? "Submitted"} />
      <Field label="Branch / Church Center" name="branchCenter" defaultValue={initial?.branchCenter ?? ""} required={false} />
      <label className="grid gap-1 text-xs md:col-span-2">
        Remarks / Maelezo
        <textarea name="remarks" defaultValue={initial?.remarks ?? ""} className="rounded-lg border px-3 py-2 text-sm" rows={3} />
      </label>
      {!canCreateIncomeSource ? (
        <p className="text-xs text-amber-700 md:col-span-2">Huna ruhusa ya kuunda source mpya hapa. Tumia source zilizopo.</p>
      ) : null}
    </>
  );
}

function ViongoziRecordFields({
  initial,
  hierarchy,
}: {
  initial: Partial<KiongoziRecord> & { id?: string };
  hierarchy: { dayosisi: DayosisiRecord[]; majimbo: JimboRecord[]; matawi: TawiRecord[] };
}) {
  const [dayosisiId, setDayosisiId] = useState(() => String(initial?.dayosisi_id ?? ""));
  const [jimboId, setJimboId] = useState(() => String(initial?.jimbo_id ?? ""));
  const [structureGroups, setStructureGroups] = useState<{
    idara: ChurchStructureEntity[];
    huduma: ChurchStructureEntity[];
    taasisi: ChurchStructureEntity[];
    jumuiya: ChurchStructureEntity[];
  }>({ idara: [], huduma: [], taasisi: [], jumuiya: [] });

  useEffect(() => {
    setDayosisiId(String(initial?.dayosisi_id ?? ""));
    setJimboId(String(initial?.jimbo_id ?? ""));
  }, [initial?.id, initial?.dayosisi_id, initial?.jimbo_id]);
  useEffect(() => {
    void (async () => {
      try {
        const o = await fetchCascadeOptions();
        setStructureGroups({ idara: o.idara, huduma: o.huduma, taasisi: o.taasisi, jumuiya: o.jumuiya });
      } catch {
        setStructureGroups({ idara: [], huduma: [], taasisi: [], jumuiya: [] });
      }
    })();
  }, []);

  const jimboFiltered = useMemo(
    () => hierarchy.majimbo.filter((j) => !dayosisiId || j.dayosisi_id === dayosisiId),
    [hierarchy.majimbo, dayosisiId]
  );
  const tawiFiltered = useMemo(
    () => hierarchy.matawi.filter((t) => !jimboId || t.jimbo_id === jimboId),
    [hierarchy.matawi, jimboId]
  );

  return (
    <>
      <label className="grid gap-1 text-xs md:col-span-2">
        Jina Kamili
        <input name="jina" required defaultValue={initial?.jina ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Cheo
        <select name="cheo" defaultValue={initial?.cheo ?? ""} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">— Chagua cheo —</option>
          {[
            "Askofu Mkuu",
            "Askofu",
            "Katibu Mkuu",
            "Mhazini Mkuu",
            "Mchungaji",
            "Mzee wa Kanisa",
            "Mwenyekiti",
            "Katibu",
            "Mhasibu",
            "Kiongozi wa Idara",
            "Mkurugenzi wa Taasisi",
          ].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Leadership level
        <select name="leadership_level" defaultValue={initial?.leadership_level ?? initial?.ngazi ?? ""} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">— Chagua level —</option>
          {[
            "KMK(T) National Level",
            "Dayosisi Level",
            "Jimbo Level",
            "Tawi/Kituo Level",
            "Idara Level",
            "Huduma Level",
            "Taasisi Level",
            "Jumuiya Level",
          ].map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Assigned entity
        <input name="assigned_entity" defaultValue={initial?.assigned_entity ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Ngazi (legacy)
        <input name="ngazi" defaultValue={initial?.ngazi ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Dayosisi
        <select
          name="dayosisi_id"
          value={dayosisiId}
          onChange={(e) => {
            setDayosisiId(e.target.value);
            setJimboId("");
          }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">— Chagua dayosisi —</option>
          {hierarchy.dayosisi.map((d) => (
            <option key={d.id} value={d.id}>
              {d.jina}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Jimbo
        <select name="jimbo_id" value={jimboId} onChange={(e) => setJimboId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">— Chagua jimbo —</option>
          {jimboFiltered.map((j) => (
            <option key={j.id} value={j.id}>
              {j.jina}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Tawi
        <select key={`tawi-${jimboId}`} name="tawi_id" defaultValue={String(initial?.tawi_id ?? "")} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">— Chagua tawi —</option>
          {tawiFiltered.map((t) => (
            <option key={t.id} value={t.id}>
              {t.jina}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Simu
        <input name="simu" defaultValue={initial?.simu ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Barua pepe
        <input name="email" type="email" defaultValue={initial?.email ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Picha URL
        <input name="photo_url" defaultValue={initial?.photo_url ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Start date
        <input name="start_date" type="date" defaultValue={initial?.start_date ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        End date
        <input name="end_date" type="date" defaultValue={initial?.end_date ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Term status
        <select name="term_status" defaultValue={initial?.term_status ?? "active"} className="rounded-lg border px-3 py-2 text-sm">
          <option value="active">active</option>
          <option value="ended">ended</option>
          <option value="suspended">suspended</option>
          <option value="pending">pending</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Appointment document URL
        <input name="appointment_document_url" defaultValue={initial?.appointment_document_url ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Idara / Huduma / Taasisi / Jumuiya
        <div className="grid gap-2 md:grid-cols-2">
          <select name="idara_name" defaultValue={initial?.idara_name ?? ""} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Idara</option>
            {structureGroups.idara.map((x) => (
              <option key={x.id} value={x.name}>
                {x.name}
              </option>
            ))}
          </select>
          <select name="huduma_name" defaultValue={initial?.huduma_name ?? ""} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Huduma</option>
            {structureGroups.huduma.map((x) => (
              <option key={x.id} value={x.name}>
                {x.name}
              </option>
            ))}
          </select>
          <select name="taasisi_name" defaultValue={initial?.taasisi_name ?? ""} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Taasisi</option>
            {structureGroups.taasisi.map((x) => (
              <option key={x.id} value={x.name}>
                {x.name}
              </option>
            ))}
          </select>
          <select name="jumuiya_name" defaultValue={initial?.jumuiya_name ?? ""} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Jumuiya</option>
            {structureGroups.jumuiya.map((x) => (
              <option key={x.id} value={x.name}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Notes
        <textarea name="notes" defaultValue={initial?.notes ?? ""} className="rounded-lg border px-3 py-2 text-sm" rows={3} />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Status
        <input name="status" defaultValue={initial?.status ?? "Active"} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
    </>
  );
}

function RecordModal({
  moduleKey,
  submodule,
  initial,
  incomeSources,
  canCreateIncomeSource,
  hierarchy,
  onClose,
  onSave,
}: {
  moduleKey: string;
  submodule: string;
  initial: any;
  incomeSources?: IncomeSourceRecord[];
  canCreateIncomeSource?: boolean;
  hierarchy?: { dayosisi: DayosisiRecord[]; majimbo: JimboRecord[]; matawi?: TawiRecord[] };
  onClose: () => void;
  onSave: (payload: any) => void | Promise<void>;
}) {
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const fields =
    moduleKey === "viongozi"
      ? ([] as [string, string][])
      : moduleKey === "muundo" && submodule === "Dayosisi"
      ? [["Jina la Dayosisi", "jina"], ["Code", "code"], ["Askofu wa Dayosisi", "askofu"], ["Makao Makuu", "makao"], ["Mkoa", "mkoa"], ["Simu", "simu"], ["Email", "email"], ["Maelezo", "maelezo"], ["Status", "status"]]
      : moduleKey === "muundo" && submodule === "Majimbo"
      ? [["Jina la Jimbo", "jina"], ["Dayosisi", "dayosisi_id"], ["Mkuu wa Jimbo", "mkuu"], ["Mkoa", "mkoa"], ["Simu", "simu"], ["Status", "status"]]
      : moduleKey === "muundo"
      ? [["Jina la Tawi/Kituo", "jina"], ["Aina", "aina"], ["Jimbo", "jimbo_id"], ["Kiongozi", "kiongozi"], ["Simu", "simu"], ["Status", "status"]]
      : moduleKey === "mapato_income"
      ? [["Income Code", "incomeCode"], ["Jina la Chanzo cha Mapato", "sourceName"], ["Kundi Kuu", "mainCategory"], ["Sub-Category", "subCategory"], ["Ngazi ya Kanisa", "churchLevel"], ["Aina ya Mapato", "incomeType"], ["Frequency", "frequency"], ["Budgeted?", "budgeted"], ["Restricted Fund?", "restrictedFund"], ["Fund Purpose", "fundPurpose"], ["Collection Date", "collectionDate"], ["Service/Event Date", "serviceEventDate"], ["Collector / Receiver", "collectorReceiver"], ["Approved By", "approvedBy"], ["Receipt No", "receiptNo"], ["Transaction Reference", "transactionReference"], ["Amount", "amount"], ["Currency", "currency"], ["Status", "status"], ["Branch / Church Center", "branchCenter"], ["Remarks / Maelezo", "remarks"]]
      : [["Tarehe", "tarehe"], ["Aina", "aina"], ["Kategoria", "kategoria"], ["Kiasi", "kiasi"], ["Ngazi", "ngazi"], ["Dayosisi", "dayosisi"], ["Jimbo", "jimbo"], ["Tawi", "tawi"], ["Status", "status"]];

  return (
    <ModalScrollLayer onBackdropClick={onClose}>
      <form
        className="w-full rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setFormError("");
          const fd = new FormData(e.currentTarget);
          const payload: any = {};
          if (moduleKey === "viongozi") {
            for (const k of [
              "jina",
              "full_name",
              "photo_url",
              "gender",
              "cheo",
              "leadership_level",
              "assigned_entity",
              "ngazi",
              "dayosisi_id",
              "jimbo_id",
              "tawi_id",
              "idara_name",
              "huduma_name",
              "taasisi_name",
              "jumuiya_name",
              "simu",
              "email",
              "start_date",
              "end_date",
              "term_status",
              "appointment_document_url",
              "appointment_document_name",
              "appointment_document_path",
              "appointment_document_size",
              "appointment_document_type",
              "appointment_uploaded_at",
              "notes",
              "status",
            ]) {
              payload[k] = fd.get(k);
            }
          } else if (moduleKey === "vyanzo_mapato") {
            for (const k of ["source_mode", "source_type", "chanzo", "source_code", "category", "subtitle", "frequency", "restrictedFund", "approvalRequired", "aina", "maelezo", "status"]) {
              payload[k] = fd.get(k);
            }
          } else if (moduleKey === "mapato_income") {
            for (const k of [
              "sourceId",
              "incomeCode",
              "sourceName",
              "mainCategory",
              "subCategory",
              "churchLevel",
              "incomeType",
              "frequency",
              "budgeted",
              "restrictedFund",
              "approvalRequired",
              "fundPurpose",
              "collectionDate",
              "serviceEventDate",
              "collectorReceiver",
              "approvedBy",
              "receiptNo",
              "transactionReference",
              "amount",
              "currency",
              "status",
              "branchCenter",
              "remarks",
            ]) {
              payload[k] = fd.get(k);
            }
          } else {
            fields.forEach(([, key]) => (payload[key as string] = fd.get(key as string)));
          }
          if ("kiasi" in payload) payload.kiasi = Number(payload.kiasi || 0);
          if ("amount" in payload) payload.amount = Number(payload.amount || 0);
          const need = (k: string) => String(payload[k] ?? "").trim() === "";
          if (moduleKey === "muundo" && submodule === "Dayosisi" && (need("jina") || need("code"))) {
            setFormError("Jina na code za dayosisi zinahitajika.");
            return;
          }
          if (moduleKey === "muundo" && submodule === "Majimbo" && (need("jina") || need("dayosisi_id"))) {
            setFormError("Jina la jimbo na uchague dayosisi.");
            return;
          }
          if (moduleKey === "muundo" && submodule.includes("Matawi") && (need("jina") || need("jimbo_id"))) {
            setFormError("Jina la tawi na uchague jimbo.");
            return;
          }
          if (
            moduleKey === "muundo" &&
            submodule !== "Dayosisi" &&
            submodule !== "Majimbo" &&
            !submodule.includes("Matawi") &&
            need("jina")
          ) {
            setFormError("Jina linahitajika.");
            return;
          }
          if (moduleKey === "viongozi" && (need("jina") || need("cheo") || need("leadership_level") || need("assigned_entity"))) {
            setFormError("Jaza taarifa muhimu.");
            return;
          }
          if (moduleKey === "viongozi" && !need("start_date") && !need("end_date") && String(payload.end_date) < String(payload.start_date)) {
            setFormError("Tarehe ya mwisho haiwezi kuwa kabla ya tarehe ya kuanza.");
            return;
          }
          if (moduleKey === "vyanzo_mapato" && need("chanzo")) {
            setFormError("Jaza taarifa muhimu.");
            return;
          }
          if (moduleKey === "vyanzo_mapato" && need("source_code")) {
            setFormError("Jaza taarifa muhimu.");
            return;
          }
          if (moduleKey === "fedha" && need("tarehe")) {
            setFormError("Tarehe inahitajika.");
            return;
          }
          if (moduleKey === "mapato_income" && (need("incomeCode") || need("sourceName"))) {
            setFormError("Income code na chanzo vinahitajika.");
            return;
          }
          if (moduleKey === "mapato_income" && need("sourceId")) {
            setFormError("Chagua source ya mapato kwanza.");
            return;
          }
          if (moduleKey === "mapato_income" && (need("collectionDate") || Number(payload.amount || 0) <= 0)) {
            setFormError("Weka tarehe sahihi na kiasi kikubwa kuliko sifuri.");
            return;
          }
          setSaving(true);
          try {
            await Promise.resolve(onSave(payload));
          } finally {
            setSaving(false);
          }
        }}
      >
        <h3 className="text-lg font-bold text-slate-900">{initial.id ? "Hariri Rekodi" : "Ongeza Rekodi Mpya"}</h3>
        {formError ? <p className="mt-2 text-sm text-rose-600">{formError}</p> : null}
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {moduleKey === "viongozi" ? (
            <ViongoziRecordFields
              initial={initial}
              hierarchy={{
                dayosisi: hierarchy?.dayosisi ?? [],
                majimbo: hierarchy?.majimbo ?? [],
                matawi: hierarchy?.matawi ?? [],
              }}
            />
          ) : moduleKey === "vyanzo_mapato" ? (
            <FinanceSourceFields initial={initial} />
          ) : moduleKey === "mapato_income" ? (
            <MapatoIncomeFields
              initial={initial}
              incomeSources={incomeSources ?? []}
              canCreateIncomeSource={Boolean(canCreateIncomeSource)}
            />
          ) : (
          fields.map(([label, key]) =>
            key === "dayosisi_id" && hierarchy ? (
              <label key={String(key)} className="grid gap-1 text-xs md:col-span-2">
                {label}
                <select
                  name="dayosisi_id"
                  required
                  defaultValue={initial?.dayosisi_id ?? ""}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">— Chagua dayosisi —</option>
                  {hierarchy.dayosisi.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.jina}
                    </option>
                  ))}
                </select>
              </label>
            ) : key === "jimbo_id" && hierarchy ? (
              <label key={String(key)} className="grid gap-1 text-xs md:col-span-2">
                {label}
                <select name="jimbo_id" required defaultValue={initial?.jimbo_id ?? ""} className="rounded-lg border px-3 py-2 text-sm">
                  <option value="">— Chagua jimbo —</option>
                  {hierarchy.majimbo.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.jina}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <Field
                key={String(key)}
                label={String(label)}
                name={String(key)}
                defaultValue={initial?.[key as string]}
                required={!(String(key) === "email" || String(key) === "maelezo")}
              />
            )
          )
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Ghairi
          </button>
          <button
            type="reset"
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Safisha
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
  );
}
