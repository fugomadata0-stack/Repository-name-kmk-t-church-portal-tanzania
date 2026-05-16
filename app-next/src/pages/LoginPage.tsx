import { useCallback, useEffect, useState } from "react";
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
import { fetchPortalPublicDashboardCounts } from "../services/portalPublicDashboardService";
import { fetchMasterSettingsOptional, readMasterSettingsCache } from "../services/masterSettingsService";
import { fetchChurchIdentityOptional } from "../services/settingsTablesService";
import { ResponsiveLazyImage } from "../components/common/ResponsiveLazyImage";

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

const MODULE_CARD_ACCENT = [
  "from-amber-500/90 to-amber-700/90",
  "from-sky-500/90 to-indigo-700/90",
  "from-emerald-500/90 to-teal-800/90",
  "from-violet-500/90 to-purple-800/90",
  "from-rose-500/90 to-pink-900/90",
  "from-cyan-500/90 to-blue-900/90",
  "from-orange-500/90 to-amber-900/90",
  "from-fuchsia-500/90 to-purple-900/90",
  "from-lime-500/90 to-green-900/90",
  "from-red-500/90 to-rose-950/90",
  "from-teal-500/90 to-cyan-950/90",
  "from-indigo-500/90 to-slate-900/90",
  "from-yellow-500/90 to-amber-950/90",
  "from-stone-400/90 to-stone-800/90",
] as const;

const SECURITY_BULLETS = [
  "Ruhusa za mfumo zinadhibitiwa kwa ngazi (Roles & Permissions).",
  "Audit Trail inarekodi mabadiliko muhimu kwa uwajibikaji.",
  "Data za umma zinaoneshwa kwa sera za Supabase na RLS.",
] as const;

function formatDateSafe(v: string | null | undefined): string {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("sw-TZ");
}

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
  const { signInWithEmailPassword, authBusy, supabaseReady } = usePortal();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const [hero, setHero] = useState<HeroState>({ src: HERO_IMAGE_CANDIDATES[0][0], idx: 0, variant: 0 });
  const [heroMissing, setHeroMissing] = useState(false);
  const [publicLoadError, setPublicLoadError] = useState("");
  const [publicStatsLoading, setPublicStatsLoading] = useState(true);

  const [news, setNews] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; event_date: string; location: string }>>([]);
  const [documents, setDocuments] = useState<Array<{ id: string; title: string; category: string; created_at: string }>>([]);
  const [liveNow, setLiveNow] = useState<Array<{ id: string; title: string; stream_url: string }>>([]);
  const [sermons, setSermons] = useState<Array<{ id: string; title: string; preacher: string; date: string }>>([]);
  const [logoBroken, setLogoBroken] = useState(false);
  const [logoVariant, setLogoVariant] = useState(0);

  const [stats, setStats] = useState<PublicCounts>({
    dayosisi: null,
    majimbo: null,
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

  const [moduleGateMsg, setModuleGateMsg] = useState("");

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
    const c = getSupabase();
    if (!c || !supabaseReady) {
      setPublicStatsLoading(false);
      return;
    }

    let cancelled = false;
    setPublicStatsLoading(true);
    setPublicLoadError("");
    setStatQueryFailed({
      dayosisi: false,
      majimbo: false,
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
        const [
          newsRes,
          eventsRes,
          docsRes,
          liveRes,
          sermonsRes,
          publicCountsPack,
        ] = await Promise.all([
          c.from("news_posts").select("id,title,created_at").eq("status", "published").eq("is_public", true).order("created_at", { ascending: false }).limit(4),
          c.from("events").select("id,title,event_date,location").eq("is_public", true).in("status", ["upcoming", "ongoing"]).order("event_date", { ascending: true }).limit(4),
          c.from("documents").select("id,title,category,created_at").order("created_at", { ascending: false }).limit(4),
          c.from("live_streams").select("id,title,stream_url").eq("is_public", true).eq("is_live", true).limit(1),
          c.from("sermons").select("id,title,preacher,date").order("date", { ascending: false }).limit(4),
          fetchPortalPublicDashboardCounts(),
        ]);

        if (cancelled) return;

        const listErrors = [
          newsRes.error,
          eventsRes.error,
          docsRes.error,
          liveRes.error,
          sermonsRes.error,
          publicCountsPack.error,
        ].filter(Boolean);

        if (listErrors.length > 0) {
          if (listErrors.some((e) => hasPermissionOrRlsError(e))) {
            setPublicLoadError(
              listErrors.length === 6
                ? "Data ya umma haipatikani kwa sasa — sera za usalama (RLS) au mwongozo wa mwandishi wa DB."
                : "Baadhi ya takwimu au orodha hazijaonyeshwa — RLS au muunganisho."
            );
          } else if (listErrors.some((e) => hasUnauthorizedError(e))) {
            setPublicLoadError("Muunganisho wa mfumo si thabiti (angalia variable za Supabase kwenye seva).");
          } else if (listErrors.some((e) => hasMigrationNotReadyError(e))) {
            setPublicLoadError("Seva ya data haijakamilisha migrations zinazohitajika.");
          } else {
            setPublicLoadError(`${HAIJAPATIKANA_DATA_SW}: taarifa za umma hazijapakuliwa. Jaribu tena.`);
          }
        } else {
          setPublicLoadError("");
        }

        setNews(((newsRes.error ? [] : newsRes.data) ?? []) as Array<{ id: string; title: string; created_at: string }>);
        setEvents(((eventsRes.error ? [] : eventsRes.data) ?? []) as Array<{ id: string; title: string; event_date: string; location: string }>);
        setDocuments(((docsRes.error ? [] : docsRes.data) ?? []) as Array<{ id: string; title: string; category: string; created_at: string }>);
        setLiveNow(((liveRes.error ? [] : liveRes.data) ?? []) as Array<{ id: string; title: string; stream_url: string }>);
        setSermons(((sermonsRes.error ? [] : sermonsRes.data) ?? []) as Array<{ id: string; title: string; preacher: string; date: string }>);

        const countsErr = publicCountsPack.error;
        const countsRow = publicCountsPack.counts;
        const attendanceRpcOk = publicCountsPack.attendanceColumnsFromRpc;
        const countOrNull = (key: keyof PublicCounts) => {
          if (countsErr || !countsRow) return null;
          const attendanceStale =
            !attendanceRpcOk &&
            (key === "attendanceSessionsToday" || key === "attendanceSessionsMonth" || key === "attendanceVisitorsMonth");
          if (attendanceStale) return null;
          return parsePublicCount(countsRow[key]);
        };

        setStats({
          dayosisi: countOrNull("dayosisi"),
          majimbo: countOrNull("majimbo"),
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
      } catch {
        if (!cancelled) {
          setPublicLoadError("Imeshindikana kuunganisha na seva ya data.");
          setStats({
            dayosisi: null,
            majimbo: null,
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
        if (!cancelled) setPublicStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseReady]);

  const refreshPublicKpiStrip = useCallback(async () => {
    const client = getSupabase();
    if (!client || !supabaseReady) return;
    try {
      const { counts, error, attendanceColumnsFromRpc } = await fetchPortalPublicDashboardCounts();
      if (error) {
        setStatQueryFailed({
          dayosisi: true,
          majimbo: true,
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
      setStatQueryFailed({
        dayosisi: false,
        majimbo: false,
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
    } catch {
      /* polling / realtime — jaribu tena baadaye */
    }
  }, [supabaseReady]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");
    const em = email.trim();
    if (!em || !password) {
      setLocalError("Ingiza barua pepe na nenosiri.");
      return;
    }
    const err = await signInWithEmailPassword(em, password);
    if (err) setLocalError(err);
  }

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
    { key: "attendanceSessionsToday", label: "Mahudhurio — vikao leo" },
    { key: "attendanceSessionsMonth", label: "Mahudhurio — vikao (mwezi)" },
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

  return (
    <div className="login-premium font-kmkt-sans relative min-h-screen overflow-x-hidden bg-[#030712] text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(212,175,55,0.12),transparent_50%),radial-gradient(ellipse_90%_60%_at_100%_50%,rgba(18,60,105,0.22),transparent_45%),radial-gradient(ellipse_80%_50%_at_0%_80%,rgba(11,31,58,0.45),transparent_50%)]"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" aria-hidden />
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0a1628]/85 pt-[env(safe-area-inset-top)] shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {branding.logo ? (
              <ResponsiveLazyImage
                src={branding.logo}
                alt={branding.shortName}

                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-amber-400/30"
                width={40}
                height={40}
                loading="eager"
                fetchpriority="high"
                decoding="async"

              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-wide text-amber-300/95">{branding.shortName}</p>
              <p className="truncate text-xs text-slate-400">{branding.officialName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToLoginCard}
            className="shrink-0 rounded-xl border border-amber-400/40 bg-gradient-to-r px-4 py-2 text-sm font-semibold text-[#0a1628] shadow-md shadow-amber-900/20 transition hover:brightness-105"
            style={{ backgroundImage: `linear-gradient(90deg, ${theme.accent}, #f0d78c)` }}
          >
            Ingia
          </button>
        </div>
      </nav>

      <section className="relative z-10 overflow-hidden">
        {!heroMissing ? (
          <ResponsiveLazyImage
            src={hero.src}
            alt="Mwonekano wa imani na ibada"

            className="block h-[clamp(220px,42vh,520px)] min-h-[200px] w-full object-cover transition-opacity duration-700 md:h-[520px]"

            loading="eager"
            fetchpriority="high"
            decoding="async"
            width={1920}
            height={1080}

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

        <div className="absolute inset-0 z-10 mx-auto grid max-h-full w-full max-w-7xl items-start gap-6 overflow-y-auto overscroll-y-contain px-4 py-6 [-webkit-overflow-scrolling:touch] sm:items-center sm:py-8 lg:grid-cols-[1.15fr_0.85fr] lg:overflow-visible lg:py-8">
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
                loading="eager"
                fetchpriority="high"
                decoding="async"
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
                    loading="eager"
                    fetchpriority="high"
                    decoding="async"
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

            <form className="mt-5 space-y-3" onSubmit={onSubmit}>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Barua pepe
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-inner shadow-slate-200/60 focus:border-[#123C69] focus:outline-none focus:ring-2 focus:ring-[#123C69]/35"
                  placeholder=""
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Nenosiri
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-inner shadow-slate-200/60 focus:border-[#123C69] focus:outline-none focus:ring-2 focus:ring-[#123C69]/35"
                />
              </label>

              {localError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{localError}</p> : null}
              {!supabaseReady ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Imeshindikana kuwasiliana na seva ya mfumo.</p> : null}

              <button
                type="submit"
                disabled={authBusy || !supabaseReady}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})` }}
              >
                {authBusy ? "Inaingia..." : "Ingia"}
              </button>

              <div className="flex items-center justify-between gap-2 text-xs">
                <a className="font-semibold text-[#0B1F3A] underline decoration-[#D4AF37]/70" href="/auth/signup-request">
                  Omba Akaunti
                </a>
                <a className="font-medium text-slate-600 underline" href="mailto:support@kmkt.or.tz?subject=KMKT%20Password%20Reset">
                  Umesahau nenosiri?
                </a>
              </div>
            </form>
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
              <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur-sm md:text-right">
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
                className={`animate-kmkt-fade-up rounded-2xl border border-amber-300/25 bg-gradient-to-br p-3 text-center shadow-lg backdrop-blur-md ${KPI_CARD_STYLES[i % KPI_CARD_STYLES.length]}`}
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
              className={`animate-kmkt-fade-up rounded-2xl border p-3 text-center shadow-lg backdrop-blur-md ${KPI_CARD_STYLES[(i + 3) % KPI_CARD_STYLES.length]}`}
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

      <section id="modules-overview" className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8">
        <div className="animate-kmkt-fade-up">
          <h3 className="font-kmkt-display text-xl font-bold text-white md:text-2xl">Vipengele vya mfumo</h3>
          <p className="mt-1 text-sm text-slate-400">Vinjari maktaba ya moduli kabla ya kuingia — huna ruhusa ya ndani bila akaunti.</p>
        </div>
        {moduleGateMsg ? (
          <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-sm text-amber-50 backdrop-blur-sm" role="status">
            {moduleGateMsg}
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MODULE_CARDS.map((m, idx) => {
            const Icon = m.icon;
            const accent = MODULE_CARD_ACCENT[idx % MODULE_CARD_ACCENT.length];
            return (
              <button
                key={m.title}
                type="button"
                onClick={() => {
                  setModuleGateMsg("Tafadhali ingia ili kufungua kipengele hiki.");
                  scrollToLoginCard();
                }}
                style={{ animationDelay: `${100 + idx * 35}ms` }}
                className="login-premium-module group animate-kmkt-fade-up w-full rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-left shadow-lg shadow-black/30 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-amber-400/45 hover:bg-white/[0.09] hover:shadow-xl hover:shadow-amber-950/40"
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl bg-gradient-to-br p-2 text-white shadow-inner ${accent}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{m.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{m.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-4 px-4 pb-8 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-lg shadow-black/25 backdrop-blur-md">
          <h4 className="font-kmkt-display text-lg font-bold text-white">Habari Mpya</h4>
          <div className="mt-3 space-y-2">
            {news.length === 0 ? (
              <p className="text-sm text-slate-400">Hakuna taarifa bado</p>
            ) : (
              news.map((n) => (
                <div key={n.id} className="rounded-lg border border-white/10 bg-slate-950/40 p-2.5">
                  <p className="text-sm font-semibold text-slate-100">{n.title}</p>
                  <p className="text-xs text-slate-400">{formatDateSafe(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-lg shadow-black/25 backdrop-blur-md">
          <h4 className="font-kmkt-display text-lg font-bold text-white">Matukio Yajayo</h4>
          <div className="mt-3 space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">Hakuna taarifa bado</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-white/10 bg-slate-950/40 p-2.5">
                  <p className="text-sm font-semibold text-slate-100">{ev.title}</p>
                  <p className="text-xs text-slate-400">
                    {formatDateSafe(ev.event_date)} • {ev.location || "Eneo halijatajwa"}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-lg shadow-black/25 backdrop-blur-md">
          <h4 className="font-kmkt-display text-lg font-bold text-white">Nyaraka za Umma</h4>
          <div className="mt-3 space-y-2">
            {documents.length === 0 ? (
              <p className="text-sm text-slate-400">Hakuna taarifa bado</p>
            ) : (
              documents.map((d) => (
                <div key={d.id} className="rounded-lg border border-white/10 bg-slate-950/40 p-2.5">
                  <p className="text-sm font-semibold text-slate-100">{d.title}</p>
                  <p className="text-xs text-slate-400">
                    {d.category || "Nyingine"} • {formatDateSafe(d.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-lg shadow-black/25 backdrop-blur-md">
          <h4 className="font-kmkt-display text-lg font-bold text-white">Media Highlights & Livestream</h4>
          <div className="mt-3 space-y-2">
            {liveNow.length === 0 ? (
              <p className="text-sm text-slate-400">Hakuna livestream ya moja kwa moja kwa sasa</p>
            ) : (
              liveNow.map((lv) =>
                lv.stream_url ? (
                  <a
                    key={lv.id}
                    href={lv.stream_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-rose-400/35 bg-rose-500/10 p-2.5 backdrop-blur-sm"
                  >
                    <p className="text-sm font-semibold text-rose-100">LIVE • {lv.title}</p>
                  </a>
                ) : (
                  <div key={lv.id} className="rounded-lg border border-rose-400/35 bg-rose-500/10 p-2.5">
                    <p className="text-sm font-semibold text-rose-100">LIVE • {lv.title}</p>
                  </div>
                )
              )
            )}
            {sermons.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Hakuna taarifa bado</p>
            ) : (
              sermons.slice(0, 3).map((s) => (
                <div key={s.id} className="rounded-lg border border-white/10 bg-slate-950/40 p-2.5">
                  <p className="text-sm font-semibold text-slate-100">{s.title}</p>
                  <p className="text-xs text-slate-400">
                    {s.preacher || "Mhudumu"} • {formatDateSafe(s.date)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8">
        <article className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-lg shadow-black/25 backdrop-blur-md">
          <h4 className="font-kmkt-display text-lg font-bold text-white">Usalama, Roles & Permissions</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {SECURITY_BULLETS.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </article>
      </section>

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

