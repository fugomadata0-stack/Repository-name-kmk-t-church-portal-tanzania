import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { captureClientException } from "../lib/clientExceptionReporting";
import { formatCaughtError, formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase, isSupabaseConfigured, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import { redactSensitiveText, safeStorage } from "../lib/security";
import { clearPortalUiSnapshot } from "../lib/portalUiPersistence";
import { notifyOfficialPortalSave } from "../lib/portalDraftRecovery";
import { checkAndIncrementRateLimit, fetchMatrixForRole, resetRateLimit } from "../services/securityService";
import { logAuditAction } from "../services/auditLogService";
import { parsePortalUserRole } from "../utils/permissions";
import { matrixHasAnyViewableModule, type ModuleMatrixMap } from "../utils/matrixPermissions";
import {
  describeScopeEditBadge,
  recordAllowsScopeMutation,
  SCOPE_TOOLTIP_SW,
  type ScopeHierarchy,
  type ScopeMutationOp,
  type ScopeTriple,
} from "../utils/scopeAccess";
import type {
  AboutKmktState,
  PortalDirectoryProfile,
  PortalModuleMatrixRow,
  SiteSettingsState,
  SiteSocialLinks,
  UserRole,
} from "../types";

type ToastLevel = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  level: ToastLevel;
}

export interface PortalContextValue {
  /** Jukumu kutoka portal_directory_profiles.role_key (linalotumika kwa maonyesho / utangulizi). */
  role: UserRole;
  site: SiteSettingsState;
  about: AboutKmktState;
  refreshSite: () => Promise<void>;
  refreshAbout: () => Promise<void>;
  saveSite: (s: Partial<SiteSettingsState>) => Promise<void>;
  saveAbout: (a: Partial<AboutKmktState>) => Promise<void>;
  publishAbout: (published: boolean) => Promise<void>;
  supabaseReady: boolean;
  loading: boolean;
  pushToast: (message: string, level?: ToastLevel) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  reportError: (err: unknown, context?: string) => void;
  logAudit: (action: string, entity: string, entityId?: string, meta?: Record<string, unknown>) => Promise<void>;

  session: Session | null;
  authUser: User | null;
  /** Baada ya getSession / onAuthStateChange ya kwanza */
  authInitialized: boolean;
  authBusy: boolean;
  portalProfile: PortalDirectoryProfile | null;
  matrixByModule: ModuleMatrixMap;
  rbacLoading: boolean;
  /** Imesalia bila wasifu hai na auth_user_id inayolingana */
  profileGateBlocked: boolean;
  /** Hitilafu ya kusoma portal_directory_profiles (si “hujasajiliwa”) — jaribu tena */
  portalDirectoryLoadError: boolean;
  /** Wasifu upo lakini matrix haina can_view kwenye moduli yoyote */
  noModuleRbac: boolean;

  signInWithEmailPassword: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshPortalAccess: () => Promise<void>;

  canPortalViewModule: (moduleKey: string) => boolean;
  canPortalCreateModule: (moduleKey: string) => boolean;
  canPortalEditModule: (moduleKey: string) => boolean;
  canPortalDeleteModule: (moduleKey: string) => boolean;
  canPortalExportModule: (moduleKey: string) => boolean;
  canPortalApproveModule: (moduleKey: string) => boolean;
  canPortalRejectModule: (moduleKey: string) => boolean;
  canPortalPrintModule: (moduleKey: string) => boolean;
  canPortalUploadModule: (moduleKey: string) => boolean;
  canPortalDownloadModule: (moduleKey: string) => boolean;
  canPortalManageSettingsModule: (moduleKey: string) => boolean;

  /** Upeo wa kuona data zote vs uhariri ndani ya eneo */
  scopeBadgeLabel: string;
  canScopeMutateRecord: (op: ScopeMutationOp, row: ScopeTriple | null, hierarchy: ScopeHierarchy) => boolean;
  notifyScopeDenied: (moduleKey: string, attemptedEntity: string, meta?: Record<string, unknown>) => void;
}

const emptySocial: SiteSocialLinks = {
  whatsapp: "",
  facebook: "",
  youtube: "",
  instagram: "",
  twitter_x: "",
  email_public: "",
};

const defaultSite: SiteSettingsState = {
  id: undefined,
  hero_image_url: "",
  cross_image_url: "",
  gallery: [],
  categories: [],
  custom_fields: [],
  meta_title: "",
  meta_description: "",
  og_image_url: "",
  canonical_base_url: "",
  maintenance_mode: false,
  maintenance_message: "",
  social_links: { ...emptySocial },
  favicon_url: "",
  privacy_policy_url: "",
  terms_of_service_url: "",
  cookies_notice_url: "",
  support_url: "",
};

function emptyAbout(): AboutKmktState {
  return {
    id: undefined,
    church_name: "",
    abbreviation: "",
    motto: "",
    mission: "",
    vision: "",
    core_values: "",
    history: "",
    objectives: "",
    headquarters: "",
    contacts: "",
    leadership_message: "",
    bible_verse: "",
    logo_url: "",
    hero_image_url: "",
    gallery: [],
    status: "draft",
    published: false,
  };
}

const Ctx = createContext<PortalContextValue | null>(null);
const LOGIN_FAIL_STORAGE_KEY = "kmkt_auth_failures_v1";
const LOGIN_BLOCK_UNTIL_KEY = "kmkt_auth_block_until_v1";
const SESSION_ACTIVITY_KEY = "kmkt_last_activity_v1";
const SESSION_IDLE_LIMIT_MS = 30 * 60 * 1000;
let initialSessionPromise: Promise<Session | null> | null = null;

async function getInitialSessionOnce(client: NonNullable<ReturnType<typeof getSupabase>>): Promise<Session | null> {
  if (!initialSessionPromise) {
    initialSessionPromise = client.auth.getSession().then(({ data }) => data.session ?? null);
  }
  return initialSessionPromise;
}

function isInvalidRefreshTokenError(err: unknown): boolean {
  const msg = String((err as { message?: unknown } | null)?.message ?? err ?? "").toLowerCase();
  return msg.includes("invalid refresh token") || msg.includes("refresh token not found");
}

function formatAuthLoginError(error: AuthError): string {
  const raw = (error.message || "").trim();
  const low = raw.toLowerCase();
  if (error.status === 400 && (low.includes("invalid login") || low.includes("invalid email or password"))) {
    return "Barua pepe au nenosiri si sahihi.";
  }
  if (low.includes("email not confirmed")) {
    return "Thibitisha barua pepe kabla ya kuendelea.";
  }
  if (low.includes("too many requests")) {
    return "Jaribio limezidi. Jaribu tena baada ya muda mfupi.";
  }
  return raw || "Imeshindikana kuingia.";
}

function parseCategoryList(raw: unknown): SiteSettingsState["categories"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        id: String(o.id ?? `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
        name: String(o.name ?? ""),
      };
    })
    .filter((x) => x.name.trim() !== "");
}

function parseCustomFields(raw: unknown): SiteSettingsState["custom_fields"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        id: String(o.id ?? `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
        label: String(o.label ?? ""),
        field_key: String(o.field_key ?? o.fieldKey ?? ""),
      };
    })
    .filter((x) => x.label.trim() !== "" || x.field_key.trim() !== "");
}

function parseSocialLinksRaw(raw: unknown): SiteSocialLinks {
  const base: SiteSocialLinks = { ...emptySocial };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  (["whatsapp", "facebook", "youtube", "instagram", "twitter_x", "email_public"] as const).forEach((k) => {
    if (typeof o[k] === "string") base[k] = o[k];
  });
  return base;
}

function rowToSite(r: Record<string, unknown> | null): SiteSettingsState {
  if (!r) return { ...defaultSite };
  return {
    id: r.id as string | undefined,
    hero_image_url: String(r.hero_image_url ?? ""),
    cross_image_url: String(r.cross_image_url ?? ""),
    gallery: Array.isArray(r.gallery) ? (r.gallery as unknown[]) : [],
    categories: parseCategoryList(r.categories),
    custom_fields: parseCustomFields(r.custom_fields),
    meta_title: String(r.meta_title ?? ""),
    meta_description: String(r.meta_description ?? ""),
    og_image_url: String(r.og_image_url ?? ""),
    canonical_base_url: String(r.canonical_base_url ?? ""),
    maintenance_mode: Boolean(r.maintenance_mode),
    maintenance_message: String(r.maintenance_message ?? ""),
    social_links: parseSocialLinksRaw(r.social_links),
    favicon_url: String(r.favicon_url ?? ""),
    privacy_policy_url: String(r.privacy_policy_url ?? ""),
    terms_of_service_url: String(r.terms_of_service_url ?? ""),
    cookies_notice_url: String(r.cookies_notice_url ?? ""),
    support_url: String(r.support_url ?? ""),
  };
}

function rowToAbout(r: Record<string, unknown> | null): AboutKmktState {
  if (!r) return emptyAbout();
  return {
    id: r.id as string | undefined,
    church_name: String(r.church_name ?? ""),
    abbreviation: String(r.abbreviation ?? ""),
    motto: String(r.motto ?? ""),
    mission: String(r.mission ?? ""),
    vision: String(r.vision ?? ""),
    core_values: String(r.core_values ?? ""),
    history: String(r.history ?? ""),
    objectives: String(r.objectives ?? ""),
    headquarters: String(r.headquarters ?? ""),
    contacts: String(r.contacts ?? ""),
    leadership_message: String(r.leadership_message ?? ""),
    bible_verse: String(r.bible_verse ?? ""),
    logo_url: String(r.logo_url ?? ""),
    hero_image_url: String(r.hero_image_url ?? ""),
    gallery: Array.isArray(r.gallery) ? (r.gallery as unknown[]) : [],
    status: (r.status as AboutKmktState["status"]) || "draft",
    published: Boolean(r.published),
  };
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [portalProfile, setPortalProfile] = useState<PortalDirectoryProfile | null>(null);
  const [matrixByModule, setMatrixByModule] = useState<ModuleMatrixMap>(() => new Map());
  const [rbacLoading, setRbacLoading] = useState(false);
  const [profileGateBlocked, setProfileGateBlocked] = useState(false);
  const [portalDirectoryLoadError, setPortalDirectoryLoadError] = useState(false);

  const [site, setSite] = useState<SiteSettingsState>(defaultSite);
  const [about, setAbout] = useState<AboutKmktState>(() => emptyAbout());
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const role = useMemo(() => parsePortalUserRole(portalProfile?.role_key), [portalProfile?.role_key]);

  const noModuleRbac = useMemo(
    () => !!portalProfile && !profileGateBlocked && !matrixHasAnyViewableModule(matrixByModule),
    [portalProfile, profileGateBlocked, matrixByModule]
  );

  const lastToastRef = useRef<{ message: string; level: ToastLevel; at: number } | null>(null);

  const pushToast = useCallback((message: string, level: ToastLevel = "info") => {
    const now = Date.now();
    const prev = lastToastRef.current;
    if (prev && prev.message === message && prev.level === level && now - prev.at < 3500) {
      return;
    }
    lastToastRef.current = { message, level, at: now };
    const id = `${now}-${Math.random().toString(36).slice(2)}`;
    setToasts((t) => [...t, { id, message, level }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const reportError = useCallback(
    (err: unknown, context?: string) => {
      captureClientException(err, context);
      const safeErrText = redactSensitiveText(formatCaughtError(err));
      if (context) console.error(`[${context}]`, safeErrText);
      else console.error(safeErrText);
      const msg = context ? `${context}: ${safeErrText}` : safeErrText;
      pushToast(msg, "error");
    },
    [pushToast]
  );

  useEffect(() => {
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      reportError(ev.reason, "Ahadi isiyokamatwa");
      ev.preventDefault();
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => window.removeEventListener("unhandledrejection", onUnhandled);
  }, [reportError, pushToast]);

  const clearPortalAccess = useCallback(() => {
    setPortalProfile(null);
    setMatrixByModule(new Map());
    setProfileGateBlocked(false);
    setPortalDirectoryLoadError(false);
    setRbacLoading(false);
  }, []);

  const loadPortalAccess = useCallback(
    async (user: User | null | undefined) => {
      const userId = user?.id;
      if (!userId) {
        clearPortalAccess();
        return;
      }
      const client = getSupabase();
      if (!client) {
        clearPortalAccess();
        return;
      }
      setRbacLoading(true);
      setProfileGateBlocked(false);
      setPortalDirectoryLoadError(false);
      try {
        /** Msoro wa newest ikiwa kuna zaidi ya safu moja kwa uuid sawa (epuka PGRST116 ya maybeSingle). */
        const qProf = await client
          .from("portal_directory_profiles")
          .select("*")
          .eq("auth_user_id", userId)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        let prof = qProf.data as PortalDirectoryProfile | null;
        const error = qProf.error;

        /** Safu iko na barua pepe + active lakini auth_user_id bado haijaunganishwa — jiunganishe kwa UUID halisi baada ya uthibitisho wa barua pepe. */
        if (!error && !prof && user?.email?.trim()) {
          const emailTrim = user.email.trim();
          const fb = await client
            .from("portal_directory_profiles")
            .select("*")
            .ilike("email", emailTrim)
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fb.error && fb.error.code !== "PGRST116") {
            reportError(fb.error, "Wasifu wa kitengo — barua pepe");
            setPortalProfile(null);
            setMatrixByModule(new Map());
            setProfileGateBlocked(false);
            setPortalDirectoryLoadError(true);
            return;
          }

          const row = fb.data as PortalDirectoryProfile | null;
          if (row) {
            if (row.auth_user_id && row.auth_user_id !== userId) {
              pushToast(
                "Barua pepe hii imesajiliwa kwenye akaunti nyingine. Tumia akaunti sahihi au wasiliana na msimamizi.",
                "error"
              );
              setPortalProfile(null);
              setMatrixByModule(new Map());
              setPortalDirectoryLoadError(false);
              setProfileGateBlocked(true);
              return;
            }
            if (!row.auth_user_id) {
              if (!user.email_confirmed_at) {
                pushToast("Thibitisha barua pepe ili kuunganisha akaunti yako na orodha ya watumiaji.", "error");
                setPortalProfile(null);
                setMatrixByModule(new Map());
                setPortalDirectoryLoadError(false);
                setProfileGateBlocked(true);
                return;
              }
              const { error: upErr } = await client
                .from("portal_directory_profiles")
                .update({ auth_user_id: userId, updated_at: new Date().toISOString() })
                .eq("id", row.id)
                .is("auth_user_id", null);
              if (upErr) {
                reportError(upErr, "Kuunganisha akaunti na orodha");
                setPortalProfile(null);
                setMatrixByModule(new Map());
                setProfileGateBlocked(false);
                setPortalDirectoryLoadError(true);
                return;
              }
              prof = { ...row, auth_user_id: userId } as PortalDirectoryProfile;
            }
          }
        }

        if (error) {
          reportError(error, "Wasifu wa kitengo");
          setPortalProfile(null);
          setMatrixByModule(new Map());
          setProfileGateBlocked(false);
          setPortalDirectoryLoadError(true);
          return;
        }
        if (!prof) {
          setPortalProfile(null);
          setMatrixByModule(new Map());
          setPortalDirectoryLoadError(false);
          setProfileGateBlocked(true);
          return;
        }

        const profile = prof as PortalDirectoryProfile;
        if (!profile.role_key?.trim()) {
          pushToast("Akaunti haina jukumu lililowekwa. Wasiliana na msimamizi.", "error");
          setPortalProfile(null);
          setMatrixByModule(new Map());
          setPortalDirectoryLoadError(false);
          setProfileGateBlocked(true);
          return;
        }

        setPortalProfile(profile);
        setProfileGateBlocked(false);
        setPortalDirectoryLoadError(false);

        const rows = await fetchMatrixForRole(profile.role_key);
        setMatrixByModule(new Map(rows.map((r: PortalModuleMatrixRow) => [r.module_key, r])));
      } catch (e) {
        reportError(e, "RBAC");
        setPortalProfile(null);
        setMatrixByModule(new Map());
        setProfileGateBlocked(false);
        setPortalDirectoryLoadError(true);
      } finally {
        setRbacLoading(false);
      }
    },
    [reportError, pushToast, clearPortalAccess]
  );

  const refreshPortalAccess = useCallback(async () => {
    await loadPortalAccess(authUser ?? undefined);
  }, [loadPortalAccess, authUser]);

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const client = getSupabase();
      if (!client) return "Supabase haijasanidiwa.";
      if (authBusy) return "Tafadhali subiri, ombi lingine la kuingia linaendelea.";
      const normalizedEmail = email.trim().toLowerCase();
      const serverRate = await checkAndIncrementRateLimit("login", normalizedEmail, 5, 300, 300);
      if (serverRate && !serverRate.allowed) {
        return `Jaribio limezuiwa kwa muda. Subiri takriban sekunde ${Math.max(1, serverRate.retry_after_seconds)}.`;
      }
      const blockUntilRaw = safeStorage.get(LOGIN_BLOCK_UNTIL_KEY);
      const blockUntil = Number(blockUntilRaw || 0);
      if (Number.isFinite(blockUntil) && blockUntil > Date.now()) {
        return "Jaribio limefungwa kwa muda kutokana na login failures nyingi. Subiri dakika chache.";
      }
      setAuthBusy(true);
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          const failures = Number(safeStorage.get(LOGIN_FAIL_STORAGE_KEY) || 0) + 1;
          safeStorage.set(LOGIN_FAIL_STORAGE_KEY, String(failures));
          if (failures >= 5) {
            const until = Date.now() + 5 * 60 * 1000;
            safeStorage.set(LOGIN_BLOCK_UNTIL_KEY, String(until));
            await logAuditAction({
              module: "auth",
              action: "suspicious_login_detected",
              entity_type: "auth_session",
              status: "failed",
              message: "Login failures nyingi mfululizo (possible suspicious activity).",
            new_values: { email: normalizedEmail, failures },
              user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
            });
          }
          await logAuditAction({
            module: "auth",
            action: "login_failure",
            entity_type: "auth_session",
            status: "failed",
            message: formatAuthLoginError(error),
            new_values: { email: normalizedEmail },
            user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
          });
          return formatAuthLoginError(error);
        }
        await logAuditAction({
          module: "auth",
          action: "login_success",
          entity_type: "auth_session",
          status: "success",
          message: "Mtumiaji ameingia.",
          performed_by_user_id: data.user?.id ?? null,
          performed_by_name: data.user?.email ?? null,
          new_values: { email: normalizedEmail },
          user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
        });
        await resetRateLimit("login", normalizedEmail);
        safeStorage.remove(LOGIN_FAIL_STORAGE_KEY);
        safeStorage.remove(LOGIN_BLOCK_UNTIL_KEY);
        safeStorage.set(SESSION_ACTIVITY_KEY, String(Date.now()));
        return null;
      } catch (e) {
        const failures = Number(safeStorage.get(LOGIN_FAIL_STORAGE_KEY) || 0) + 1;
        safeStorage.set(LOGIN_FAIL_STORAGE_KEY, String(failures));
        await logAuditAction({
          module: "auth",
          action: "login_failure",
          entity_type: "auth_session",
          status: "failed",
          message: formatCaughtError(e),
          new_values: { email: normalizedEmail },
          user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
        });
        return formatCaughtError(e);
      } finally {
        setAuthBusy(false);
      }
    },
    [authBusy]
  );

  const signOut = useCallback(async () => {
    const client = getSupabase();
    if (authUser?.id) {
      await logAuditAction({
        module: "auth",
        action: "logout",
        entity_type: "auth_session",
        performed_by_user_id: authUser.id,
        performed_by_name: authUser.email ?? null,
        status: "success",
        message: "Mtumiaji ametoka.",
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
      });
    }
    clearPortalUiSnapshot();
    clearPortalAccess();
    setSession(null);
    setAuthUser(null);
    if (client) {
      await client.auth.signOut();
    }
  }, [clearPortalAccess, authUser]);

  const loadPortalAccessRef = useRef(loadPortalAccess);
  loadPortalAccessRef.current = loadPortalAccess;
  const clearPortalAccessRef = useRef(clearPortalAccess);
  clearPortalAccessRef.current = clearPortalAccess;
  const runPortalAccessRef = useRef<(user: User | null | undefined) => Promise<void>>(async () => undefined);
  const portalAccessInflightRef = useRef<{ userId: string | null; promise: Promise<void> | null }>({
    userId: null,
    promise: null,
  });
  const runPortalAccess = useCallback(async (user: User | null | undefined) => {
    const userId = user?.id ?? null;
    if (!userId) {
      portalAccessInflightRef.current = { userId: null, promise: null };
      clearPortalAccessRef.current();
      return;
    }
    const inFlight = portalAccessInflightRef.current;
    if (inFlight.promise && inFlight.userId === userId) {
      await inFlight.promise;
      return;
    }
    const nextPromise = loadPortalAccessRef.current(user);
    portalAccessInflightRef.current = { userId, promise: nextPromise };
    try {
      await nextPromise;
    } finally {
      if (portalAccessInflightRef.current.promise === nextPromise) {
        portalAccessInflightRef.current.promise = null;
      }
    }
  }, []);
  runPortalAccessRef.current = runPortalAccess;

  const canPortalViewModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_view,
    [matrixByModule]
  );
  const canPortalCreateModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_create,
    [matrixByModule]
  );
  const canPortalEditModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_edit,
    [matrixByModule]
  );
  const canPortalDeleteModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_delete,
    [matrixByModule]
  );
  const canPortalExportModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_export,
    [matrixByModule]
  );
  const canPortalApproveModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_approve,
    [matrixByModule]
  );
  const canPortalRejectModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_reject,
    [matrixByModule]
  );
  const canPortalPrintModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_print,
    [matrixByModule]
  );
  const canPortalUploadModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_upload,
    [matrixByModule]
  );
  const canPortalDownloadModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_download,
    [matrixByModule]
  );
  const canPortalManageSettingsModule = useCallback(
    (moduleKey: string) => !!matrixByModule.get(moduleKey)?.can_manage_settings,
    [matrixByModule]
  );

  const scopeBadgeLabel = useMemo(() => describeScopeEditBadge(role, portalProfile), [role, portalProfile]);

  const canScopeMutateRecord = useCallback(
    (op: ScopeMutationOp, row: ScopeTriple | null, hierarchy: ScopeHierarchy) =>
      recordAllowsScopeMutation(role, portalProfile, op, row, hierarchy),
    [role, portalProfile]
  );

  const notifyScopeDenied = useCallback(
    (moduleKey: string, attemptedEntity: string, meta?: Record<string, unknown>) => {
      pushToast(SCOPE_TOOLTIP_SW, "error");
      void logAuditAction({
        module: moduleKey,
        action: "scope_denied",
        entity_type: attemptedEntity,
        status: "failed",
        message: "outside_scope",
        performed_by_user_id: authUser?.id ?? null,
        performed_by_name: portalProfile?.full_name ?? authUser?.email ?? null,
        role_key: portalProfile?.role_key ?? role,
        new_values: {
          reason: "outside_scope",
          role_key: portalProfile?.role_key ?? role,
          ...meta,
        },
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
      });
    },
    [pushToast, authUser, portalProfile, role]
  );

  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setAuthInitialized(true);
      return;
    }

    let cancelled = false;

    void getInitialSessionOnce(client)
      .then((s) => {
        if (cancelled) return;
        setSession(s ?? null);
        setAuthUser(s?.user ?? null);
        setAuthInitialized(true);
        if (s?.user) void runPortalAccessRef.current(s.user);
        else clearPortalAccessRef.current();
      })
      .catch((e) => {
        if (cancelled) return;
        if (isInvalidRefreshTokenError(e)) {
          safeStorage.remove(SESSION_ACTIVITY_KEY);
          clearPortalUiSnapshot();
          void client.auth.signOut({ scope: "local" }).catch(() => undefined);
          pushToast("Kikao chako kimekwisha muda wake. Tafadhali ingia tena.", "info");
        } else {
          reportError(e, "Auth — getSession");
        }
        setSession(null);
        setAuthUser(null);
        setAuthInitialized(true);
        clearPortalAccessRef.current();
      });

    const { data: sub } = client.auth.onAuthStateChange((event, s) => {
      if (event === "INITIAL_SESSION") return;
      setSession(s ?? null);
      setAuthUser(s?.user ?? null);
      if (s?.user) void runPortalAccessRef.current(s.user);
      else clearPortalAccessRef.current();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [reportError, pushToast]);

  /** Kurudi kwenye tab / programu: thibitisha kikao kimya kimya; epuka kutoa mtumiaji kwa hitilafu ya mtandao kwa muda mfupi. */
  useEffect(() => {
    const client = getSupabase();
    if (!client || !session) return;

    const SESSION_EXPIRED_SW = "Kikao chako kimekwisha muda wake. Tafadhali ingia tena.";

    const reconcileSession = () => {
      void (async () => {
        try {
          const { data, error } = await client.auth.getSession();
          const s = data.session;
          if (error) {
            if (isInvalidRefreshTokenError(error)) {
              safeStorage.remove(SESSION_ACTIVITY_KEY);
              clearPortalUiSnapshot();
              await client.auth.signOut({ scope: "local" }).catch(() => undefined);
              setSession(null);
              setAuthUser(null);
              clearPortalAccessRef.current();
              pushToast(SESSION_EXPIRED_SW, "info");
              return;
            }
            return;
          }
          if (s?.user) {
            setSession(s);
            setAuthUser(s.user);
            return;
          }
          const refreshed = await client.auth.refreshSession();
          if (refreshed.error) {
            if (isInvalidRefreshTokenError(refreshed.error)) {
              safeStorage.remove(SESSION_ACTIVITY_KEY);
              clearPortalUiSnapshot();
              await client.auth.signOut({ scope: "local" }).catch(() => undefined);
              setSession(null);
              setAuthUser(null);
              clearPortalAccessRef.current();
              pushToast(SESSION_EXPIRED_SW, "info");
            }
            return;
          }
          const rs = refreshed.data.session;
          if (rs?.user) {
            setSession(rs);
            setAuthUser(rs.user);
          }
        } catch {
          /* mtandao si thabiti — usibadilishe hali ya mtumiaji */
        }
      })();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") reconcileSession();
    };
    const onOnline = () => reconcileSession();
    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted) reconcileSession();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [session, pushToast]);

  useEffect(() => {
    if (!session) return;
    const touch = () => safeStorage.set(SESSION_ACTIVITY_KEY, String(Date.now()));
    touch();
    const onUserActivity = () => touch();
    const interval = window.setInterval(() => {
      const last = Number(safeStorage.get(SESSION_ACTIVITY_KEY) || 0);
      if (last > 0 && Date.now() - last > SESSION_IDLE_LIMIT_MS) {
        pushToast("Kikao chako kimekwisha muda wake. Tafadhali ingia tena.", "info");
        void signOut();
      }
    }, 60000);
    window.addEventListener("click", onUserActivity);
    window.addEventListener("keydown", onUserActivity);
    window.addEventListener("touchstart", onUserActivity);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("click", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("touchstart", onUserActivity);
    };
  }, [session, signOut, pushToast]);

  const refreshSite = useCallback(async () => {
    const client = getSupabase();
    if (!client) {
      setSite({ ...defaultSite });
      return;
    }
    setLoading(true);
    const { data, error } = await client.from("site_settings").select("*").limit(1).maybeSingle();
    setLoading(false);
    if (error) {
      pushToast(formatPostgrestError(error, "site_settings"), "error");
      setSite({ ...defaultSite });
      return;
    }
    setSite(rowToSite(data as Record<string, unknown> | null));
  }, [pushToast]);

  const refreshAbout = useCallback(async () => {
    const client = getSupabase();
    if (!client) {
      setAbout(emptyAbout());
      return;
    }
    setLoading(true);
    const { data, error } = await client.from("about_kmkt").select("*").limit(1).maybeSingle();
    setLoading(false);
    if (error) {
      pushToast(formatPostgrestError(error, "about_kmkt"), "error");
      setAbout(emptyAbout());
      return;
    }
    setAbout(rowToAbout(data as Record<string, unknown> | null));
  }, [pushToast]);

  useEffect(() => {
    void refreshSite();
    void refreshAbout();
  }, [refreshSite, refreshAbout]);

  useEffect(() => {
    const client = getSupabase();
    if (!isSupabaseRealtimeEnabled()) return;
    if (!client || !authInitialized || !authUser) return;
    const ch = client
      .channel("site-settings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => void refreshSite()
      )
      .subscribe();
    return () => {
      void client.removeChannel(ch);
    };
  }, [refreshSite, authInitialized, authUser]);

  const saveSite = useCallback(
    async (patch: Partial<SiteSettingsState>) => {
      const next = { ...site, ...patch };
      setSite(next);
      const client = getSupabase();
      if (!client) {
        pushToast("Weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY kwenye app-next/.env.local.", "error");
        return;
      }
      setLoading(true);
      const payload = {
        hero_image_url: next.hero_image_url || null,
        cross_image_url: next.cross_image_url || null,
        gallery: next.gallery || [],
        categories: next.categories || [],
        custom_fields: next.custom_fields || [],
        meta_title: next.meta_title?.trim() || null,
        meta_description: next.meta_description?.trim() || null,
        og_image_url: next.og_image_url?.trim() || null,
        canonical_base_url: next.canonical_base_url?.trim() || null,
        maintenance_mode: next.maintenance_mode,
        maintenance_message: next.maintenance_message?.trim() || null,
        social_links: next.social_links || { ...emptySocial },
        favicon_url: next.favicon_url?.trim() || null,
        privacy_policy_url: next.privacy_policy_url?.trim() || null,
        terms_of_service_url: next.terms_of_service_url?.trim() || null,
        cookies_notice_url: next.cookies_notice_url?.trim() || null,
        support_url: next.support_url?.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (next.id) {
        const { error } = await client.from("site_settings").update(payload).eq("id", next.id);
        setLoading(false);
        if (error) {
          pushToast(formatPostgrestError(error, "site_settings.save"), "error");
        } else {
          notifyOfficialPortalSave();
          pushToast("Mipangilio ya tovuti imesasishwa.", "success");
        }
      } else {
        const { data, error } = await client.from("site_settings").insert(payload).select("id").single();
        setLoading(false);
        if (error) {
          pushToast(formatPostgrestError(error, "site_settings.insert"), "error");
        } else {
          setSite((s) => ({ ...s, id: data?.id as string }));
          notifyOfficialPortalSave();
          pushToast("Mipangilio ya tovuti imehifadhiwa.", "success");
        }
      }
      await refreshSite();
    },
    [site, pushToast, refreshSite]
  );

  const saveAbout = useCallback(
    async (patch: Partial<AboutKmktState>) => {
      const next = { ...about, ...patch };
      setAbout(next);
      const client = getSupabase();
      if (!client) {
        pushToast("Weka VITE_SUPABASE_* kwenye .env.local ili kuhifadhi Kuhusu KMKT.", "error");
        return;
      }
      setLoading(true);
      const payload = {
        church_name: next.church_name,
        abbreviation: next.abbreviation,
        motto: next.motto,
        mission: next.mission,
        vision: next.vision,
        core_values: next.core_values,
        history: next.history,
        objectives: next.objectives,
        headquarters: next.headquarters,
        contacts: next.contacts,
        leadership_message: next.leadership_message,
        bible_verse: next.bible_verse,
        logo_url: next.logo_url || null,
        hero_image_url: next.hero_image_url || null,
        gallery: next.gallery || [],
        status: next.status,
        published: next.published,
        updated_at: new Date().toISOString(),
      };
      if (next.id) {
        const { error } = await client.from("about_kmkt").update(payload).eq("id", next.id);
        setLoading(false);
        if (error) {
          pushToast(formatPostgrestError(error, "about_kmkt.save"), "error");
        } else {
          notifyOfficialPortalSave();
          pushToast("Kuhusu KMKT kimesasishwa.", "success");
        }
      } else {
        const { data, error } = await client.from("about_kmkt").insert(payload).select("id").single();
        setLoading(false);
        if (error) {
          pushToast(formatPostgrestError(error, "about_kmkt.insert"), "error");
        } else {
          setAbout((a) => ({ ...a, id: data?.id }));
          notifyOfficialPortalSave();
          pushToast("Kuhusu KMKT kimeundwa.", "success");
        }
      }
      await refreshAbout();
    },
    [about, pushToast, refreshAbout]
  );

  const publishAbout = useCallback(
    async (published: boolean) => {
      await saveAbout({ published, status: published ? "active" : "draft" });
    },
    [saveAbout]
  );

  const logAudit = useCallback(
    async (action: string, entity: string, entityId?: string, meta?: Record<string, unknown>) => {
      await logAuditAction({
        module: entity?.split("/")[0] || "general",
        action,
        entity_type: entity,
        entity_id: entityId ?? null,
        performed_by_user_id: authUser?.id ?? null,
        performed_by_name: portalProfile?.full_name ?? authUser?.email ?? null,
        role_key: portalProfile?.role_key ?? role,
        status: "success",
        new_values: meta ?? null,
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
      });
    },
    [authUser, portalProfile, role]
  );

  const value = useMemo<PortalContextValue>(
    () => ({
      role,
      site,
      about,
      refreshSite,
      refreshAbout,
      saveSite,
      saveAbout,
      publishAbout,
      supabaseReady,
      loading,
      pushToast,
      toasts,
      dismissToast,
      reportError,
      logAudit,
      session,
      authUser,
      authInitialized,
      authBusy,
      portalProfile,
      matrixByModule,
      rbacLoading,
      profileGateBlocked,
      portalDirectoryLoadError,
      noModuleRbac,
      signInWithEmailPassword,
      signOut,
      refreshPortalAccess,
      canPortalViewModule,
      canPortalCreateModule,
      canPortalEditModule,
      canPortalDeleteModule,
      canPortalExportModule,
      canPortalApproveModule,
      canPortalRejectModule,
      canPortalPrintModule,
      canPortalUploadModule,
      canPortalDownloadModule,
      canPortalManageSettingsModule,
      scopeBadgeLabel,
      canScopeMutateRecord,
      notifyScopeDenied,
    }),
    [
      role,
      site,
      about,
      refreshSite,
      refreshAbout,
      saveSite,
      saveAbout,
      publishAbout,
      supabaseReady,
      loading,
      pushToast,
      toasts,
      dismissToast,
      reportError,
      logAudit,
      session,
      authUser,
      authInitialized,
      authBusy,
      portalProfile,
      matrixByModule,
      rbacLoading,
      profileGateBlocked,
      portalDirectoryLoadError,
      noModuleRbac,
      signInWithEmailPassword,
      signOut,
      refreshPortalAccess,
      canPortalViewModule,
      canPortalCreateModule,
      canPortalEditModule,
      canPortalDeleteModule,
      canPortalExportModule,
      canPortalApproveModule,
      canPortalRejectModule,
      canPortalPrintModule,
      canPortalUploadModule,
      canPortalDownloadModule,
      canPortalManageSettingsModule,
      scopeBadgeLabel,
      canScopeMutateRecord,
      notifyScopeDenied,
    ]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              t.level === "error"
                ? "border-rose-300 bg-rose-50 text-rose-900"
                : t.level === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-blue-200 bg-white text-slate-800"
            }`}
          >
            <div className="flex justify-between gap-2">
              <span>{t.message}</span>
              <button type="button" className="text-xs underline" onClick={() => dismissToast(t.id)}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function usePortal() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortal must be used within PortalProvider");
  return v;
}
