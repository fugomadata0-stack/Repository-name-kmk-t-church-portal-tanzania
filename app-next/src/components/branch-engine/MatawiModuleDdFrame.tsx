import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Cloud, ExternalLink, Loader2 } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { snapshotToMatawiDdKpis } from "../../lib/matawiBranchEngineKpiMapper";
import { buildMatawiDdStructure } from "../../lib/matawiBranchEngineStructure";
import { enrichWorkspaceFromSupabase } from "../../lib/matawiBranchEnginePrefill";
import { syncBranchEngineModuleToSupabase } from "../../services/matawiBranchEngineSyncService";
import { BranchEngineScopeBar } from "./BranchEngineScopeBar";
import { MASTER_BRANCH_ENGINE_REALTIME_TABLES } from "../../lib/masterBranchEngineHub";
import {
  KMT_PORTAL_RELOAD_METRICS_EVENT,
  dispatchPortalReloadMetrics,
} from "../../lib/portalEvents";
import {
  MATAWI_DD_ACK_EVENT,
  MATAWI_DD_CLEAR_EVENT,
  MATAWI_DD_CONTEXT_EVENT,
  MATAWI_DD_DATA_EVENT,
  MATAWI_DD_ERROR_EVENT,
  MATAWI_DD_KPIS_EVENT,
  MATAWI_DD_NAVIGATE_EVENT,
  MATAWI_DD_READY_EVENT,
  MATAWI_DD_REFRESH_KPIS_EVENT,
  MATAWI_DD_SAVE_EVENT,
  MATAWI_DD_SAVED_EVENT,
  MATAWI_DD_STRUCTURE_EVENT,
  MATAWI_DD_UPLOAD_EVENT,
  MATAWI_DD_UPLOADED_EVENT,
} from "../../lib/matawiModuleDdPortalBridge";
import { getSupabase, isSupabaseRealtimeEnabled } from "../../lib/supabaseClient";
import {
  clearBranchEngineWorkspace,
  loadBranchEngineWorkspace,
  saveBranchEngineWorkspace,
  type BranchEngineWorkspacePayload,
} from "../../services/matawiBranchEngineWorkspaceService";
import { uploadBranchEngineFile } from "../../services/matawiBranchEngineUploadService";
import {
  fetchMasterBranchEngineSnapshot,
  type MasterBranchScope,
} from "../../services/masterBranchEngineService";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";

interface Props {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  initialScope?: MasterBranchScope;
  initialEntityId?: string;
  initialModuleId?: string;
}

type IframeMessage = {
  type?: string;
  scope?: string;
  entityId?: string;
  moduleId?: string;
  fieldId?: string;
  uploadKind?: string;
  payload?: BranchEngineWorkspacePayload;
  show?: boolean;
  migration?: BranchEngineWorkspacePayload | { fields?: Record<string, string> };
  moduleKey?: string;
  submodule?: string;
  message?: string;
  file?: File;
};

function parseScope(raw: string | undefined): MasterBranchScope {
  if (raw === "dayosisi" || raw === "jimbo" || raw === "tawi") return raw;
  return "kitaifa";
}

export function MatawiModuleDdFrame({
  dayosisi,
  majimbo,
  matawi,
  initialScope = "kitaifa",
  initialEntityId = "",
  initialModuleId = "",
}: Props) {
  const { authUser, authInitialized, portalProfile, pushToast, reportError } = usePortal();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{
    scope: MasterBranchScope;
    entityId: string;
    moduleId: string;
    payload: BranchEngineWorkspacePayload;
    show: boolean;
  } | null>(null);
  const pendingReadyRef = useRef<IframeMessage | null>(null);
  const kpiRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeScope, setActiveScope] = useState<MasterBranchScope>(initialScope);
  const [activeEntityId, setActiveEntityId] = useState(initialEntityId);
  const [activeModuleId] = useState(initialModuleId);

  const scopeRef = useRef(activeScope);
  const entityRef = useRef(activeEntityId);

  scopeRef.current = activeScope;
  entityRef.current = activeEntityId;

  useEffect(() => {
    setActiveScope(initialScope);
    setActiveEntityId(initialEntityId);
  }, [initialScope, initialEntityId]);

  useEffect(() => {
    if (activeEntityId || initialEntityId) return;
    if (initialScope === "kitaifa") return;
    const p = portalProfile;
    if (!p) return;
    if (p.tawi_scope?.trim()) {
      setActiveScope("tawi");
      setActiveEntityId(p.tawi_scope.trim());
    } else if (p.jimbo_scope?.trim()) {
      setActiveScope("jimbo");
      setActiveEntityId(p.jimbo_scope.trim());
    } else if (p.dayosisi_scope?.trim()) {
      setActiveScope("dayosisi");
      setActiveEntityId(p.dayosisi_scope.trim());
    }
  }, [portalProfile, activeEntityId, initialEntityId, initialScope]);

  const src = useMemo(() => {
    const q = new URLSearchParams();
    q.set("embedded", "1");
    q.set("scope", activeScope);
    if (activeEntityId) q.set("entityId", activeEntityId);
    if (activeModuleId) q.set("module", activeModuleId);
    return `/matawi-module-dd.html?${q.toString()}`;
  }, [activeScope, activeEntityId, activeModuleId]);

  useEffect(() => {
    setIframeLoaded(false);
  }, [src]);

  const postToIframe = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  const pushDataToIframe = useCallback(
    (payload: BranchEngineWorkspacePayload, activeModuleId?: string) => {
      postToIframe({ type: MATAWI_DD_DATA_EVENT, payload, activeModuleId });
    },
    [postToIframe],
  );

  const pushStructureToIframe = useCallback(() => {
    postToIframe({
      type: MATAWI_DD_STRUCTURE_EVENT,
      structure: buildMatawiDdStructure(dayosisi, majimbo, matawi),
    });
  }, [dayosisi, majimbo, matawi, postToIframe]);

  const pushKpisToIframe = useCallback(
    async (scope: MasterBranchScope, entityId: string) => {
      try {
        const snapshot = await fetchMasterBranchEngineSnapshot({
          scope,
          entityId: entityId || null,
          dayosisi,
          majimbo,
          matawi,
        });
        postToIframe({ type: MATAWI_DD_KPIS_EVENT, kpis: snapshotToMatawiDdKpis(snapshot) });
        postToIframe({
          type: MATAWI_DD_CONTEXT_EVENT,
          scope,
          entityId,
          label: snapshot.label,
          sublabel: snapshot.sublabel,
          loadedAt: snapshot.loadedAt,
          live: Boolean(snapshot.ngazi),
        });
      } catch (err) {
        reportError(err, "matawiBranchEngine.kpis");
      }
    },
    [dayosisi, majimbo, matawi, postToIframe, reportError],
  );

  const scheduleKpiRefresh = useCallback(() => {
    if (kpiRefreshTimerRef.current) clearTimeout(kpiRefreshTimerRef.current);
    kpiRefreshTimerRef.current = setTimeout(() => {
      kpiRefreshTimerRef.current = null;
      void pushKpisToIframe(scopeRef.current, entityRef.current);
    }, 600);
  }, [pushKpisToIframe]);

  const loadWorkspace = useCallback(
    async (scope: MasterBranchScope, entityId: string) => {
      if (!authUser) {
        pushDataToIframe({ fields: {} });
        return;
      }
      setSyncing(true);
      try {
        const row = await loadBranchEngineWorkspace(scope, entityId);
        let payload = row?.payload ?? { fields: {} };
        payload = await enrichWorkspaceFromSupabase(
          scope,
          entityId,
          payload,
          dayosisi,
          majimbo,
          matawi,
        );
        pushDataToIframe(payload, row?.activeModuleId);
        if (row?.updatedAt) setLastSavedAt(row.updatedAt);
      } catch (err) {
        reportError(err, "matawiBranchEngineWorkspace.load");
        pushDataToIframe({ fields: {} });
        pushToast(
          err instanceof Error ? err.message : "Imeshindwa kupakia data kutoka Supabase.",
          "error",
        );
      } finally {
        setSyncing(false);
      }
    },
    [authUser, dayosisi, majimbo, matawi, pushDataToIframe, pushToast, reportError],
  );

  const flushSave = useCallback(async () => {
    const job = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (!job || !authUser) return;
    setSyncing(true);
    try {
      let payload = job.payload;
      await saveBranchEngineWorkspace({
        scope: job.scope,
        entityId: job.entityId,
        activeModuleId: job.moduleId,
        payload,
      });

      const syncResult = await syncBranchEngineModuleToSupabase({
        moduleId: job.moduleId,
        scope: job.scope,
        entityId: job.entityId,
        payload,
        dayosisi,
        majimbo,
        matawi,
      });

      const resolvedTawiId = syncResult.tawiId ?? (job.scope === "tawi" ? job.entityId : "");
      const resolvedScope: MasterBranchScope =
        resolvedTawiId && (job.scope !== "tawi" || !job.entityId) ? "tawi" : job.scope;

      const needsPayloadResave =
        (syncResult.leaderSlots && Object.keys(syncResult.leaderSlots).length > 0) ||
        (syncResult.syncRefs && Object.keys(syncResult.syncRefs).length > 0);
      if (needsPayloadResave) {
        payload = {
          ...payload,
          ...(syncResult.leaderSlots ? { leaderSlots: syncResult.leaderSlots } : {}),
          ...(syncResult.syncRefs ? { syncRefs: { ...payload.syncRefs, ...syncResult.syncRefs } } : {}),
        };
        await saveBranchEngineWorkspace({
          scope: resolvedScope,
          entityId: resolvedTawiId || job.entityId,
          activeModuleId: job.moduleId,
          payload,
        });
        pushDataToIframe(payload, job.moduleId);
      }

      if (resolvedTawiId && (resolvedScope !== job.scope || resolvedTawiId !== job.entityId)) {
        setActiveScope(resolvedScope);
        setActiveEntityId(resolvedTawiId);
        scopeRef.current = resolvedScope;
        entityRef.current = resolvedTawiId;
      }

      setLastSavedAt(new Date().toISOString());
      postToIframe({ type: MATAWI_DD_SAVED_EVENT, show: job.show });
      dispatchPortalReloadMetrics();

      if (syncResult.messages.length > 0) {
        pushToast(syncResult.messages.join(" · "), syncResult.ok ? "success" : "error");
      } else if (job.show) {
        pushToast("Imehifadhiwa kwenye Supabase.", "success");
      }
    } catch (err) {
      reportError(err, "matawiBranchEngineWorkspace.save");
      const message = err instanceof Error ? err.message : "Imeshindwa kuhifadhi.";
      postToIframe({ type: MATAWI_DD_ERROR_EVENT, message });
      pushToast(message, "error");
    } finally {
      setSyncing(false);
    }
  }, [authUser, dayosisi, majimbo, matawi, postToIframe, pushDataToIframe, pushToast, reportError]);

  const handleScopeChange = useCallback(
    (nextScope: MasterBranchScope, nextEntityId: string) => {
      if (pendingSaveRef.current && authUser) {
        void flushSave().finally(() => {
          setActiveScope(nextScope);
          setActiveEntityId(nextEntityId);
        });
        return;
      }
      setActiveScope(nextScope);
      setActiveEntityId(nextEntityId);
    },
    [authUser, flushSave],
  );

  const queueSave = useCallback(
    (job: NonNullable<typeof pendingSaveRef.current>, debounceMs: number) => {
      if (!authUser) {
        pushToast("Ingia kwenye akaunti ili kuhifadhi kwenye Supabase.", "error");
        postToIframe({ type: MATAWI_DD_ERROR_EVENT, message: "Ingia kwenye akaunti ili kuhifadhi." });
        return;
      }
      pendingSaveRef.current = job;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void flushSave();
      }, debounceMs);
    },
    [authUser, flushSave, postToIframe, pushToast],
  );

  const processIframeReady = useCallback(
    async (data: IframeMessage) => {
      const scope = parseScope(data.scope);
      const entityId = data.entityId ?? "";
      postToIframe({ type: MATAWI_DD_ACK_EVENT });

      if (data.migration && authUser) {
        const mig = data.migration;
        const fields =
          mig && typeof mig === "object" && "fields" in mig && mig.fields
            ? (mig.fields as Record<string, string>)
            : (mig as Record<string, string>);
        const payload: BranchEngineWorkspacePayload = {
          fields: fields ?? {},
          contributionSources: Array.isArray(
            (mig as BranchEngineWorkspacePayload).contributionSources,
          )
            ? (mig as BranchEngineWorkspacePayload).contributionSources
            : undefined,
        };
        if (Object.keys(payload.fields).length > 0) {
          try {
            await saveBranchEngineWorkspace({ scope, entityId, payload });
            pushToast("Data ya zamani imehamishwa hadi Supabase.", "info");
          } catch (err) {
            reportError(err, "matawiBranchEngineWorkspace.migrate");
          }
        }
      }

      await loadWorkspace(scope, entityId);
      pushStructureToIframe();
      void pushKpisToIframe(scope, entityId);
    },
    [
      authUser,
      loadWorkspace,
      postToIframe,
      pushKpisToIframe,
      pushStructureToIframe,
      pushToast,
      reportError,
    ],
  );

  useEffect(() => {
    if (!iframeLoaded || !authInitialized) return;
    void loadWorkspace(scopeRef.current, entityRef.current);
    pushStructureToIframe();
    void pushKpisToIframe(scopeRef.current, entityRef.current);
  }, [
    iframeLoaded,
    authInitialized,
    authUser,
    loadWorkspace,
    pushKpisToIframe,
    pushStructureToIframe,
  ]);

  useEffect(() => {
    if (!iframeLoaded) return;
    pushStructureToIframe();
    scheduleKpiRefresh();
  }, [iframeLoaded, dayosisi, majimbo, matawi, pushStructureToIframe, scheduleKpiRefresh]);

  useEffect(() => {
    if (!iframeLoaded || !authInitialized || !authUser || !pendingReadyRef.current) return;
    void processIframeReady(pendingReadyRef.current);
    pendingReadyRef.current = null;
  }, [iframeLoaded, authInitialized, authUser, processIframeReady]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (pendingSaveRef.current && authUser) {
        void flushSave();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [authUser, flushSave]);

  useEffect(() => {
    if (!isSupabaseRealtimeEnabled() || !authUser) return;
    const c = getSupabase();
    if (!c) return;

    let channel = c.channel(`branch-engine-live:${authUser.id}`);

    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "portal_branch_engine_workspace",
        filter: `auth_user_id=eq.${authUser.id}`,
      },
      () => {
        void loadWorkspace(scopeRef.current, entityRef.current);
      },
    );

    for (const table of MASTER_BRANCH_ENGINE_REALTIME_TABLES) {
      if (table === "portal_branch_engine_workspace") continue;
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          scheduleKpiRefresh();
        },
      );
    }

    channel.subscribe();

    return () => {
      if (kpiRefreshTimerRef.current) clearTimeout(kpiRefreshTimerRef.current);
      void c.removeChannel(channel);
    };
  }, [authUser, loadWorkspace, scheduleKpiRefresh]);

  useEffect(() => {
    const onMetricsReload = () => scheduleKpiRefresh();
    window.addEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onMetricsReload);
    return () => window.removeEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onMetricsReload);
  }, [scheduleKpiRefresh]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as IframeMessage;
      if (!data?.type) return;

      if (data.type === MATAWI_DD_NAVIGATE_EVENT && data.moduleKey) {
        window.dispatchEvent(
          new CustomEvent("kmt-portal-navigate", {
            detail: { moduleKey: data.moduleKey, submodule: data.submodule ?? "" },
          }),
        );
        return;
      }

      if (data.type === MATAWI_DD_READY_EVENT) {
        pendingReadyRef.current = data;
        if (authInitialized && authUser) void processIframeReady(data);
        return;
      }

      if (data.type === MATAWI_DD_REFRESH_KPIS_EVENT) {
        void pushKpisToIframe(parseScope(data.scope), data.entityId ?? "");
        return;
      }

      if (data.type === MATAWI_DD_SAVE_EVENT && data.payload) {
        queueSave(
          {
            scope: parseScope(data.scope),
            entityId: data.entityId ?? "",
            moduleId: data.moduleId ?? "registration",
            payload: data.payload,
            show: Boolean(data.show),
          },
          data.show ? 0 : 500,
        );
        return;
      }

      if (data.type === MATAWI_DD_CLEAR_EVENT) {
        void (async () => {
          if (!authUser) {
            pushToast("Ingia kwenye akaunti ili kufuta data.", "error");
            return;
          }
          setSyncing(true);
          try {
            await clearBranchEngineWorkspace(parseScope(data.scope), data.entityId ?? "");
            pushDataToIframe({ fields: {} });
            setLastSavedAt(null);
            pushToast("Draft imefutwa kwenye Supabase.", "success");
          } catch (err) {
            reportError(err, "matawiBranchEngineWorkspace.clear");
            pushToast(err instanceof Error ? err.message : "Imeshindwa kufuta.", "error");
          } finally {
            setSyncing(false);
          }
        })();
        return;
      }

      if (data.type === MATAWI_DD_UPLOAD_EVENT) {
        const uploadFile = data.file;
        if (!(uploadFile instanceof File)) return;
        void (async () => {
          if (!authUser) {
            pushToast("Ingia kwenye akaunti ili kupakia faili.", "error");
            return;
          }
          setSyncing(true);
          try {
            const meta = await uploadBranchEngineFile({
              file: uploadFile,
              scope: parseScope(data.scope),
              entityId: data.entityId,
              moduleId: data.moduleId,
              fieldId: data.fieldId,
            });
            postToIframe({
              type: MATAWI_DD_UPLOADED_EVENT,
              ok: true,
              uploadKind: data.uploadKind,
              fieldId: data.fieldId,
              meta,
            });
            pushToast(`Faili imepakiwa: ${meta.fileName}`, "success");
          } catch (err) {
            const message = err instanceof Error ? err.message : "Upakiaji umeshindwa.";
            postToIframe({
              type: MATAWI_DD_UPLOADED_EVENT,
              ok: false,
              uploadKind: data.uploadKind,
              message,
            });
            pushToast(message, "error");
          } finally {
            setSyncing(false);
          }
        })();
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (kpiRefreshTimerRef.current) clearTimeout(kpiRefreshTimerRef.current);
    };
  }, [
    authUser,
    authInitialized,
    processIframeReady,
    pushDataToIframe,
    pushKpisToIframe,
    postToIframe,
    pushToast,
    queueSave,
    reportError,
  ]);

  const showOverlay = !iframeLoaded || syncing;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative -mx-3 w-[calc(100%+1.5rem)] sm:-mx-4 sm:w-[calc(100%+2rem)] md:-mx-6 md:w-[calc(100%+3rem)]"
    >
      <BranchEngineScopeBar
        scope={activeScope}
        entityId={activeEntityId}
        dayosisi={dayosisi}
        majimbo={majimbo}
        matawi={matawi}
        portalProfile={portalProfile}
        onScopeChange={handleScopeChange}
      />
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute inset-0 z-10 flex min-h-[70vh] items-center justify-center bg-[#061633]/5 backdrop-blur-[1px]"
        >
          <div className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-white/95 px-4 py-3 text-sm text-[#0B1F3A] shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-[#0B3C5D]" aria-hidden />
            {!iframeLoaded
              ? "Inapakia Injini ya Matawi…"
              : "Inasawazisha na Supabase…"}
          </div>
        </motion.div>
      )}
      <iframe
        key={src}
        ref={iframeRef}
        title="KMK(T) — Injini ya Matawi / Matawi Module"
        src={src}
        className="block w-full border-0 bg-[#f4f7fb]"
        style={{ minHeight: "calc(100dvh - 7.5rem)", height: "calc(100dvh - 7.5rem)" }}
        onLoad={() => setIframeLoaded(true)}
      />
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-slate-500 no-print">
        <span className="inline-flex items-center gap-1">
          <Cloud className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
          Hifadhi: <strong className="font-medium text-emerald-800">Supabase</strong>
          {lastSavedAt
            ? ` · mwisho ${new Date(lastSavedAt).toLocaleString("sw-TZ", { dateStyle: "short", timeStyle: "short" })}`
            : authUser
              ? ""
              : " · ingia ili kuhifadhi"}
        </span>
        <span className="inline-flex items-center gap-1">
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          KPI · muundo · workspace — Supabase Realtime
        </span>
      </p>
    </motion.div>
  );
}
