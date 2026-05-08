import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Building2,
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
import { getSupabase } from "../lib/supabaseClient";
import { fetchMasterSettingsOptional, readMasterSettingsCache } from "../services/masterSettingsService";

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
  waumini: number | null;
  viongozi: number | null;
  nyaraka: number | null;
  matukio: number | null;
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

function countLabel(v: number | null): string {
  if (typeof v === "number") return v.toLocaleString("sw-TZ");
  return "Hakuna taarifa bado";
}

function hasPermissionOrRlsError(e: unknown): boolean {
  const msg = String((e as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return msg.includes("permission denied") || msg.includes("42501") || msg.includes("rls");
}

function hasMigrationNotReadyError(e: unknown): boolean {
  const msg = String((e as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return msg.includes("schema cache") || msg.includes("does not exist") || msg.includes("could not find the table") || msg.includes("could not find the");
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
    waumini: null,
    viongozi: null,
    nyaraka: null,
    matukio: null,
  });

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
      const row = await fetchMasterSettingsOptional().catch(() => null);
      if (!row || cancelled) return;
      setBranding({
        officialName: row.identity.official_name || "KMK(T) TANZANIA PORTAL",
        shortName: row.identity.short_name || "KMK(T)",
        motto: row.identity.motto || "Kanisa la Mennonite la Kiinjili Tanzania",
        logo: row.theme.logo_url || "",
        footer: row.identity.system_footer || "Kanisa la Mennonite la Kiinjili Tanzania",
        colors: {
          primary: row.theme.primary_color || "#0B1F3A",
          secondary: row.theme.secondary_color || "#123C69",
          accent: row.theme.accent_color || "#D4AF37",
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
    if (!c || !supabaseReady) return;

    let cancelled = false;
    void (async () => {
      try {
        const [
          newsRes,
          eventsRes,
          docsRes,
          liveRes,
          sermonsRes,
          dayosisiCount,
          majimboCount,
          matawiCount,
          wauminiCount,
          viongoziCount,
          nyarakaCount,
          matukioCount,
        ] = await Promise.all([
          c.from("news_posts").select("id,title,created_at").eq("status", "published").eq("is_public", true).order("created_at", { ascending: false }).limit(4),
          c.from("events").select("id,title,event_date,location").eq("is_public", true).in("status", ["upcoming", "ongoing"]).order("event_date", { ascending: true }).limit(4),
          c.from("documents").select("id,title,category,created_at").order("created_at", { ascending: false }).limit(4),
          c.from("live_streams").select("id,title,stream_url").eq("is_public", true).eq("is_live", true).limit(1),
          c.from("sermons").select("id,title,preacher,date").order("date", { ascending: false }).limit(4),
          c.from("dayosisi").select("id", { count: "exact", head: true }),
          c.from("church_jimbo").select("id", { count: "exact", head: true }),
          c.from("church_tawi").select("id", { count: "exact", head: true }),
          c.from("church_members").select("id", { count: "exact", head: true }),
          c.from("church_viongozi").select("id", { count: "exact", head: true }),
          c.from("documents").select("id", { count: "exact", head: true }),
          c.from("events").select("id", { count: "exact", head: true }),
        ]);

        if (cancelled) return;

        if (
          newsRes.error ||
          eventsRes.error ||
          docsRes.error ||
          liveRes.error ||
          sermonsRes.error ||
          dayosisiCount.error ||
          majimboCount.error ||
          matawiCount.error ||
          wauminiCount.error ||
          viongoziCount.error ||
          nyarakaCount.error ||
          matukioCount.error
        ) {
          const allErrors = [
            newsRes.error,
            eventsRes.error,
            docsRes.error,
            liveRes.error,
            sermonsRes.error,
            dayosisiCount.error,
            majimboCount.error,
            matawiCount.error,
            wauminiCount.error,
            viongoziCount.error,
            nyarakaCount.error,
            matukioCount.error,
          ].filter(Boolean);
          if (allErrors.some(hasPermissionOrRlsError)) {
            setPublicLoadError("Baadhi ya data ya umma imefungwa na sera za usalama (RLS).");
          } else if (allErrors.some(hasMigrationNotReadyError)) {
            setPublicLoadError("Migration haijakamilika bado.");
          } else {
            setPublicLoadError("Imeshindikana kupakua taarifa za umma kwa sasa.");
          }
        } else {
          setPublicLoadError("");
        }
        setNews((newsRes.data ?? []) as Array<{ id: string; title: string; created_at: string }>);
        setEvents((eventsRes.data ?? []) as Array<{ id: string; title: string; event_date: string; location: string }>);
        setDocuments((docsRes.data ?? []) as Array<{ id: string; title: string; category: string; created_at: string }>);
        setLiveNow((liveRes.data ?? []) as Array<{ id: string; title: string; stream_url: string }>);
        setSermons((sermonsRes.data ?? []) as Array<{ id: string; title: string; preacher: string; date: string }>);
        setStats({
          dayosisi: dayosisiCount.count ?? null,
          majimbo: majimboCount.count ?? null,
          matawi: matawiCount.count ?? null,
          waumini: wauminiCount.count ?? null,
          viongozi: viongoziCount.count ?? null,
          nyaraka: nyarakaCount.count ?? null,
          matukio: matukioCount.count ?? null,
        });
      } catch {
        if (!cancelled) setPublicLoadError("Imeshindikana kupakua taarifa za umma kwa sasa.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseReady]);

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

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-slate-800">
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {branding.logo ? <img src={branding.logo} alt={branding.shortName} className="h-10 w-10 rounded-full object-cover" loading="lazy" /> : null}
            <div>
              <p className="text-sm font-extrabold tracking-wide" style={{ color: theme.primary }}>{branding.shortName}</p>
              <p className="text-xs text-slate-600">{branding.officialName}</p>
            </div>
          </div>
          <a href="#login-form" className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95" style={{ backgroundColor: theme.primary }}>
            Ingia
          </a>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        {!heroMissing ? (
          <img
            src={hero.src}
            alt="Mwonekano wa imani na ibada"
            loading="eager"
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
            decoding="async"
            className="h-[420px] w-full object-cover transition-opacity duration-700 md:h-[520px]"
          />
        ) : (
          <div className="grid h-[420px] w-full place-items-center bg-gradient-to-br from-[#0B1F3A] to-[#123C69] md:h-[520px]">
            <div className="rounded-2xl border border-white/30 bg-white/10 px-6 py-4 text-center text-white">
              <p className="text-lg font-bold">Picha haijapakiwa bado</p>
              <p className="text-sm text-slate-200">Pakia faili kwenye `src/assets/images/hero`, `faith`, na `branding`.</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F3A]/92 via-[#0B1F3A]/82 to-[#123C69]/70" />

        <div className="absolute inset-0 mx-auto grid w-full max-w-7xl items-center gap-6 px-4 py-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: theme.accent }}>KANISA LA MENNONITE LA KIINJILI TANZANIA</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">{branding.officialName || "KMK(T) TANZANIA PORTAL"}</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-100 md:text-base">{branding.motto || "Mfumo Mkuu wa Kidigitali wa Kanisa la Mennonite la Kiinjili Tanzania"}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#modules-overview" className="rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-95" style={{ backgroundColor: theme.accent, color: "#0B1F3A" }}>
                Tazama Vipengele
              </a>
              <a href="/auth/signup-request" className="rounded-xl border border-white/70 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white">
                Omba Akaunti
              </a>
            </div>

            <div className="mt-5 flex items-center gap-2" aria-label="Hero carousel indicators">
              {HERO_IMAGE_CANDIDATES.map((_, i) => (
                <button
                  key={`hero-dot-${i}`}
                  type="button"
                  onClick={() => setHero({ idx: i, variant: 0, src: HERO_IMAGE_CANDIDATES[i][0] })}
                  className={`h-2.5 w-2.5 rounded-full border ${i === hero.idx ? "bg-[#D4AF37] border-[#D4AF37]" : "bg-white/35 border-white/80"}`}
                  aria-label={`Onyesha picha ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div id="login-form" className="rounded-2xl border border-[#D4AF37]/70 bg-white/95 p-6 shadow-2xl backdrop-blur-sm">
            {branding.logo && !logoBroken ? (
              <img
                src={branding.logo}
                alt={branding.shortName}
                className="mx-auto mb-3 h-16 w-16 rounded-full object-cover ring-2 ring-[#D4AF37]/35"
                loading="lazy"
                decoding="async"
                onError={() => setLogoBroken(true)}
              />
            ) : (
              <>
                {!logoBroken ? (
                  <img
                    src={LOCAL_LOGO_CANDIDATES[logoVariant]}
                    alt={branding.shortName}
                    className="mx-auto mb-3 h-16 w-16 rounded-full object-cover ring-2 ring-[#D4AF37]/35"
                    loading="lazy"
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
            <h2 className="text-center text-xl font-extrabold text-[#0B1F3A]">INGIA KWENYE KMK(T) PORTAL</h2>
            <p className="mt-1 text-center text-xs text-slate-600">Mfumo Mkuu wa Kidigitali wa Kanisa la Mennonite la Kiinjili Tanzania</p>

            <form className="mt-5 space-y-3" onSubmit={onSubmit}>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Barua pepe
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm focus:border-[#123C69] focus:outline-none focus:ring-1 focus:ring-[#123C69]"
                  placeholder="jina@mfano.org"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Nenosiri
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm focus:border-[#123C69] focus:outline-none focus:ring-1 focus:ring-[#123C69]"
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

      <section className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {[
            ["Dayosisi", stats.dayosisi],
            ["Majimbo", stats.majimbo],
            ["Matawi/Vituo", stats.matawi],
            ["Waumini", stats.waumini],
            ["Viongozi", stats.viongozi],
            ["Nyaraka", stats.nyaraka],
            ["Matukio", stats.matukio],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
              <p className="text-xs font-semibold text-slate-600">{String(label)}</p>
              <p className="mt-1 text-sm font-bold text-[#0B1F3A]">{countLabel(value as number | null)}</p>
            </article>
          ))}
        </div>
        {publicLoadError ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{publicLoadError}</p> : null}
      </section>

      <section id="modules-overview" className="mx-auto w-full max-w-7xl px-4 pb-8">
        <h3 className="text-xl font-extrabold text-[#0B1F3A]">Vipengele vya Mfumo</h3>
        <p className="mt-1 text-sm text-slate-600">Muonekano wa moduli kuu ndani ya portal ya KMK(T).</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MODULE_CARDS.map((m) => {
            const Icon = m.icon;
            return (
              <article key={m.title} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/60 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl p-2 text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0B1F3A]">{m.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{m.desc}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-8 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-lg font-bold text-[#0B1F3A]">Habari Mpya</h4>
          <div className="mt-3 space-y-2">
            {news.length === 0 ? <p className="text-sm text-slate-600">Hakuna taarifa bado.</p> : news.map((n) => (
              <div key={n.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-sm font-semibold text-[#0B1F3A]">{n.title}</p>
                <p className="text-xs text-slate-600">{formatDateSafe(n.created_at)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-lg font-bold text-[#0B1F3A]">Matukio Yajayo</h4>
          <div className="mt-3 space-y-2">
            {events.length === 0 ? <p className="text-sm text-slate-600">Hakuna taarifa bado.</p> : events.map((ev) => (
              <div key={ev.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-sm font-semibold text-[#0B1F3A]">{ev.title}</p>
                <p className="text-xs text-slate-600">{formatDateSafe(ev.event_date)} • {ev.location || "Eneo halijatajwa"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-lg font-bold text-[#0B1F3A]">Nyaraka za Umma</h4>
          <div className="mt-3 space-y-2">
            {documents.length === 0 ? <p className="text-sm text-slate-600">Hakuna taarifa bado.</p> : documents.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-sm font-semibold text-[#0B1F3A]">{d.title}</p>
                <p className="text-xs text-slate-600">{d.category || "Nyingine"} • {formatDateSafe(d.created_at)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-lg font-bold text-[#0B1F3A]">Media Highlights & Livestream</h4>
          <div className="mt-3 space-y-2">
            {liveNow.length === 0 ? <p className="text-sm text-slate-600">Hakuna livestream ya moja kwa moja kwa sasa.</p> : liveNow.map((lv) => (
              <a key={lv.id} href={lv.stream_url} target="_blank" rel="noreferrer" className="block rounded-lg border border-rose-200 bg-rose-50 p-2">
                <p className="text-sm font-semibold text-rose-900">LIVE NOW • {lv.title}</p>
              </a>
            ))}
            {sermons.length === 0 ? <p className="text-sm text-slate-600">Hakuna taarifa bado.</p> : sermons.slice(0, 3).map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-sm font-semibold text-[#0B1F3A]">{s.title}</p>
                <p className="text-xs text-slate-600">{s.preacher || "Mhudumu"} • {formatDateSafe(s.date)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-lg font-bold text-[#0B1F3A]">Usalama, Roles & Permissions</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {SECURITY_BULLETS.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </article>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold text-[#0B1F3A]">{branding.officialName}</p>
          <p>{branding.footer}</p>
          <p className="text-slate-500">© {new Date().getFullYear()} KMK(T) Tanzania</p>
        </div>
      </footer>
    </div>
  );
}

