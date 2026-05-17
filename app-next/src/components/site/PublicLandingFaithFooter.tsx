import { useEffect, useState } from "react";
import { Code2, Heart, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { KMKT_BIBLE_VERSE } from "../../data/kmktCanonicalContent";
import { getSupabase } from "../../lib/supabaseClient";
import { fetchPublicDeveloperProfileOptional, type PublicDeveloperProfile } from "../../services/publicDeveloperProfileService";
import ResponsiveLazyImage from "../common/ResponsiveLazyImage";

const FAITH_TILES = [
  {
    key: "jesus",
    label: "Yesu Kristo",
    caption: "Mfalme wa utukufu",
    sources: [
      "/images/hero/jesus-hero.jpg",
      "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=900&q=80",
      "/images/hero/jesus-hero.svg",
    ],
  },
  {
    key: "bible",
    label: "Neno la Mungu",
    caption: "Biblia — mwanga wa njia",
    sources: [
      "/images/hero/bible-hero.jpg",
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80",
      "/images/hero/bible-hero.svg",
    ],
  },
  {
    key: "congregation",
    label: "Kanisa",
    caption: "Jumuiya ya waumini",
    sources: [
      "/images/hero/church-congregation.jpg",
      "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=900&q=80",
      "/images/hero/church-congregation.svg",
    ],
  },
] as const;

function FaithTile({ tile, index }: { tile: (typeof FAITH_TILES)[number]; index: number }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const src = tile.sources[srcIdx] ?? tile.sources[0];

  return (
    <motion.figure
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.08 }}
      className="group relative overflow-hidden rounded-2xl border border-amber-400/30 bg-[#061633]/80 shadow-xl shadow-black/50 ring-1 ring-white/10"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#050a14] via-[#050a14]/35 to-transparent"
        aria-hidden
      />
      <motion.div className="relative aspect-[4/5] overflow-hidden sm:aspect-[3/4]">
        <ResponsiveLazyImage
          src={src}
          alt={tile.label}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          width={480}
          height={600}
          onError={() => setSrcIdx((i) => (i + 1 < tile.sources.length ? i + 1 : i))}
        />
      </motion.div>
      <figcaption className="absolute inset-x-0 bottom-0 z-20 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">{tile.caption}</p>
        <p className="font-kmkt-display mt-0.5 text-lg font-bold text-white">{tile.label}</p>
      </figcaption>
      <motion.div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl"
        animate={{ opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 5, repeat: Infinity }}
        aria-hidden
      />
    </motion.figure>
  );
}

function DeveloperContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
}) {
  if (!value.trim()) return null;
  const inner = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-400/35 bg-amber-400/10 text-amber-200">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="block truncate text-sm font-medium text-slate-100">{value}</span>
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-amber-400/40 hover:bg-white/[0.07]">
        {inner}
      </a>
    );
  }
  return <motion.div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">{inner}</motion.div>;
}

function DeveloperShowcase({ profile, loading }: { profile: PublicDeveloperProfile | null; loading: boolean }) {
  const name = profile?.full_name?.trim() || "Mwasifu wa Kiufundi";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      className="relative overflow-hidden rounded-[1.75rem] border-2 border-amber-400/45 bg-gradient-to-br from-[#061633] via-[#0c2347] to-[#0a1f18] p-1 shadow-2xl shadow-amber-950/30"
      aria-labelledby="public-developer-title"
    >
      <motion.div
        className="pointer-events-none absolute -left-20 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl"
        animate={{ scale: [1.05, 1, 1.05] }}
        transition={{ duration: 6, repeat: Infinity }}
        aria-hidden
      />

      <motion.div
        className="pointer-events-none absolute inset-3 rounded-[1.35rem] border border-dashed border-amber-300/25"
        aria-hidden
      />

      <motion.div className="relative rounded-[1.35rem] border border-white/10 bg-[#050a14]/55 p-5 backdrop-blur-md sm:p-7 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <div className="mx-auto shrink-0 lg:mx-0">
            <div className="relative">
              <div className="absolute -inset-1 rounded-[1.4rem] bg-gradient-to-br from-amber-400/60 via-amber-200/20 to-emerald-400/40 blur-sm" aria-hidden />
              <motion.div
                className="relative h-36 w-36 overflow-hidden rounded-[1.25rem] border-2 border-amber-400/55 bg-[#0a1628] shadow-2xl ring-4 ring-white/10 sm:h-44 sm:w-44"
                whileHover={{ scale: 1.02 }}
              >
                {loading ? (
                  <motion.div className="h-full w-full animate-pulse bg-white/10" aria-hidden />
                ) : profile?.photo_url ? (
                  <ResponsiveLazyImage
                    src={profile.photo_url}
                    alt={name}
                    className="h-full w-full object-cover"
                    width={352}
                    height={352}
                    priority
                  />
                ) : (
                  <motion.div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#123C69] to-[#0B1F3A]">
                    <Code2 className="h-8 w-8 text-amber-300/90" aria-hidden />
                    <span className="font-kmkt-display text-2xl font-black text-amber-100">{initials || "KMT"}</span>
                  </motion.div>
                )}
              </motion.div>
              <motion.span
                className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/50 bg-emerald-600/90 text-white shadow-lg"
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                title="Mfumo hai"
                aria-hidden
              >
                <Sparkles className="h-5 w-5" />
              </motion.span>
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center lg:text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/90">Ujenzi wa Kiufundi</p>
            <h2 id="public-developer-title" className="font-kmkt-display mt-1 text-2xl font-bold text-white sm:text-3xl">
              {loading ? "Inapakia wasifu…" : name}
            </h2>
            <p className="mt-1 text-sm font-medium text-emerald-200/90">Mwasifu wa Mfumo · KMK(T) Tanzania Portal</p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300/95 lg:mx-0">
              {loading
                ? "Taarifa za mwasifu zinaletwa kutoka hifadhi ya kanisa…"
                : profile?.bio?.trim() ||
                  "Mradi huu umejengwa kwa teknolojia ya kisasa (Supabase, React) kwa ajili ya usimamizi wa kanisa — uunganisho, ripoti na usalama wa data."}
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <DeveloperContactRow icon={Mail} label="Barua pepe" value={profile?.email ?? ""} href={profile?.email ? `mailto:${profile.email}` : undefined} />
              <DeveloperContactRow icon={Phone} label="Simu" value={profile?.phone ?? ""} href={profile?.phone ? `tel:${profile.phone.replace(/\s/g, "")}` : undefined} />
              <DeveloperContactRow icon={MapPin} label="Eneo" value={profile?.address ?? ""} />
              <DeveloperContactRow icon={Heart} label="Sanduku la Posta" value={profile?.po_box ?? ""} />
            </div>
          </div>
        </div>

        <motion.p
          className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-2.5 text-center text-[11px] leading-relaxed text-amber-100/85 sm:text-xs"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Mfumo huu unatumia data halisi kutoka Supabase. Wasifu huu unasomwa kwa umma kwa ajili ya msaada wa kiufundi na mawasiliano — hariri maelezo kwenye moduli ya Developer baada ya kuingia.
        </motion.p>
      </motion.div>
    </motion.article>
  );
}

/** Mapambo ya imani + kisanduku kikubwa cha wasifu wa developer — chini ya ukurasa wa kuingia. */
export function PublicLandingFaithFooter() {
  const [bibleVerse, setBibleVerse] = useState(KMKT_BIBLE_VERSE);
  const [developer, setDeveloper] = useState<PublicDeveloperProfile | null>(null);
  const [devLoading, setDevLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const client = getSupabase();
    if (client) {
      void (async () => {
        try {
          const { data } = await client
            .from("about_kmkt")
            .select("bible_verse")
            .eq("published", true)
            .limit(1)
            .maybeSingle();
          const v = String((data as { bible_verse?: string } | null)?.bible_verse ?? "").trim();
          if (!cancelled && v) setBibleVerse(v);
        } catch {
          /* tumia aya ya chaguo-msingi */
        }
      })();
    }
    void fetchPublicDeveloperProfileOptional()
      .then((row) => {
        if (!cancelled) setDeveloper(row);
      })
      .finally(() => {
        if (!cancelled) setDevLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] px-3 pb-10 pt-4 sm:px-6 lg:px-8"
      aria-labelledby="faith-footer-title"
    >
      <div className="pointer-events-none absolute inset-x-8 bottom-0 top-12 rounded-[3rem] border border-amber-400/10 bg-gradient-to-b from-amber-500/[0.06] via-transparent to-emerald-500/[0.04]" aria-hidden />

      <div className="relative text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/90">Imani · Huduma · Teknolojia</p>
        <h2 id="faith-footer-title" className="font-kmkt-display mt-2 text-2xl font-bold text-white md:text-3xl">
          Mwanga wa Neno na Ujenzi wa Mfumo
        </h2>
        <blockquote className="mx-auto mt-4 max-w-2xl rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-4 text-sm italic leading-relaxed text-amber-50/95 shadow-inner shadow-amber-950/20">
          “{bibleVerse}”
        </blockquote>
      </div>

      <div className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FAITH_TILES.map((tile, i) => (
          <FaithTile key={tile.key} tile={tile} index={i} />
        ))}
      </div>

      <div className="relative mt-10">
        <DeveloperShowcase profile={developer} loading={devLoading} />
      </div>

      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {["Enterprise Portal", "Supabase Live", "KMK(T) Tanzania"].map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-400">
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
