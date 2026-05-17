import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Building2,
  Calendar,
  FileText,
  Gauge,
  Landmark,
  LayoutDashboard,
  Lock,
  Newspaper,
  ShieldCheck,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import { usePortal } from "../context/PortalContext";
import { getSupabase, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import { HAIJAPATIKANA_DATA_SW } from "../lib/supabaseUiMessages";
import { fetchPortalPublicDashboardCountsCached } from "../lib/portalPublicDashboardCache";
import { fetchMasterSettingsOptional, readMasterSettingsCache } from "../services/masterSettingsService";
import { fetchChurchIdentityOptional } from "../services/settingsTablesService";
import { ResponsiveLazyImage } from "../components/common/ResponsiveLazyImage";
import { MaintenanceBanner } from "../components/layout/MaintenanceBanner";
import { PublicBranchEngineLiveKpis } from "../components/site/PublicBranchEngineLiveKpis";
import { NationalLeadershipShowcase } from "../components/site/NationalLeadershipShowcase";
import { PublicLandingFaithFooter } from "../components/site/PublicLandingFaithFooter";
import { PublicLandingEnterpriseStrip } from "../components/site/PublicLandingEnterpriseStrip";
import { PublicLandingModulesSection } from "../components/site/PublicLandingModulesSection";
import { PublicLandingContentHub } from "../components/site/PublicLandingContentHub";
import { PublicLandingSecurityHub } from "../components/site/PublicLandingSecurityHub";
import { PublicLandingNoticeHost } from "../components/site/PublicLandingNoticeHost";
import { PublicLandingAnnouncementsBand } from "../components/site/PublicLandingAnnouncementsBand";
import { PublicLandingGallerySection } from "../components/site/PublicLandingGallerySection";
import { PublicLandingProjectsSection } from "../components/site/PublicLandingProjectsSection";
import { PublicLandingMediaCenter } from "../components/site/PublicLandingMediaCenter";
import { LoginAuthCard } from "../components/auth/LoginAuthCard";
import { PublicExecutiveKpiStrip } from "../components/site/PublicExecutiveKpiStrip";
import { usePublicLandingNotices } from "../hooks/usePublicLandingNotices";
import { useSiteDocumentMeta } from "../hooks/useSiteDocumentMeta";
import {
  fetchPublicLandingContent,
  parseSiteSettingsGalleryItems,
  type PublicAudioRow,
  type PublicGalleryRow,
  type PublicNationalLeaderRow,
  type PublicProjectRow,
  type PublicVideoRow,
} from "../services/publicLandingService";

const HERO_IMAGE_CANDIDATES = [
  [
    "/src/assets/images/hero/jesus-hero.jpg",
    "/images/hero/jesus-hero.jpg",
    "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1800&q=80",
    "/src/assets/images/hero/jesus-hero.svg",
    "/images/hero/jesus-hero.svg",
  ],
  [
    "/src/assets/images/hero/bible-hero.jpg",
    "/images/hero/bible-hero.jpg",
    "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1800&q=80",
    "/src/assets/images/hero/bible-hero.svg",
    "/images/hero/bible-hero.svg",
  ],
  [
    "/src/assets/images/hero/church-congregation.jpg",
    "/images/hero/church-congregation.jpg",
    "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1800&q=80",
    "/src/assets/images/hero/church-congregation.svg",
    "/images/hero/church-congregation.svg",
  ],
  [
    "/src/assets/images/faith/worship-hero.jpg",
    "/images/hero/worship-hero.jpg",
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1800&q=80",
    "/src/assets/images/faith/worship-hero.svg",
    "/images/faith/worship-hero.svg",
  ],
  [
    "/src/assets/images/branding/cross-light.jpg",
    "/images/hero/cross-light.jpg",
    "https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1800&q=80",
    "/src/assets/images/branding/cross-light.svg",
    "/images/branding/cross-light.svg",
  ],
] as const;

const FALLBACK_HERO_CANDIDATES = ["/src/assets/images/branding/cross-light.svg", "/images/branding/cross-light.svg"] as const;
const LOCAL_LOGO_CANDIDATES = ["/src/assets/images/branding/kmkt-logo.png", "/images/branding/kmkt-logo.png", "/src/assets/images/branding/kmkt-logo.svg", "/images/branding/kmkt-logo.svg"] as const;

type HeroState = { src: string; idx: number; variant: number };

type PublicCounts = {
  dayosisi: number | null;
  majimbo: number | null;
  majimboActive: number | null;
  matawi: number | null;
  matawiActive: number | null;
  matawiPending: number | null;
  matawiRegistryVerified: number | null;
  matawiRegistryPendingReview: number | null;
  waumini: number | null;
  viongozi: number | null;
  nyaraka: number | null;
  matukio: number | null;
  attendanceSessionsToday: number | null;
  attendanceSessionsMonth: number | null;
  attendanceVisitorsMonth: number | null;
};

const MODULE_CARDS = [
  { title: "Dashboard", desc: "Muhtasari wa KPIs, alerts na hali ya mfumo.", icon: LayoutDashboard },
  { title: "Muundo wa Kanisa", desc: "KMK(T), Dayosisi, Majimbo na Matawi/Vituo.", icon: Building2 },
  { title: "Waumini", desc: "Usimamizi wa waumini, familia na profiles.", icon: Users },
  { title: "Viongozi", desc: "Orodha na usimamizi wa viongozi wa kitaifa.", icon: Landmark },
  { title: "Fedha", desc: "Mapato, matumizi, michango na uwazi wa fedha.", icon: Activity },
  { title: "Nyaraka", desc: "Hifadhi na utafutaji wa nyaraka rasmi.", icon: FileText },
  { title: "Media", desc: "Habari, matukio, gallery, audio, video na livestream.", icon: Video },
  { title: "Reports", desc: "Ripoti, trends na uchambuzi wa maamuzi.", icon: Gauge },
  { title: "Audit", desc: "Ufuatiliaji wa mabadiliko na uwajibikaji.", icon: ShieldCheck },
  { title: "Notifications", desc: "Arifa za haraka kwa watumishi na waumini.", icon: Bell },
  { title: "System Builder", desc: "Mipangilio ya kitaalamu na upanuzi wa mfumo.", icon: Wrench },
  { title: "System Security", desc: "Roles & Permissions na usalama wa upatikanaji.", icon: Lock },
  { title: "Public Comms", desc: "Mawasiliano ya umma kwa habari na matangazo.", icon: Newspaper },
  { title: "Habari & Matukio", desc: "Taarifa za kanisa na matukio yanayokuja.", icon: Calendar },
] as const;

/** Rangi za KPI za umma — tu kwenye ukurasa huu (si global). */
const KPI_CARD_STYLES = [
  "border-amber-400/35 bg-gradient-to-br from-amber-500/15 to-amber-950/25 shadow-amber-500/10",
  "border-sky-400/35 bg-gradient-to-br from-sky-500/15 to-sky-950/25 shadow-sky-500/10",
  "border-emerald-400/35 bg-gradient-to-br from-emerald-500/15 to-emerald-950/25 shadow-emerald-500/10",
  "border-violet-400/35 bg-gradient-to-br from-violet-500/15 to-violet-950/25 shadow-violet-500/10",
  "border-rose-400/35 bg-gradient-to-br from-rose-500/15 to-rose-950/25 shadow-rose-500/10",
  "border-cyan-400/35 bg-gradient-to-br from-cyan-500/15 to-cyan-950/25 shadow-cyan-500/10",
  "border-orange-400/35 bg-gradient-to-br from-orange-500/15 to-orange-950/25 shadow-orange-500/10",
] as const;

/** Kadi za KPI za umma — statiki, si za kubofya. */
const PUBLIC_STATIC_KPI_CARD =
  "cursor-default rounded-2xl border p-3 text-center shadow-lg backdrop-blur-md transition-opacity duration-300";

/** Takwimu halisi kutoka Supabase; si nambari bandia. */
function formatStatCount(value: number | null, loading: boolean, queryFailed: boolean): string {
  if (loading) return "…";
  if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString("sw-TZ");
  if (queryFailed) return HAIJAPATIKANA_DATA_SW;
  return "—";
}

function parsePublicCount(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
}

function hasPermissionOrRlsError(e: unknown): boolean {
  const msg = String((e as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return msg.includes("permission denied") || msg.includes("42501") || msg.includes("rls");
}

function hasMigrationNotReadyError(e: unknown): boolean {
  const msg = String((e as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return msg.includes("schema cache") || msg.includes("does not exist") || msg.includes("could not find the table") || msg.includes("could not find the");
}

function hasUnauthorizedError(e: unknown): boolean {
  const msg = String((e as { message?: unknown } | null)?.message ?? "").toLowerCase();
  const status = Number((e as { status?: unknown } | null)?.status ?? 0);
  return status === 401 || msg.includes("401") || msg.includes("unauthorized") || msg.includes("invalid api key");
}

function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  const v = String(value ?? "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
}

export function LoginPage() {
  const { site, supabaseReady } = usePortal();
  useSiteDocumentMeta(site);
  const { notices, pushNotice, dismissNotice } = usePublicLandingNotices();
  const didNotifyPublicLoad = useRef(false);
  const lastKpiNoticeAt = useRef(0);

  const [hero, setHero] = useState<HeroState>({ src: HERO_IMAGE_CANDIDATES[0][0], idx: 0, variant: 0 });
  const [heroMissing, setHeroMissing] = useState(false);
  const [publicLoadError, setPublicLoadError] = useState("");
  const [publicStatsLoading, setPublicStatsLoading] = useState(true);

  const [news, setNews] = useState<Array<{ id: string; title: string; created_at: string; summary?: string; featured?: boolean }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; event_date: string; location: string }>>([]);
  const [documents, setDocuments] = useState<Array<{ id: string; title: string; category: string; created_at: string }>>([]);
  const [liveNow, setLiveNow] = useState<Array<{ id: string; title: string; stream_url: string }>>([]);
  const [sermons, setSermons] = useState<Array<{ id: string; title: string; preacher: string; date: string }>>([]);
  const [galleryItems, setGalleryItems] = useState<PublicGalleryRow[]>([]);
  const [projects, setProjects] = useState<PublicProjectRow[]>([]);
  const [videos, setVideos] = useState<PublicVideoRow[]>([]);
  const [audios, setAudios] = useState<PublicAudioRow[]>([]);
  const [publicLeaders, setPublicLeaders] = useState<PublicNationalLeaderRow[]>([]);
  const [projectsActiveCount, setProjectsActiveCount] = useState<number | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const [logoVariant, setLogoVariant] = useState(0);

  const [stats, setStats] = useState<PublicCounts>({
    dayosisi: null,
    majimbo: null,
    majimboActive: null,
    matawi: null,
    matawiActive: null,
    matawiPending: null,
    matawiRegistryVerified: null,
    matawiRegistryPendingReview: null,
    waumini: null,
    viongozi: null,
    nyaraka: null,
    matukio: null,
    attendanceSessionsToday: null,
    attendanceSessionsMonth: null,
    attendanceVisitorsMonth: null,
  });

  const [statQueryFailed, setStatQueryFailed] = useState<Record<keyof PublicCounts, boolean>>({
    dayosisi: false,
    majimbo: false,
    majimboActive: false,
    matawi: false,
    matawiActive: false,
    matawiPending: false,
    matawiRegistryVerified: false,
    matawiRegistryPendingReview: false,
    waumini: false,
    viongozi: false,
    nyaraka: false,
    matukio: false,
    attendanceSessionsToday: false,
    attendanceSessionsMonth: false,
    attendanceVisitorsMonth: false,
  });

  const [publicLiveAt, setPublicLiveAt] = useState<string | null>(null);
  const [majimboActiveColumnFromRpc, setMajimboActiveColumnFromRpc] = useState(false);
  const [publicContentLoading, setPublicContentLoading] = useState(true);

  const [branding, setBranding] = useState(() => {
    const cache = readMasterSettingsCache();
    return {
      officialName: cache.identity.official_name || "KMK(T) TANZANIA PORTAL",
      shortName: cache.identity.short_name || "KMK(T)",
      motto: cache.identity.motto || "Kanisa la Mennonite la Kiinjili Tanzania",
      logo: cache.theme.logo_url || "",
      footer: cache.identity.system_footer || "Kanisa la Mennonite la Kiinjili Tanzania",
      colors: {
        primary: cache.theme.primary_color || "#0B1F3A",
        secondary: cache.theme.secondary_color || "#123C69",
        accent: cache.theme.accent_color || "#D4AF37",
      },
    };
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [row, identity] = await Promise.all([
        fetchMasterSettingsOptional().catch(() => null),
        fetchChurchIdentityOptional().catch(() => null),
      ]);
      if (cancelled) return;
      const cache = row ?? readMasterSettingsCache();
      setBranding({
        officialName: identity?.official_church_name || cache.identity.official_name || "KMK(T) TANZANIA PORTAL",
        shortName: cache.identity.short_name || "KMK(T)",
        motto: identity?.vision || cache.identity.motto || "Kanisa la Mennonite la Kiinjili Tanzania",
        logo: identity?.logo_url || cache.theme.logo_url || "",
        footer: identity?.official_church_name || cache.identity.system_footer || "Kanisa la Mennonite la Kiinjili Tanzania",
        colors: {
          primary: identity?.primary_color || cache.theme.primary_color || "#0B1F3A",
          secondary: identity?.secondary_color || cache.theme.secondary_color || "#123C69",
          accent: identity?.accent_color || cache.theme.accent_color || "#D4AF37",
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHero((prev) => {
        const idx = (prev.idx + 1) % HERO_IMAGE_CANDIDATES.length;
        return { idx, variant: 0, src: HERO_IMAGE_CANDIDATES[idx][0] };
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!getSupabase() || !supabaseReady) {
      setPublicStatsLoading(false);
      return;
    }

    let cancelled = false;
    setPublicStatsLoading(true);
    setPublicContentLoading(true);
    setPublicLoadError("");
    setStatQueryFailed({
      dayosisi: false,
      majimbo: false,
      majimboActive: false,
      matawi: false,
      matawiActive: false,
      matawiPending: false,
      matawiRegistryVerified: false,
      matawiRegistryPendingReview: false,
      waumini: false,
      viongozi: false,
      nyaraka: false,
      matukio: false,
      attendanceSessionsToday: false,
      attendanceSessionsMonth: false,
      attendanceVisitorsMonth: false,
    });

    void (async () => {
      try {
        const pack = await fetchPublicLandingContent();
        if (cancelled) return;

        setNews(pack.news);
        setEvents(pack.events);
        setDocuments(pack.documents);
        setLiveNow(pack.liveNow);
        setSermons(pack.sermons);
        setGalleryItems(pack.gallery);
        setProjects(pack.projects);
        setVideos(pack.videos);
        setAudios(pack.audios);
        setPublicLeaders(pack.leaders);

        const publicCountsPack = pack.counts;
        const countsErr = publicCountsPack.error;

        if (countsErr) {
          if (hasPermissionOrRlsError(countsErr)) {
            setPublicLoadError("Baadhi ya takwimu hazijaonyeshwa — RLS au muunganisho.");
          } else if (hasUnauthorizedError(countsErr)) {
            setPublicLoadError("Muunganisho wa mfumo si thabiti (angalia variable za Supabase kwenye seva).");
          } else if (hasMigrationNotReadyError(countsErr)) {
            setPublicLoadError("Seva ya data haijakamilisha migrations zinazohitajika.");
          } else {
            setPublicLoadError(`${HAIJAPATIKANA_DATA_SW}: taarifa za umma hazijapakuliwa. Jaribu tena.`);
          }
        } else {
          setPublicLoadError("");
        }
        const countsRow = publicCountsPack.counts;
        const attendanceRpcOk = publicCountsPack.attendanceColumnsFromRpc;
        const majimboActiveRpcOk = publicCountsPack.majimboActiveColumnFromRpc;
        if (!cancelled) setMajimboActiveColumnFromRpc(majimboActiveRpcOk);
        const countOrNull = (key: keyof PublicCounts) => {
          if (countsErr || !countsRow) return null;
          const attendanceStale =
            !attendanceRpcOk &&
            (key === "attendanceSessionsToday" || key === "attendanceSessionsMonth" || key === "attendanceVisitorsMonth");
          if (attendanceStale) return null;
          if (key === "majimboActive" && !majimboActiveRpcOk) return null;
          return parsePublicCount(countsRow[key]);
        };

        setStats({
          dayosisi: countOrNull("dayosisi"),
          majimbo: countOrNull("majimbo"),
          majimboActive: countOrNull("majimboActive"),
          matawi: countOrNull("matawi"),
          matawiActive: countOrNull("matawiActive"),
          matawiPending: countOrNull("matawiPending"),
          matawiRegistryVerified: countOrNull("matawiRegistryVerified"),
          matawiRegistryPendingReview: countOrNull("matawiRegistryPendingReview"),
          waumini: countOrNull("waumini"),
          viongozi: countOrNull("viongozi"),
          nyaraka: countOrNull("nyaraka"),
          matukio: countOrNull("matukio"),
          attendanceSessionsToday: countOrNull("attendanceSessionsToday"),
          attendanceSessionsMonth: countOrNull("attendanceSessionsMonth"),
          attendanceVisitorsMonth: countOrNull("attendanceVisitorsMonth"),
        });
        setStatQueryFailed({
          dayosisi: !!countsErr,
          majimbo: !!countsErr,
          majimboActive: !!countsErr || (!!countsRow && !majimboActiveRpcOk),
          matawi: !!countsErr,
          matawiActive: !!countsErr,
          matawiPending: !!countsErr,
          matawiRegistryVerified: !!countsErr,
          matawiRegistryPendingReview: !!countsErr,
          waumini: !!countsErr,
          viongozi: !!countsErr,
          nyaraka: !!countsErr,
          matukio: !!countsErr,
          attendanceSessionsToday: !!countsErr || (!!countsRow && !attendanceRpcOk),
          attendanceSessionsMonth: !!countsErr || (!!countsRow && !attendanceRpcOk),
          attendanceVisitorsMonth: !!countsErr || (!!countsRow && !attendanceRpcOk),
        });
        if (!cancelled) {
          setPublicLiveAt(new Date().toISOString());
          setProjectsActiveCount(
            typeof countsRow?.projectsActive === "number" ? countsRow.projectsActive : null,
          );
          if (!didNotifyPublicLoad.current) {
            didNotifyPublicLoad.current = true;
            pushNotice({
              title: "Taarifa za umma",
              level: "success",
              message: `Imepakiwa: ${pack.news.length} habari · ${pack.events.length} matukio · ${pack.gallery.length} picha · ${pack.projects.length} miradi.`,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setPublicLoadError("Imeshindikana kuunganisha na seva ya data.");
          setStats({
            dayosisi: null,
            majimbo: null,
            majimboActive: null,
            matawi: null,
            matawiActive: null,
            matawiPending: null,
            matawiRegistryVerified: null,
            matawiRegistryPendingReview: null,
            waumini: null,
            viongozi: null,
            nyaraka: null,
            matukio: null,
            attendanceSessionsToday: null,
            attendanceSessionsMonth: null,
            attendanceVisitorsMonth: null,
          });
          setStatQueryFailed({
            dayosisi: true,
            majimbo: true,
            majimboActive: true,
            matawi: true,
            matawiActive: true,
            matawiPending: true,
            matawiRegistryVerified: true,
            matawiRegistryPendingReview: true,
            waumini: true,
            viongozi: true,
            nyaraka: true,
            matukio: true,
            attendanceSessionsToday: true,
            attendanceSessionsMonth: true,
            attendanceVisitorsMonth: true,
          });
        }
      } finally {
        if (!cancelled) {
          setPublicStatsLoading(false);
          setPublicContentLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseReady, pushNotice]);

  const refreshPublicKpiStrip = useCallback(async () => {
    const client = getSupabase();
    if (!client || !supabaseReady) return;
    try {
      const { counts, error, attendanceColumnsFromRpc, majimboActiveColumnFromRpc } =
        await fetchPortalPublicDashboardCountsCached();
      if (error) {
        setStatQueryFailed({
          dayosisi: true,
          majimbo: true,
          majimboActive: true,
          matawi: true,
          matawiActive: true,
          matawiPending: true,
          matawiRegistryVerified: true,
          matawiRegistryPendingReview: true,
          waumini: true,
          viongozi: true,
          nyaraka: true,
          matukio: true,
          attendanceSessionsToday: true,
          attendanceSessionsMonth: true,
          attendanceVisitorsMonth: true,
        });
        return;
      }
      if (!counts) return;
      const attOk = attendanceColumnsFromRpc;
      setMajimboActiveColumnFromRpc(majimboActiveColumnFromRpc);
      setStatQueryFailed({
        dayosisi: false,
        majimbo: false,
        majimboActive: false,
        matawi: false,
        matawiActive: false,
        matawiPending: false,
        matawiRegistryVerified: false,
        matawiRegistryPendingReview: false,
        waumini: false,
        viongozi: false,
        nyaraka: false,
        matukio: false,
        attendanceSessionsToday: !attOk,
        attendanceSessionsMonth: !attOk,
        attendanceVisitorsMonth: !attOk,
      });
      setStats((p) => ({
        ...p,
        dayosisi: counts.dayosisi,
        majimbo: counts.majimbo,
        majimboActive: majimboActiveColumnFromRpc ? counts.majimboActive : null,
        matawi: counts.matawi,
        matawiActive: counts.matawiActive,
        matawiPending: counts.matawiPending,
        matawiRegistryVerified: counts.matawiRegistryVerified,
        matawiRegistryPendingReview: counts.matawiRegistryPendingReview,
        waumini: counts.waumini,
        viongozi: counts.viongozi,
        nyaraka: counts.nyaraka,
        matukio: counts.matukio,
        attendanceSessionsToday: attOk ? counts.attendanceSessionsToday : null,
        attendanceSessionsMonth: attOk ? counts.attendanceSessionsMonth : null,
        attendanceVisitorsMonth: attOk ? counts.attendanceVisitorsMonth : null,
      }));
      setPublicLiveAt(new Date().toISOString());
      const now = Date.now();
      if (now - lastKpiNoticeAt.current > 45_000) {
        lastKpiNoticeAt.current = now;
        pushNotice({
          title: "KPI hai",
          level: "info",
          message: "Takwimu za umma zimesasishwa kutoka Supabase.",
        });
      }
    } catch {
      /* polling / realtime — jaribu tena baadaye */
    }
  }, [supabaseReady, pushNotice]);

  useEffect(() => {
    if (!supabaseReady) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshPublicKpiStrip();
    }, 50_000);
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshPublicKpiStrip();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [supabaseReady, refreshPublicKpiStrip]);

  useEffect(() => {
    const client = getSupabase();
    if (!client || !supabaseReady || !isSupabaseRealtimeEnabled()) return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        t = null;
        if (!cancelled) void refreshPublicKpiStrip();
      }, 650);
    };
    const channel = client
      .channel("portal-public-kpi-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "dayosisi" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_jimbo" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_tawi" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_members" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_viongozi" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_sessions" }, schedule)
      .subscribe();
    return () => {
      cancelled = true;
      if (t) window.clearTimeout(t);
      void client.removeChannel(channel);
    };
  }, [supabaseReady, refreshPublicKpiStrip]);

  const scrollToLoginCard = useCallback(() => {
    window.requestAnimationFrame(() => {
      document.getElementById("login-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const onModuleGate = useCallback(
    (title: string) => {
      pushNotice({
        title: "Ulinzi wa moduli",
        level: "info",
        message: `“${title}” — tafadhali ingia ili kufungua kipengele hiki.`,
      });
      scrollToLoginCard();
    },
    [pushNotice, scrollToLoginCard],
  );

  const theme = {
    primary: normalizeHexColor(branding.colors.primary, "#0B1F3A"),
    secondary: normalizeHexColor(branding.colors.secondary, "#123C69"),
    accent: normalizeHexColor(branding.colors.accent, "#D4AF37"),
  };

  const matawiHubMetrics: Array<{ key: keyof PublicCounts; label: string; hint: string }> = [
    { key: "matawi", label: "Jumla matawi / vituo", hint: "Msingi wa mradi" },
    { key: "matawiActive", label: "Zinazoendesha (active)", hint: "Operesheni hai" },
    { key: "matawiPending", label: "Usajili pending (status)", hint: "Hali ya operesheni = pending" },
    { key: "matawiRegistryPendingReview", label: "Sajili inasubiri uhakiki", hint: "verification_status = pending_review" },
    { key: "matawiRegistryVerified", label: "Sajili imethibitishwa", hint: "Uhakiki wa sajili" },
  ];

  const structureStatRows: Array<{ key: keyof PublicCounts; label: string }> = [
    { key: "dayosisi", label: "Dayosisi" },
    { key: "majimbo", label: "Majimbo" },
    { key: "waumini", label: "Waumini" },
    { key: "viongozi", label: "Viongozi" },
    { key: "nyaraka", label: "Nyaraka" },
    { key: "matukio", label: "Matukio" },
    { key: "attendanceSessionsToday", label: "Mahudhurio — leo" },
    { key: "attendanceSessionsMonth", label: "Mahudhurio — mwezi" },
    { key: "attendanceVisitorsMonth", label: "Wageni (mwezi)" },
  ];

  const wauminiPerTawi =
    typeof stats.matawi === "number" &&
    stats.matawi > 0 &&
    typeof stats.waumini === "number" &&
    Number.isFinite(stats.waumini)
      ? (stats.waumini / stats.matawi).toLocaleString("sw-TZ", { maximumFractionDigits: 1 })
      : null;

  /** RPC ya umma ilirudi bila makosa lakini majibu hayana safu za mahudhurio — DB bado haijasasishwa. */
  const showAttendanceMigrationHint =
    !publicStatsLoading && statQueryFailed.attendanceSessionsToday && !statQueryFailed.dayosisi;

  const mergedGallery = useMemo(() => {
    const siteItems = parseSiteSettingsGalleryItems(site.gallery);
    const seen = new Set<string>();
    const out: PublicGalleryRow[] = [];
    for (const item of [...siteItems, ...galleryItems]) {
      const key = item.image_url.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out.slice(0, 16);
  }, [site.gallery, galleryItems]);

  return (
    <div className="login-premium font-kmkt-sans relative min-h-screen overflow-x-hidden bg-[#030712] text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(212,175,55,0.12),transparent_50%),radial-gradient(ellipse_90%_60%_at_100%_50%,rgba(18,60,105,0.22),transparent_45%),radial-gradient(ellipse_80%_50%_at_0%_80%,rgba(11,31,58,0.45),transparent_50%)]"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" aria-hidden />
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a1628]/90 pt-[env(safe-area-inset-top)] shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex w-full min-w-0 max-w-[min(100%,96rem)] flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {branding.logo ? (
              <ResponsiveLazyImage
                src={branding.logo}
                alt={branding.shortName}
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-amber-400/30"
                width={40}
                height={40}
                priority
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-wide text-amber-300/95">{branding.shortName}</p>
              <p className="truncate text-xs text-slate-400">{branding.officialName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <a href="#public-announcements" className="hidden rounded-lg border border-amber-400/45 bg-amber-600/20 px-2 py-1.5 text-xs font-semibold text-amber-50 sm:inline">
              Matangazo
            </a>
            <a href="#public-stats" className="rounded-lg border border-emerald-400/45 bg-emerald-600/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-50 shadow-sm transition duration-200 hover:bg-emerald-500/30 sm:text-sm">
              Takwimu
            </a>
            <a href="#public-gallery" className="hidden rounded-lg border border-violet-400/45 bg-violet-600/20 px-2 py-1.5 text-xs font-semibold text-violet-50 sm:inline">
              Gallery
            </a>
            <a href="#public-media" className="hidden rounded-lg border border-sky-400/45 bg-sky-600/20 px-2 py-1.5 text-xs font-semibold text-sky-50 sm:inline">
              Media
            </a>
            <a href="#national-leaders-title" className="hidden rounded-lg border border-rose-400/45 bg-rose-600/20 px-2 py-1.5 text-xs font-semibold text-rose-50 md:inline">
              Viongozi
            </a>
            <a
              href="/auth/signup-request"
              className="hidden rounded-lg border border-violet-400/45 bg-violet-600/20 px-2.5 py-1.5 text-xs font-semibold text-violet-50 shadow-sm transition duration-200 hover:bg-violet-500/30 sm:inline sm:text-sm"
            >
              Omba Akaunti
            </a>
            <button
              type="button"
              onClick={scrollToLoginCard}
              className="shrink-0 rounded-lg border border-amber-400/55 bg-gradient-to-r from-amber-400/95 to-amber-200/90 px-4 py-2 text-sm font-semibold text-[#0a1628] shadow-md shadow-amber-900/25 transition duration-200 hover:brightness-105 active:scale-[0.98]"
            >
              Ingia
            </button>
          </div>
        </div>
      </nav>

      <MaintenanceBanner site={site} />

      <section className="relative z-10 overflow-hidden">
        {!heroMissing ? (
          <ResponsiveLazyImage
            src={hero.src}
            alt="Mwonekano wa imani na ibada"
            className="block h-[clamp(240px,48vh,680px)] min-h-[220px] w-full object-cover transition-opacity duration-700 lg:h-[min(72vh,680px)]"
            width={1920}
            height={1080}
            priority
            onError={() => {
              setHero((p) => {
                const variants = HERO_IMAGE_CANDIDATES[p.idx];
                const nextVariant = p.variant + 1;
                if (nextVariant < variants.length) {
                  return { ...p, variant: nextVariant, src: variants[nextVariant] };
                }
                const fallbackHit = FALLBACK_HERO_CANDIDATES.find((src) => src === p.src);
                if (fallbackHit) {
                  setHeroMissing(true);
                  return p;
                }
                return { ...p, src: FALLBACK_HERO_CANDIDATES[0] };
              });
            }}
          />
        ) : (
          <div className="grid h-[clamp(220px,42vh,520px)] min-h-[200px] w-full place-items-center bg-gradient-to-br from-[#050a14] via-[#0B1F3A] to-[#123C69] md:h-[520px]">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center text-white backdrop-blur-md">
              <p className="font-kmkt-display text-lg font-bold">Picha haijapakiwa bado</p>
              <p className="mt-1 text-sm text-slate-200">Pakia faili kwenye `src/assets/images/hero`, `faith`, na `branding`.</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/95 via-[#0B1F3A]/88 to-[#123C69]/75" />

        <div className="absolute inset-0 z-10 mx-auto grid max-h-full w-full max-w-[min(100%,96rem)] items-start gap-6 overflow-y-auto overscroll-y-contain px-4 py-6 [-webkit-overflow-scrolling:touch] sm:items-center sm:py-8 lg:grid-cols-[1.15fr_0.85fr] lg:overflow-visible lg:min-h-[min(72vh,680px)] lg:py-10">
          <div className="animate-kmkt-fade-up text-white [animation-delay:40ms]">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-300/95">KANISA LA MENNONITE LA KIINJILI TANZANIA</p>
            <h1 className="font-kmkt-display mt-3 text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl md:leading-[1.15]">
              {branding.officialName || "KMK(T) TANZANIA PORTAL"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-200/95 md:text-base">{branding.motto || "Mfumo Mkuu wa Kidigitali wa Kanisa la Mennonite la Kiinjili Tanzania"}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#modules-overview"
                className="rounded-xl border border-amber-400/50 bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-[#0a1628] shadow-lg shadow-black/25 transition hover:brightness-105"
                style={{ backgroundImage: `linear-gradient(90deg, ${theme.accent}, #f5e6b8)` }}
              >
                Tazama Vipengele
              </a>
              <a
                href="/auth/signup-request"
                className="rounded-xl border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                Omba Akaunti
              </a>
            </div>

            <div className="mt-5 flex items-center gap-2" aria-label="Hero carousel indicators">
              {HERO_IMAGE_CANDIDATES.map((_, i) => (
                <button
                  key={`hero-dot-${i}`}
                  type="button"
                  onClick={() => setHero({ idx: i, variant: 0, src: HERO_IMAGE_CANDIDATES[i][0] })}
                  className={`h-2.5 w-2.5 rounded-full border transition ${i === hero.idx ? "border-amber-400 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]" : "border-white/60 bg-white/30 hover:bg-white/45"}`}
                  aria-label={`Onyesha picha ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div
            id="login-form"
            className="animate-kmkt-fade-up max-h-[min(92dvh,calc(100dvh-8rem))] w-full overflow-y-auto rounded-2xl border border-amber-400/45 bg-white/[0.97] p-4 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl [animation-delay:120ms] sm:max-h-none sm:overflow-visible sm:p-6"
          >
            {branding.logo && !logoBroken ? (
              <ResponsiveLazyImage
                src={branding.logo}
                alt={branding.shortName}
                className="mx-auto mb-3 h-16 w-16 rounded-full object-cover ring-2 ring-[#D4AF37]/35"
                width={128}
                height={128}
                priority
                onError={() => setLogoBroken(true)}
              />
            ) : (
              <>
                {!logoBroken ? (
                  <ResponsiveLazyImage
                    src={LOCAL_LOGO_CANDIDATES[logoVariant]}
                    alt={branding.shortName}
                    className="mx-auto mb-3 h-16 w-16 rounded-full object-cover ring-2 ring-[#D4AF37]/35"
                    width={128}
                    height={128}
                    priority
                    onError={() => {
                      if (logoVariant < LOCAL_LOGO_CANDIDATES.length - 1) setLogoVariant((v) => v + 1);
                      else setLogoBroken(true);
                    }}
                  />
                ) : (
                  <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-[#0B1F3A] text-lg font-bold text-[#D4AF37]">
                    {branding.shortName.slice(0, 4).toUpperCase()}
                  </div>
                )}
              </>
            )}
            <h2 className="font-kmkt-display text-center text-xl font-bold tracking-tight text-[#0a1628]">Ingia kwenye KMK(T) Portal</h2>
            <p className="mt-1 text-center text-xs text-slate-600">Mfumo Mkuu wa Kidigitali wa Kanisa la Mennonite la Kiinjili Tanzania</p>

            <div className="mt-5">
              <LoginAuthCard theme={theme} />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8">
        <div className="animate-kmkt-fade-up mb-5 text-center [animation-delay:60ms] md:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">Takwimu za umma</p>
          <h3 className="font-kmkt-display mt-1 text-xl font-bold text-white md:text-2xl">Muhtasari wa taasisi (live)</h3>
          <p className="mt-1 text-sm text-slate-400">Nambari zinatoka Supabase pekee; hazijazuliwa.</p>
        </div>

        <div
          className="animate-kmkt-fade-up mb-6 rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#0B1F3A]/95 via-[#123C69]/90 to-emerald-950/80 p-4 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-5"
          style={{ animationDelay: "72ms" }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-400/45 bg-amber-400/15 text-amber-200 shadow-inner">
                <Building2 className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">Matawi ndiyo mama wa mradi</p>
                <h4 className="font-kmkt-display mt-1 text-lg font-bold text-white sm:text-xl">Kituo cha uhai wa kanisa</h4>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-200/95 sm:text-sm">
                  Kila tawi na kituo ndicho kiini cha huduma, waumini na ripoti. Hapa chini kuna mgawanyo halisi wa hali za matawi — kisha muundo mzima wa KMK(T).
                </p>
              </div>
            </div>
            {wauminiPerTawi ? (
              <div className="shrink-0 cursor-default rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur-sm md:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">Wastani wa waumini kwa tawi</p>
                <p className="mt-0.5 font-kmkt-display text-2xl font-black tabular-nums text-amber-100">{wauminiPerTawi}</p>
              </div>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {matawiHubMetrics.map(({ key, label, hint }, i) => (
              <article
                key={key}
                style={{ animationDelay: `${90 + i * 40}ms` }}
                className={`animate-kmkt-fade-up ${PUBLIC_STATIC_KPI_CARD} border-amber-300/25 bg-gradient-to-br ${KPI_CARD_STYLES[i % KPI_CARD_STYLES.length]}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-200/95">{label}</p>
                <p
                  className={`mt-1 font-bold text-white ${statQueryFailed[key] ? "text-[10px] leading-snug md:text-xs" : "text-xl md:text-2xl"}`}
                  title={statQueryFailed[key] ? HAIJAPATIKANA_DATA_SW : undefined}
                >
                  {formatStatCount(stats[key], publicStatsLoading, statQueryFailed[key])}
                </p>
                <p className="mt-1 text-[10px] font-medium text-slate-300/90">{hint}</p>
              </article>
            ))}
          </div>
        </div>

        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:text-left">Muundo mzima</p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {structureStatRows.map(({ key, label }, i) => (
            <article
              key={key}
              style={{ animationDelay: `${120 + i * 35}ms` }}
              className={`animate-kmkt-fade-up ${PUBLIC_STATIC_KPI_CARD} ${KPI_CARD_STYLES[(i + 3) % KPI_CARD_STYLES.length]}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/95">{label}</p>
              <p
                className={`mt-1 font-bold text-white ${statQueryFailed[key] ? "text-[10px] leading-snug md:text-xs" : "text-lg md:text-xl"}`}
                title={statQueryFailed[key] ? HAIJAPATIKANA_DATA_SW : undefined}
              >
                {formatStatCount(stats[key], publicStatsLoading, statQueryFailed[key])}
              </p>
            </article>
          ))}
        </div>
        {showAttendanceMigrationHint ? (
          <p
            className="mt-4 rounded-xl border border-sky-400/25 bg-sky-950/35 px-3 py-2 text-xs leading-relaxed text-sky-100/95 backdrop-blur-sm md:text-left"
            role="status"
          >
            Takwimu za mahudhurio (vikao na wageni) hazionyeshwi kwa sababu database bado inatumia toleo la zamani la
            portal_public_dashboard_counts lisilo na hesabu hizo. Mipangilio mingine ya KPI bado halali; pakia migration
            inayosasisha kazi hiyo kwenye Supabase.
          </p>
        ) : null}
        {publicLoadError ? (
          <p className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100 backdrop-blur-sm">{publicLoadError}</p>
        ) : null}
      </section>

      <PublicLandingAnnouncementsBand news={news} loading={publicContentLoading} />

      <PublicExecutiveKpiStrip />

      <PublicBranchEngineLiveKpis />

      <PublicLandingGallerySection items={mergedGallery} loading={publicContentLoading} />

      <NationalLeadershipShowcase leaders={publicLeaders.length > 0 ? publicLeaders : undefined} />

      <PublicLandingProjectsSection
        projects={projects}
        projectsActiveCount={projectsActiveCount}
        loading={publicContentLoading}
      />

      <PublicLandingEnterpriseStrip
        stats={{
          dayosisi: stats.dayosisi,
          majimbo: stats.majimbo,
          majimboActive: stats.majimboActive,
          showMajimboActive: majimboActiveColumnFromRpc,
          matawi: stats.matawi,
          waumini: stats.waumini,
          loading: publicStatsLoading,
        }}
        liveAt={publicLiveAt}
      />

      <PublicLandingModulesSection modules={MODULE_CARDS} onModuleGate={onModuleGate} />

      <PublicLandingContentHub
        news={news}
        events={events}
        documents={documents}
        liveNow={liveNow}
        sermons={sermons}
        loading={publicContentLoading}
        hideMedia
      />

      <PublicLandingMediaCenter
        liveNow={liveNow}
        videos={videos}
        audios={audios}
        sermons={sermons}
        loading={publicContentLoading}
      />

      <PublicLandingSecurityHub />

      <PublicLandingFaithFooter />

      <PublicLandingNoticeHost notices={notices} onDismiss={dismissNotice} />

      <footer className="relative z-10 border-t border-white/10 bg-[#050a14]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold text-white">{branding.officialName}</p>
          <p className="text-slate-400">{branding.footer}</p>
          <p className="text-slate-500">© {new Date().getFullYear()} KMK(T) Tanzania</p>
        </div>
      </footer>
    </div>
  );
}

