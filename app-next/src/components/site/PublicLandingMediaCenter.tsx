import { motion } from "framer-motion";
import { Headphones, PlayCircle, Radio, Video } from "lucide-react";
import type {
  PublicAudioRow,
  PublicLiveRow,
  PublicSermonRow,
  PublicVideoRow,
} from "../../services/publicLandingService";
import { CONTENT_PANEL_THEMES } from "./publicLandingThemes";

function formatDate(v: string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("sw-TZ");
}

function MediaCard({
  title,
  meta,
  href,
  highlight,
}: {
  title: string;
  meta: string;
  href?: string;
  highlight?: boolean;
}) {
  const theme = CONTENT_PANEL_THEMES.media;
  const inner = (
    <div
      className={`rounded-xl border p-3 backdrop-blur-sm transition hover:brightness-110 ${
        highlight ? "border-rose-400/45 bg-rose-500/15" : `${theme.itemBorder} ${theme.itemBg}`
      }`}
    >
      <p className="text-sm font-semibold text-slate-100 line-clamp-2">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{meta}</p>
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return inner;
}

/** Kituo cha media — live, video, audio, mahubiri. */
export function PublicLandingMediaCenter({
  liveNow,
  videos,
  audios,
  sermons,
  loading,
}: {
  liveNow: PublicLiveRow[];
  videos: PublicVideoRow[];
  audios: PublicAudioRow[];
  sermons: PublicSermonRow[];
  loading?: boolean;
}) {
  const theme = CONTENT_PANEL_THEMES.media;
  const hasAny = liveNow.length + videos.length + audios.length + sermons.length > 0;

  return (
    <section
      id="public-media"
      className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] scroll-mt-24 px-3 py-10 sm:px-6 lg:px-8"
      aria-labelledby="public-media-title"
    >
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-300/90">Media</p>
        <h2 id="public-media-title" className="font-kmkt-display mt-2 text-2xl font-bold text-white md:text-3xl">
          Kituo cha Media
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">Livestream, video, sauti na mahubiri ya umma.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`mt-8 overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.bg} p-5 shadow-xl ${theme.glow}`}
      >
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/10" aria-hidden />
            ))}
          </div>
        ) : !hasAny ? (
          <p className="text-center text-sm text-slate-400">Hakuna media ya umma kwa sasa. Weka is_public kwenye live, video au audio.</p>
        ) : (
          <motion.div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-rose-200">
                <Radio className="h-4 w-4" aria-hidden />
                Livestream
              </h3>
              <div className="space-y-2">
                {liveNow.length === 0 ? (
                  <p className="text-xs text-slate-500">Hakuna live sasa</p>
                ) : (
                  liveNow.map((lv) => (
                    <MediaCard
                      key={lv.id}
                      title={`LIVE • ${lv.title}`}
                      meta="Bofya kutazama"
                      href={lv.stream_url || undefined}
                      highlight
                    />
                  ))
                )}
              </div>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-violet-200">
                <Video className="h-4 w-4" aria-hidden />
                Video
              </h3>
              <motion.div className="space-y-2">
                {videos.slice(0, 4).map((v) => (
                  <MediaCard
                    key={v.id}
                    title={v.title}
                    meta="Video ya umma"
                    href={v.video_url || undefined}
                  />
                ))}
                {videos.length === 0 ? <p className="text-xs text-slate-500">Hakuna video</p> : null}
              </motion.div>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-cyan-200">
                <Headphones className="h-4 w-4" aria-hidden />
                Sauti
              </h3>
              <div className="space-y-2">
                {audios.slice(0, 4).map((a) => (
                  <MediaCard key={a.id} title={a.title} meta="Sikiliza" href={a.audio_url || undefined} />
                ))}
                {audios.length === 0 ? <p className="text-xs text-slate-500">Hakuna sauti</p> : null}
              </div>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-200">
                <PlayCircle className="h-4 w-4" aria-hidden />
                Mahubiri
              </h3>
              <div className="space-y-2">
                {sermons.slice(0, 4).map((s) => (
                  <MediaCard
                    key={s.id}
                    title={s.title}
                    meta={`${s.preacher || "Mhudumu"} • ${formatDate(s.date)}`}
                  />
                ))}
                {sermons.length === 0 ? <p className="text-xs text-slate-500">Hakuna mahubiri</p> : null}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
