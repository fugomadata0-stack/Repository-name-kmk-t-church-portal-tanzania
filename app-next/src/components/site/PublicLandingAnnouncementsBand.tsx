import { Megaphone } from "lucide-react";
import { motion } from "framer-motion";
import type { PublicNewsRow } from "../../services/publicLandingService";

function formatDate(v: string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("sw-TZ", { day: "numeric", month: "short", year: "numeric" });
}

/** Matangazo / habari za haraka — juu ya ukurasa wa umma. */
export function PublicLandingAnnouncementsBand({
  news,
  loading,
}: {
  news: PublicNewsRow[];
  loading?: boolean;
}) {
  const featured = news.filter((n) => n.featured);
  const items = (featured.length > 0 ? featured : news).slice(0, 3);
  if (!loading && items.length === 0) return null;

  return (
    <section
      id="public-announcements"
      className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] scroll-mt-24 px-3 py-6 sm:px-6 lg:px-8"
      aria-label="Matangazo"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-950/80 via-[#0f2744] to-[#061633] p-4 shadow-xl sm:p-5"
      >
        <motion.div className="flex flex-wrap items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/25 text-amber-200">
            <Megaphone className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Matangazo</p>
            <h2 className="font-kmkt-display text-lg font-bold text-white sm:text-xl">Taarifa za Kanisa</h2>
          </div>
        </motion.div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="h-16 animate-pulse rounded-xl bg-white/10" aria-hidden />
              ))
            : items.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm"
                >
                  <p className="text-sm font-semibold text-white line-clamp-2">{n.title}</p>
                  {n.summary?.trim() ? (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{n.summary}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] font-medium text-amber-200/90">{formatDate(n.created_at)}</p>
                </li>
              ))}
        </ul>
      </motion.div>
    </section>
  );
}
