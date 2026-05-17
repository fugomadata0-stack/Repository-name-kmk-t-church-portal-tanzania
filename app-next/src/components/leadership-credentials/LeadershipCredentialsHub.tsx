import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import type { DayosisiRecord, JimboRecord, KiongoziRecord, TawiRecord } from "../../types";
import type { NationalLeadershipProfileRow } from "../../services/nationalLeadershipService";
import { fetchNationalLeadershipProfilesOptional } from "../../services/nationalLeadershipService";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import { LeadershipDocumentGallery, type LeadershipGalleryItem } from "../executive/LeadershipDocumentGallery";
import { LeadershipDocumentPreviewModal } from "../executive/LeadershipDocumentPreviewModal";
import { LeadershipDocumentUploadCenter, type LeadershipUploadKind } from "../executive/LeadershipDocumentUploadCenter";
import {
  enrichPreviewWithOfficialCertificate,
  kiongoziToGalleryItem,
  kiongoziToPreviewProps,
  nationalRowToGalleryItem,
  nationalRowToPreviewProps,
} from "../../lib/leadershipDocumentPreview";
import {
  generateLeadershipCredential,
  levelMatchesFilter,
  resolveHierarchyLevelFromLeader,
  type LeadershipHierarchyLevel,
  type UnifiedLeaderRef,
} from "../../lib/certificateEngine";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import {
  ADVANCED_PDF_KINDS,
  advancedKindToCredentialKind,
  credentialKindToAdvanced,
  type AdvancedLeadershipPdfKind,
} from "../../lib/leadershipPdfEngine";
import type { BuiltLeadershipPdf } from "../../lib/leadershipPdfEngine/types";
import {
  computeHubStats,
  educationKindStats,
  leadershipGrowthMetrics,
  serviceDurationBuckets,
} from "../../lib/leadershipCredentialAnalytics";
import { fetchGlobalCredentialStatsOptional } from "../../services/leadershipCredentialStatsService";
import {
  uploadLeadershipCvObject,
} from "../../services/leadershipCvEngineService";
import { LeadershipPdfExportToolbar } from "./LeadershipPdfExportToolbar";
import { PrintPdfMasterPreview } from "../print-pdf-master/PrintPdfMasterPreview";
import {
  buildGovernanceExplainer,
  getDocumentCopy,
} from "../../lib/leadershipPdfEngine";
import {
  buildHierarchyCertificatePresentation,
  resolveCertificateHierarchyLevel,
} from "../../lib/leadershipPdfEngine/hierarchyCertificateDesign";
import {
  fetchCredentialIssuesForSourceOptional,
  subscribeLeadershipCredentialsEngine,
  type CredentialIssueRow,
} from "../../services/leadershipCredentialsEngineService";
import {
  fetchOfficialCertificatesForSourceOptional,
  subscribeLeadershipCertificateSystem,
  type OfficialCertificateRow,
} from "../../services/leadershipOfficialCertificateService";
import { LeadershipCertificateRegistryPanel } from "./LeadershipCertificateRegistryPanel";
import { loadLeadershipCredentialAutoFill } from "../../lib/certificateEngine/loadAutoFill";
import type { LeadershipCredentialAutoFill } from "../../lib/certificateEngine/autoFill";
import { writeLeadershipCredentialPrefill } from "../../lib/leadershipCredentialPrefill";
import { LeadershipCredentialAutoFillPanel } from "./LeadershipCredentialAutoFillPanel";
import { LeadershipCredentialsEngineShell } from "./LeadershipCredentialsEngineShell";
import { LeadershipHierarchyDashboards } from "./LeadershipHierarchyDashboards";
import { LeadershipCredentialAnalyticsPanel } from "./LeadershipCredentialAnalyticsPanel";
import { LeadershipCredentialDocumentCards } from "./LeadershipCredentialDocumentCards";
import { LeadershipApprovalTimeline } from "./LeadershipApprovalTimeline";
import { usePortal } from "../../context/PortalContext";

const LEVEL_TABS: { id: LeadershipHierarchyLevel | "all"; label: string }[] = [
  { id: "all", label: "Wote" },
  { id: "national", label: "KMK(T) Kitaifa" },
  { id: "dayosisi", label: "Dayosisi" },
  { id: "jimbo", label: "Jimbo" },
  { id: "tawi", label: "Tawi" },
];

const DOC_KINDS: AdvancedLeadershipPdfKind[] = ADVANCED_PDF_KINDS;

type Props = {
  viongozi: KiongoziRecord[];
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  canExport: boolean;
  canEdit: boolean;
  kpiLive?: DashboardKpiSnapshot | null;
};

function refFromItem(
  item: LeadershipGalleryItem,
  viongozi: KiongoziRecord[],
  national: NationalLeadershipProfileRow[],
): UnifiedLeaderRef | null {
  if (item.id.startsWith("nat-")) {
    const roleKey = item.roleKey ?? item.id.replace(/^nat-/, "");
    const row = national.find((r) => r.role_key === roleKey);
    return row ? { source: "national_leadership", row } : null;
  }
  const leader = viongozi.find((v) => v.id === item.id);
  return leader ? { source: "church_viongozi", leader } : null;
}

export function LeadershipCredentialsHub({
  viongozi,
  dayosisi,
  majimbo,
  matawi,
  canExport,
  canEdit,
  kpiLive,
}: Props) {
  const { pushToast, reportError, about, authUser, portalProfile } = usePortal();
  const approverName = portalProfile?.full_name ?? authUser?.email ?? undefined;
  const [national, setNational] = useState<NationalLeadershipProfileRow[]>([]);
  const [level, setLevel] = useState<LeadershipHierarchyLevel | "all">("all");
  const [loadingNat, setLoadingNat] = useState(true);
  const [previewItem, setPreviewItem] = useState<LeadershipGalleryItem | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfKindBusy, setPdfKindBusy] = useState<AdvancedLeadershipPdfKind | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [issues, setIssues] = useState<CredentialIssueRow[]>([]);
  const [officialCerts, setOfficialCerts] = useState<OfficialCertificateRow[]>([]);
  const [selectedCert, setSelectedCert] = useState<OfficialCertificateRow | null>(null);
  const [lastBuiltPdf, setLastBuiltPdf] = useState<BuiltLeadershipPdf | null>(null);
  const [autoFill, setAutoFill] = useState<LeadershipCredentialAutoFill | null>(null);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [globalCertStats, setGlobalCertStats] = useState<{ totalOfficial: number } | null>(null);
  const previewMasterRef = useRef<HTMLDivElement>(null);

  const logoUrl = about?.logo_url?.trim() || null;

  const loadNational = useCallback(async () => {
    setLoadingNat(true);
    try {
      const [rows, global] = await Promise.all([
        fetchNationalLeadershipProfilesOptional(),
        fetchGlobalCredentialStatsOptional(),
      ]);
      setNational(rows.filter((r) => r.status === "active"));
      setGlobalCertStats(global);
    } catch (e) {
      reportError(e, "Cheti — viongozi wa kitaifa");
    } finally {
      setLoadingNat(false);
    }
  }, [reportError]);

  useEffect(() => {
    void loadNational();
  }, [loadNational]);

  const galleryItems = useMemo(() => {
    const churchItems = viongozi
      .filter((v) => levelMatchesFilter(resolveHierarchyLevelFromLeader(v), level))
      .map((v) => kiongoziToGalleryItem(v));
    const natItems =
      level === "all" || level === "national"
        ? national.map((r) => nationalRowToGalleryItem(r))
        : [];
    return [...natItems, ...churchItems];
  }, [viongozi, national, level]);

  const hubStats = useMemo(
    () =>
      computeHubStats(
        viongozi,
        national.length,
        officialCerts,
        autoFill ? [autoFill] : [],
      ),
    [viongozi, national.length, officialCerts, autoFill],
  );

  const previewRef = useMemo(
    () => (previewItem ? refFromItem(previewItem, viongozi, national) : null),
    [previewItem, viongozi, national],
  );

  const reloadRegistry = useCallback(async () => {
    if (!previewRef) {
      setIssues([]);
      setOfficialCerts([]);
      setSelectedCert(null);
      return;
    }
    const src =
      previewRef.source === "national_leadership"
        ? { type: "national_leadership" as const, id: previewRef.row.role_key }
        : { type: "church_viongozi" as const, id: previewRef.leader.id };
    const [issueRows, certRows] = await Promise.all([
      fetchCredentialIssuesForSourceOptional(src.type, src.id),
      fetchOfficialCertificatesForSourceOptional(src.type, src.id),
    ]);
    setIssues(issueRows);
    setOfficialCerts(certRows);
    setSelectedCert((prev) => {
      if (prev && certRows.some((c) => c.id === prev.id)) return certRows.find((c) => c.id === prev.id) ?? certRows[0] ?? null;
      return certRows[0] ?? null;
    });
  }, [previewRef]);

  useEffect(() => {
    const ch1 = subscribeLeadershipCredentialsEngine(() => {
      void loadNational();
      void reloadRegistry();
    });
    const ch2 = subscribeLeadershipCertificateSystem(() => {
      void reloadRegistry();
    });
    return () => {
      if (ch1) void ch1.unsubscribe();
      if (ch2) void ch2.unsubscribe();
    };
  }, [loadNational, reloadRegistry]);

  const previewProps = useMemo(() => {
    if (!previewRef) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const latestOfficial = officialCerts[0] ?? null;
    if (previewRef.source === "national_leadership") {
      return enrichPreviewWithOfficialCertificate(
        nationalRowToPreviewProps(previewRef.row, { logoUrl, kind: "certificate", autoFill }),
        latestOfficial,
        origin,
      );
    }
    return enrichPreviewWithOfficialCertificate(
      kiongoziToPreviewProps(previewRef.leader, { logoUrl, kind: "certificate", autoFill }),
      latestOfficial,
      origin,
    );
  }, [previewRef, logoUrl, autoFill, officialCerts]);

  const masterPreviewKind: AdvancedLeadershipPdfKind = pdfKindBusy ?? "leadership_certificate";

  const masterDocCopy = useMemo(() => getDocumentCopy(masterPreviewKind), [masterPreviewKind]);

  const masterHierarchyPresentation = useMemo(() => {
    if (!previewItem) return null;
    const level = resolveCertificateHierarchyLevel({
      isNationalLeadership: previewRef?.source === "national_leadership",
      hierarchyLevel:
        previewRef?.source === "church_viongozi"
          ? resolveHierarchyLevelFromLeader(previewRef.leader)
          : "national",
      leader: previewRef?.source === "church_viongozi" ? previewRef.leader : null,
      cheo: previewItem.cheo ?? previewItem.titleSw,
      leadershipLevel: previewItem.leadershipLevel ?? undefined,
      roleKey: previewRef?.source === "national_leadership" ? previewRef.row.role_key : undefined,
    });
    return buildHierarchyCertificatePresentation({
      kind: masterPreviewKind,
      level,
      baseCopy: masterDocCopy,
    });
  }, [previewItem, previewRef, masterPreviewKind, masterDocCopy]);

  const masterPreviewGovernance = useMemo(() => {
    if (!previewItem) return null;
    return buildGovernanceExplainer({
      kind: masterPreviewKind,
      hierarchy: previewItem.hierarchy || "KMK(T)",
      cheo: previewItem.cheo ?? previewItem.titleSw,
      leadershipLevel: previewItem.leadershipLevel ?? undefined,
      hierarchyLevelKey: masterHierarchyPresentation?.level,
      approverTitle: approverName ?? undefined,
    });
  }, [previewItem, masterPreviewKind, approverName, masterHierarchyPresentation?.level]);

  useEffect(() => {
    if (!previewRef) {
      setAutoFill(null);
      return;
    }
    let cancelled = false;
    setAutoFillLoading(true);
    void (async () => {
      try {
        const fill = await loadLeadershipCredentialAutoFill({
          ref: previewRef,
          dayosisi,
          majimbo,
          matawi,
          logoUrl,
        });
        if (!cancelled) setAutoFill(fill);
      } catch (e) {
        if (!cancelled) {
          setAutoFill(null);
          reportError(e, "Auto-fill — wasifu");
        }
      } finally {
        if (!cancelled) setAutoFillLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewRef, dayosisi, majimbo, matawi, logoUrl, reportError]);

  useEffect(() => {
    void reloadRegistry();
  }, [reloadRegistry]);

  const runDownload = useCallback(
    async (kind: AdvancedLeadershipPdfKind) => {
      if (!previewRef || !canExport) {
        pushToast("Huna ruhusa ya kupakua hati.", "error");
        return;
      }
      setPdfBusy(true);
      setPdfKindBusy(kind);
      try {
        const credKind = advancedKindToCredentialKind(kind);
        const built = await generateLeadershipCredential(previewRef, credKind, {
          logoUrl,
          logoDataUrl: logoUrl ?? undefined,
          autoFill,
          recordIssue: true,
          issuedByUserId: authUser?.id ?? null,
        });
        setLastBuiltPdf(built);
        pushToast("PDF imetengenezwa na kusajiliwa.", "success");
        dispatchPortalReloadMetrics();
        await reloadRegistry();
      } catch (e) {
        reportError(e, "Cheti — pakua PDF");
      } finally {
        setPdfBusy(false);
        setPdfKindBusy(null);
      }
    },
    [previewRef, canExport, logoUrl, autoFill, authUser?.id, pushToast, reportError, reloadRegistry],
  );

  const handleUpload = useCallback(
    async (kind: LeadershipUploadKind, file: File) => {
      if (!canEdit || previewRef?.source !== "church_viongozi") {
        pushToast("Chagua kiongozi wa kanisa ili kupakia faili.", "info");
        return;
      }
      const folder =
        kind === "attach" ? "attach" : kind === "cert" ? "cert" : (kind as "photo" | "signature" | "cv");
      setUploadBusy(true);
      try {
        await uploadLeadershipCvObject(previewRef.leader.id, folder, file);
        pushToast(`${kind} imepakiwa.`, "success");
        dispatchPortalReloadMetrics();
        const fill = await loadLeadershipCredentialAutoFill({
          ref: previewRef,
          dayosisi,
          majimbo,
          matawi,
          logoUrl,
        });
        setAutoFill(fill);
      } catch (e) {
        reportError(e, "Upakiaji — cheti");
      } finally {
        setUploadBusy(false);
      }
    },
    [canEdit, previewRef, dayosisi, majimbo, matawi, logoUrl, pushToast, reportError],
  );

  const openCvEnginePrefill = useCallback(() => {
    if (previewRef?.source !== "church_viongozi") return;
    writeLeadershipCredentialPrefill({
      leaderId: previewRef.leader.id,
      fullName: previewRef.leader.jina,
      cheo: previewRef.leader.cheo,
    });
    pushToast("Kiongozi amechaguliwa — fungua Mipangilio Mikuu → CV Engine.", "success");
  }, [previewRef, pushToast]);

  const levelTabs = (
    <div className="flex flex-wrap gap-2">
      {LEVEL_TABS.map((t) => (
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
          {t.label}
        </button>
      ))}
    </div>
  );

  const analyticsService = serviceDurationBuckets(autoFill);
  const analyticsEducation = educationKindStats(autoFill);
  const analyticsGrowth = leadershipGrowthMetrics(hubStats, autoFill);

  return (
    <LeadershipCredentialsEngineShell
      kpiLive={kpiLive}
      stats={hubStats}
      globalCertsTotal={globalCertStats?.totalOfficial}
      loading={loadingNat}
      onRefresh={() => void loadNational()}
      levelTabs={levelTabs}
    >
      <LeadershipHierarchyDashboards
        stats={hubStats}
        kpiLive={kpiLive}
        activeLevel={level}
        onLevelChange={(id) => setLevel(id as LeadershipHierarchyLevel | "all")}
      />

      <div className="flex items-start gap-2 rounded-xl border border-sky-200/80 bg-sky-50 px-3 py-2 text-xs text-sky-900">
        <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Chagua kiongozi — maeneo mengi yajazwa <strong>kiotomatiki</strong>. Hariri zaidi:{" "}
          <strong>Mipangilio Mikuu → CV Engine</strong>.
        </span>
      </div>

      <LeadershipCredentialAnalyticsPanel
        stats={hubStats}
        serviceBuckets={analyticsService}
        educationStats={analyticsEducation}
        growth={analyticsGrowth}
        leaderName={previewItem?.fullName}
        autoFill={autoFill}
      />

      <LeadershipDocumentGallery
        items={galleryItems}
        onPreview={(item) => setPreviewItem(item)}
        onBulkExport={
          canExport
            ? (selected) => {
                if (selected[0]) setPreviewItem(selected[0]);
                pushToast(`Chagua aina ya PDF kwa ${selected.length} viongozi (moja kwa moja).`, "info");
              }
            : undefined
        }
      />

      <AnimatePresence mode="wait">
        {previewItem ? (
          <motion.div
            key={previewItem.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <LeadershipCredentialAutoFillPanel
              autoFill={autoFill}
              loading={autoFillLoading}
              onOpenCvEngine={previewRef?.source === "church_viongozi" ? openCvEnginePrefill : undefined}
            />

            {previewRef?.source === "church_viongozi" && canEdit ? (
              <LeadershipDocumentUploadCenter
                kinds={["photo", "signature", "cv", "cert"]}
                disabled={!canEdit}
                busy={uploadBusy}
                onUpload={handleUpload}
              />
            ) : null}

            <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md sm:p-5">
              <p className="font-kmkt-display text-base font-bold text-[#0B1F3A] sm:text-lg">
                Pakua hati — {previewItem.fullName}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Chagua aina ya cheti au CV — muundo wa kiwango cha juu</p>
              <div className="mt-4">
                <LeadershipCredentialDocumentCards
                  kinds={DOC_KINDS}
                  busy={pdfBusy}
                  disabled={!canExport}
                  activeKind={pdfKindBusy}
                  onGenerate={(k) => void runDownload(k)}
                />
              </div>
              {masterPreviewGovernance ? (
                <div ref={previewMasterRef} className="mt-4 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100/50 p-2 sm:p-3">
                  <PrintPdfMasterPreview
                    fullName={previewItem.fullName}
                    certTitleSw={masterHierarchyPresentation?.certTitleSw ?? masterDocCopy.certTitleSw}
                    certTitleEn={masterHierarchyPresentation?.certTitleEn ?? masterDocCopy.certTitleEn}
                    headerGradient={masterHierarchyPresentation?.theme.headerGradient}
                    hierarchy={previewItem.hierarchy}
                    cheo={previewItem.cheo ?? previewItem.titleSw}
                    biography={previewProps?.biography}
                    logoUrl={logoUrl}
                    photoUrl={previewProps?.photoUrl ?? null}
                    verifyUrl={lastBuiltPdf?.verifyUrl ?? previewProps?.verifyUrl ?? null}
                    certificateNumber={selectedCert?.certificate_number ?? lastBuiltPdf?.displaySerial}
                    verificationId={selectedCert?.verification_id ?? undefined}
                    governance={masterPreviewGovernance}
                  />
                </div>
              ) : null}
              <LeadershipPdfExportToolbar
                built={lastBuiltPdf}
                previewRef={previewMasterRef}
                previewFilename={previewItem?.fullName ?? "kmkt-certificate"}
                busy={pdfBusy}
                disabled={!canExport}
                onError={(msg) => pushToast(msg, "error")}
              />
              {issues.length > 0 ? (
                <ul className="mt-4 space-y-1 text-[11px] text-slate-600">
                  {issues.map((iss) => (
                    <li key={iss.id} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                      <span className="font-mono font-semibold text-emerald-800">{iss.verification_serial}</span>
                      {" · "}
                      {credentialKindToAdvanced(iss.document_kind)}
                      {" · "}
                      {new Date(iss.issued_at).toLocaleString("sw-TZ")}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <LeadershipCertificateRegistryPanel
                certificates={officialCerts}
                canEdit={canEdit}
                approverName={approverName}
                selectedId={selectedCert?.id}
                onSelect={setSelectedCert}
                onRefresh={() => void reloadRegistry()}
              />
              <LeadershipApprovalTimeline certificate={selectedCert} />
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-amber-300/60 bg-amber-50 py-2.5 text-sm font-semibold text-[#0B1F3A] transition hover:bg-amber-100"
              onClick={() => setPreviewItem(previewItem)}
            >
              Fungua hakiki ya cheti (modal)
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {previewProps ? (
        <LeadershipDocumentPreviewModal
          open={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem?.fullName ?? "Hakiki"}
          preview={previewProps}
          pdfBusy={pdfBusy}
          onDownloadPdf={
            previewRef && canExport ? () => runDownload("leadership_certificate") : undefined
          }
        />
      ) : null}
    </LeadershipCredentialsEngineShell>
  );
}
