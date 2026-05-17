import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, RefreshCw, Users } from "lucide-react";
import type { DayosisiRecord, JimboRecord, KiongoziRecord, TawiRecord } from "../../types";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import { resolveHierarchyLevelFromLeader } from "../../lib/certificateEngine";
import { generateLeadershipCredential } from "../../lib/certificateEngine";
import { loadLeadershipCredentialAutoFill } from "../../lib/certificateEngine/loadAutoFill";
import { writeLeadershipCredentialPrefill } from "../../lib/leadershipCredentialPrefill";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { navigatePortalModule } from "../../lib/navigatePortalModule";
import { LEADERSHIP_CREDENTIALS_HUB_SUBMODULE } from "../../data/portalModules";
import {
  EXECUTIVE_HIERARCHY_LEVELS,
  rolesForLevel,
  type ExecutiveHierarchyLevel,
} from "../../lib/executiveLeadershipProfile/hierarchyConfig";
import { computeYearsBetween } from "../../lib/executiveLeadershipProfile/profileCalculations";
import { usePortal } from "../../context/PortalContext";
import { DashboardHero } from "../executive/DashboardHero";
import { PremiumKPICard } from "../executive/PremiumKPICard";
import type { LeadershipUploadKind } from "../executive/LeadershipDocumentUploadCenter";
import { uploadLeadershipCvObject } from "../../services/leadershipCvEngineService";
import { fetchNationalLeadershipProfilesOptional } from "../../services/nationalLeadershipService";
import {
  fetchOfficialCertificatesForSourceOptional,
  type OfficialCertificateRow,
} from "../../services/leadershipOfficialCertificateService";
import type { LeadershipRoleCatalogRow } from "../../services/leadershipCredentialsEngineService";
import {
  buildRoleSlots,
  loadExecutiveProfileBundle,
  loadExecutiveProfileCatalogs,
  resolveCheoFromRole,
  saveExecutiveProfileBundle,
} from "../../services/executiveLeadershipProfileService";
import { HierarchyRoleBoard } from "./HierarchyRoleBoard";
import { ExecutiveProfileEditor, type ExecutiveProfileDraft } from "./ExecutiveProfileEditor";

type Props = {
  viongozi: KiongoziRecord[];
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  canEdit: boolean;
  canExport: boolean;
  kpiLive?: DashboardKpiSnapshot | null;
};

export function ExecutiveLeadershipProfileEngine({
  viongozi,
  dayosisi,
  majimbo,
  matawi,
  canEdit,
  canExport,
  kpiLive,
}: Props) {
  const { pushToast, reportError, about, authUser } = usePortal();
  const [level, setLevel] = useState<ExecutiveHierarchyLevel | "all">("all");
  const [roles, setRoles] = useState<LeadershipRoleCatalogRow[]>([]);
  const [educationCatalog, setEducationCatalog] = useState<Awaited<ReturnType<typeof loadExecutiveProfileCatalogs>>["education"]>([]);
  const [national, setNational] = useState<Awaited<ReturnType<typeof fetchNationalLeadershipProfilesOptional>>>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof loadExecutiveProfileBundle>>>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [roleKey, setRoleKey] = useState("");
  const [jimboVariant, setJimboVariant] = useState("");
  const [assignRoleKey, setAssignRoleKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [latestCert, setLatestCert] = useState<OfficialCertificateRow | null>(null);

  const logoUrl = about?.logo_url?.trim() || null;
  const activeLevel: ExecutiveHierarchyLevel = level === "all" ? "national" : level;

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [cat, nat] = await Promise.all([
        loadExecutiveProfileCatalogs(),
        fetchNationalLeadershipProfilesOptional(),
      ]);
      setRoles(cat.roles);
      setEducationCatalog(cat.education);
      setNational(nat.filter((r) => r.status === "active"));
    } catch (e) {
      reportError(e, "Wasifu — catalogs");
    } finally {
      setLoadingMeta(false);
    }
  }, [reportError]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const levelRoles = useMemo(() => rolesForLevel(roles, activeLevel), [roles, activeLevel]);

  const slots = useMemo(
    () => buildRoleSlots(activeLevel, roles, viongozi, national),
    [activeLevel, roles, viongozi, national],
  );

  const filledSlots = slots.filter((s) => s.assignedLeader || s.nationalRow).length;

  const loadLeader = useCallback(
    async (leaderId: string) => {
      setBundleLoading(true);
      setSelectedLeaderId(leaderId);
      try {
        const b = await loadExecutiveProfileBundle(leaderId);
        setBundle(b);
        if (b) {
          const rk = (b.leader as KiongoziRecord & { role_key?: string }).role_key ?? "";
          setRoleKey(rk);
          setJimboVariant((b.leader as KiongoziRecord & { jimbo_leader_variant?: string }).jimbo_leader_variant ?? "");
          const certs = await fetchOfficialCertificatesForSourceOptional("church_viongozi", leaderId, 1);
          setLatestCert(certs[0] ?? null);
        }
      } catch (e) {
        reportError(e, "Wasifu — pakia");
      } finally {
        setBundleLoading(false);
      }
    },
    [reportError],
  );

  useEffect(() => {
    if (!selectedLeaderId) return;
    void loadLeader(selectedLeaderId);
  }, [selectedLeaderId, loadLeader]);

  const assignCandidates = useMemo(() => {
    if (!assignRoleKey) return [];
    const role = roles.find((r) => r.role_key === assignRoleKey);
    if (!role) return [];
    return viongozi.filter((v) => {
      const lv = resolveHierarchyLevelFromLeader(v);
      return lv === role.level_key;
    });
  }, [assignRoleKey, roles, viongozi]);

  const handleSave = useCallback(
    async (draft: ExecutiveProfileDraft) => {
      if (!bundle || !canEdit) return;
      const role = roles.find((r) => r.role_key === roleKey);
      setSaving(true);
      try {
        const yearsMinistry =
          draft.yearsMinistry ?? computeYearsBetween(draft.serviceStart, draft.serviceEnd || undefined);
        const yearsPosition =
          draft.yearsPosition ?? computeYearsBetween(draft.serviceStart, draft.serviceEnd || undefined);
        const officialLocked =
          Boolean(bundle.leader.official_locked) || Boolean(bundle.leader.official_lock_key?.trim());
        await saveExecutiveProfileBundle({
          leaderId: bundle.leader.id,
          roleKey: officialLocked ? null : roleKey || null,
          catalogLevelKey: officialLocked ? null : (role?.level_key as ExecutiveHierarchyLevel | undefined),
          jimboLeaderVariant: officialLocked ? null : roleKey === "mkuu_wa_jimbo" ? jimboVariant : null,
          cheoTitle: officialLocked ? undefined : role ? resolveCheoFromRole(role, jimboVariant) : undefined,
          viongoziPatch: officialLocked
            ? {
                address: draft.address || null,
                mkoa: draft.mkoa || null,
                wilaya: draft.wilaya || null,
                biography: draft.cvBundle?.profile?.biography?.trim() || null,
              }
            : {
                jina: draft.fullName,
                full_name: draft.fullName,
                gender: draft.gender || null,
                simu: draft.phone,
                whatsapp: draft.whatsapp || null,
                email: draft.email || null,
                address: draft.address || null,
                mkoa: draft.mkoa || null,
                wilaya: draft.wilaya || null,
                date_of_birth: draft.dateOfBirth || null,
                start_date: draft.serviceStart || null,
                end_date: draft.serviceEnd || null,
              },
          extendedPatch: {
            gender: draft.gender || null,
            whatsapp: draft.whatsapp || null,
            baptized: draft.baptized,
            baptism_date: draft.baptismDate || null,
            marital_status: draft.maritalStatus || null,
            position_started_at: draft.serviceStart || null,
            position_ended_at: draft.serviceEnd || null,
            years_in_ministry: yearsMinistry,
            years_in_current_position: yearsPosition,
          },
          cvBundle: draft.cvBundle,
        });
        pushToast("Wasifu wa uongozi umehifadhiwa.", "success");
        dispatchPortalReloadMetrics();
        await loadLeader(bundle.leader.id);
      } catch (e) {
        reportError(e, "Wasifu — hifadhi");
      } finally {
        setSaving(false);
      }
    },
    [bundle, canEdit, roleKey, jimboVariant, roles, pushToast, reportError, loadLeader],
  );

  const handleUpload = useCallback(
    async (kind: LeadershipUploadKind, file: File) => {
      if (!bundle?.leader.id || !canEdit) return;
      const folder =
        kind === "seal" || kind === "attach"
          ? "attach"
          : kind === "cert"
            ? "cert"
            : (kind as "photo" | "signature" | "cv");
      setUploadBusy(true);
      try {
        const { path } = await uploadLeadershipCvObject(bundle.leader.id, folder, file);
        if (kind === "seal") {
          await saveExecutiveProfileBundle({
            leaderId: bundle.leader.id,
            extendedPatch: { official_seal_storage_path: path },
          });
        }
        pushToast("Faili imepakiwa.", "success");
        dispatchPortalReloadMetrics();
        await loadLeader(bundle.leader.id);
      } catch (e) {
        reportError(e, "Wasifu — pakia faili");
      } finally {
        setUploadBusy(false);
      }
    },
    [bundle, canEdit, pushToast, reportError, loadLeader],
  );

  const openCredentials = useCallback(() => {
    if (!bundle?.leader.id) return;
    writeLeadershipCredentialPrefill({
      leaderId: bundle.leader.id,
      fullName: bundle.leader.jina,
      cheo: bundle.leader.cheo,
    });
    navigatePortalModule("viongozi", LEADERSHIP_CREDENTIALS_HUB_SUBMODULE);
    pushToast("Fungua Cheti & CV — kiongozi amechaguliwa.", "info");
  }, [bundle, pushToast]);

  const handleGeneratePdf = useCallback(async () => {
    if (!bundle || !canExport) {
      pushToast("Huna ruhusa ya kupakua PDF.", "error");
      return;
    }
    try {
      const autoFill = await loadLeadershipCredentialAutoFill({
        ref: { source: "church_viongozi", leader: bundle.leader },
        dayosisi,
        majimbo,
        matawi,
        logoUrl,
      });
      await generateLeadershipCredential(
        { source: "church_viongozi", leader: bundle.leader },
        "leadership_profile_pdf",
        {
          logoUrl,
          autoFill,
          recordIssue: true,
          issuedByUserId: authUser?.id ?? null,
        },
      );
      pushToast("PDF ya wasifu imetengenezwa.", "success");
      const certs = await fetchOfficialCertificatesForSourceOptional("church_viongozi", bundle.leader.id, 1);
      setLatestCert(certs[0] ?? null);
    } catch (e) {
      reportError(e, "Wasifu — PDF");
    }
  }, [bundle, canExport, dayosisi, majimbo, matawi, logoUrl, authUser?.id, pushToast, reportError]);

  const levelTabs = (
    <div className="flex flex-wrap gap-2">
      {EXECUTIVE_HIERARCHY_LEVELS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setLevel(t.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            level === t.id
              ? "bg-[#0B1F3A] text-amber-200 shadow"
              : "border border-slate-200 bg-white text-slate-700 hover:border-amber-300"
          }`}
        >
          {t.emoji} {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <DashboardHero
        title="Wasifu wa Uongozi — Injini ya Ngazi"
        subtitle="KMK(T) hierarchy: Tawi, Jimbo, Dayosisi na Kitaifa — wasifu kamili, elimu, huduma, vyeti na PDF."
        actions={
          <button
            type="button"
            onClick={() => void loadMeta()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/15"
          >
            <RefreshCw className={`h-4 w-4 ${loadingMeta ? "animate-spin" : ""}`} aria-hidden />
            Sasisha
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumKPICard
          index={0}
          title="Nafasi"
          value={String(slots.length)}
          hint={`${filledSlots} zimejazwa`}
          icon={<Crown className="h-4 w-4" aria-hidden />}
          live={Boolean(kpiLive)}
        />
        <PremiumKPICard
          index={1}
          title="Viongozi"
          value={String(viongozi.length)}
          hint={kpiLive ? `${kpiLive.viongoziActiveCount} active` : "Kanisa"}
          icon={<Users className="h-4 w-4" aria-hidden />}
          live={Boolean(kpiLive)}
        />
        <PremiumKPICard
          index={2}
          title="Ngazi"
          value={level === "all" ? "Zote" : EXECUTIVE_HIERARCHY_LEVELS.find((l) => l.id === level)?.label ?? level}
          hint="Chuja bodi"
          icon={<Crown className="h-4 w-4" aria-hidden />}
        />
        <PremiumKPICard
          index={3}
          title="Elimu"
          value={String(educationCatalog.filter((e) => e.category === "academic").length)}
          hint="Chaguo za catalog"
          icon={<Users className="h-4 w-4" aria-hidden />}
        />
      </div>

      {levelTabs}

      {level !== "all" ? (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-[#0B1F3A]">Bodi ya nafasi — {EXECUTIVE_HIERARCHY_LEVELS.find((l) => l.id === level)?.label}</h3>
          <HierarchyRoleBoard
            slots={slots}
            selectedLeaderId={selectedLeaderId}
            onSelectLeader={(id) => setSelectedLeaderId(id)}
            onAssignSlot={(rk) => setAssignRoleKey(rk)}
          />
        </section>
      ) : null}

      {assignRoleKey ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm font-bold text-[#0B1F3A]">Chagua kiongozi kwa nafasi</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {assignCandidates.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setRoleKey(assignRoleKey);
                  setSelectedLeaderId(v.id);
                  setAssignRoleKey(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-amber-400"
              >
                {v.jina || v.full_name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAssignRoleKey(null)}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-600 underline"
            >
              Funga
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <ExecutiveProfileEditor
          bundle={bundle}
          loading={bundleLoading}
          roles={levelRoles.length ? levelRoles : roles.filter((r) => r.level_key === resolveHierarchyLevelFromLeader(bundle?.leader ?? ({} as KiongoziRecord)))}
          educationCatalog={educationCatalog}
          roleKey={roleKey}
          jimboVariant={jimboVariant}
          canEdit={canEdit}
          canExport={canExport}
          saving={saving}
          uploadBusy={uploadBusy}
          latestCert={latestCert}
          onRoleKeyChange={setRoleKey}
          onJimboVariantChange={setJimboVariant}
          onSave={handleSave}
          onUpload={handleUpload}
          onOpenCredentials={openCredentials}
          onGeneratePdf={() => void handleGeneratePdf()}
        />

        <aside className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#0B1F3A]">Orodha ya viongozi</h3>
          <p className="mt-1 text-[11px] text-slate-500">Chagua kuhariri wasifu</p>
          <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            {viongozi
              .filter((v) => level === "all" || resolveHierarchyLevelFromLeader(v) === level)
              .slice(0, 80)
              .map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedLeaderId(v.id)}
                    className={`w-full rounded-lg px-2 py-2 text-left text-xs ${
                      selectedLeaderId === v.id
                        ? "bg-[#0B1F3A] font-semibold text-amber-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="block truncate">{v.jina || v.full_name}</span>
                    <span className="block truncate text-[10px] opacity-80">{v.cheo}</span>
                  </button>
                </li>
              ))}
          </ul>
        </aside>
      </div>
    </motion.div>
  );
}
