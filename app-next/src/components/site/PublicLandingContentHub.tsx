import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Calendar, FileText, Newspaper, Video } from "lucide-react";
import { CONTENT_PANEL_THEMES, type LandingSurfaceTheme } from "./publicLandingThemes";

function formatDateSafe(v: string | null | undefined): string {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("sw-TZ");
}

function ContentPanel({
  theme,
  title,
  icon: Icon,
  count,
  loading,
  emptyText,
  children,
}: {
  theme: LandingSurfaceTheme;
  title: string;
  icon: typeof Newspaper;
  count: number;
  loading?: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className={`overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.bg} p-5 shadow-xl ${theme.glow} backdrop-blur-md`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${theme.icon} text-white shadow-inner`}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <h4 className={`font-kmkt-display text-lg font-bold ${theme.heading}`}>{title}</h4>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${theme.badge}`}>
          {loading ? "…" : `${count} hai`}
        </span>
      </div>
      <motion.div className="mt-4 space-y-2">
        {count === 0 && !loading ? <p className="text-sm text-slate-400">{emptyText}</p> : children}
      </motion.div>
    </motion.article>
  );
}

function ItemRow({
  theme,
  title,
  meta,
  highlight,
}: {
  theme: LandingSurfaceTheme;
  title: string;
  meta: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border ${highlight ? "border-rose-400/45 bg-rose-500/15" : `${theme.itemBorder} ${theme.itemBg}`} p-2.5 backdrop-blur-sm transition hover:brightness-110`}
    >
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400">{meta}</p>
    </motion.div>
  );
}

type NewsRow = { id: string; title: string; created_at: string };
type EventRow = { id: string; title: string; event_date: string; location: string };
type DocRow = { id: string; title: string; category: string; created_at: string };
type LiveRow = { id: string; title: string; stream_url: string };
type SermonRow = { id: string; title: string; preacher: string; date: string };

export function PublicLandingContentHub({
  news,
  events,
  documents,
  liveNow,
  sermons,
  loading,
}: {
  news: NewsRow[];
  events: EventRow[];
  documents: DocRow[];
  liveNow: LiveRow[];
  sermons: SermonRow[];
  loading?: boolean;
}) {
  const tNews = CONTENT_PANEL_THEMES.news;
  const tEvents = CONTENT_PANEL_THEMES.events;
  const tDocs = CONTENT_PANEL_THEMES.documents;
  const tMedia = CONTENT_PANEL_THEMES.media;

  return (
    <section
      className="relative z-10 mx-auto grid w-full max-w-7xl gap-4 px-4 pb-8 lg:grid-cols-2"
      aria-label="Taarifa za umma"
    >
      <ContentPanel theme={tNews} title="Habari Mpya" icon={Newspaper} count={news.length} loading={loading} emptyText="Hakuna taarifa bado">
        {news.map((n) => (
          <ItemRow key={n.id} theme={tNews} title={n.title} meta={formatDateSafe(n.created_at)} />
        ))}
      </ContentPanel>

      <ContentPanel theme={tEvents} title="Matukio Yajayo" icon={Calendar} count={events.length} loading={loading} emptyText="Hakuna taarifa bado">
        {events.map((ev) => (
          <ItemRow
            key={ev.id}
            theme={tEvents}
            title={ev.title}
            meta={`${formatDateSafe(ev.event_date)} • ${ev.location || "Eneo halijatajwa"}`}
          />
        ))}
      </ContentPanel>

      <ContentPanel theme={tDocs} title="Nyaraka za Umma" icon={FileText} count={documents.length} loading={loading} emptyText="Hakuna taarifa bado">
        {documents.map((d) => (
          <ItemRow key={d.id} theme={tDocs} title={d.title} meta={`${d.category || "Nyingine"} • ${formatDateSafe(d.created_at)}`} />
        ))}
      </ContentPanel>

      <ContentPanel
        theme={tMedia}
        title="Media Highlights & Livestream"
        icon={Video}
        count={liveNow.length + sermons.length}
        loading={loading}
        emptyText="Hakuna taarifa bado"
      >
        {liveNow.length === 0 ? (
          <p className="text-sm text-slate-400">Hakuna livestream ya moja kwa moja kwa sasa</p>
        ) : (
          liveNow.map((lv) =>
            lv.stream_url ? (
              <a key={lv.id} href={lv.stream_url} target="_blank" rel="noreferrer" className="block">
                <ItemRow theme={tMedia} title={`LIVE • ${lv.title}`} meta="Bofya kutazama" highlight />
              </a>
            ) : (
              <ItemRow key={lv.id} theme={tMedia} title={`LIVE • ${lv.title}`} meta="Inaendelea" highlight />
            ),
          )
        )}
        {sermons.slice(0, 3).map((s) => (
          <ItemRow
            key={s.id}
            theme={tMedia}
            title={s.title}
            meta={`${s.preacher || "Mhudumu"} • ${formatDateSafe(s.date)}`}
          />
        ))}
      </ContentPanel>
    </section>
  );
}
