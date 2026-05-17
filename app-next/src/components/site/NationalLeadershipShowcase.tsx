import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchNationalLeadershipProfilesOptional,
  nationalLeadershipDisplayTitle,
  type NationalLeadershipProfileRow,
} from "../../services/nationalLeadershipService";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";

const ROLE_ORDER = ["askofu_mkuu", "katibu_mkuu", "naibu_katibu_mkuu", "mhasibu_mkuu"] as const;

function sortLeaders(rows: NationalLeadershipProfileRow[]): NationalLeadershipProfileRow[] {
  const map = new Map(rows.map((r) => [r.role_key, r]));
  return ROLE_ORDER.map((k) => map.get(k)).filter(Boolean) as NationalLeadershipProfileRow[];
}

/** Viongozi wanne wa kitaifa — sehemu ya chini ya ukurasa wa kuingia. */
export function NationalLeadershipShowcase() {
  const [rows, setRows] = useState<NationalLeadershipProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchNationalLeadershipProfilesOptional()
      .then((list) => {
        if (!cancelled) setRows(sortLeaders(list.filter((r) => r.status === "active")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] px-3 py-10 sm:px-6 lg:px-8"
      aria-labelledby="national-leaders-title"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent" aria-hidden />
      <div className="relative text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/90">Uongozi wa Kitaifa</p>
        <h2
          id="national-leaders-title"
          className="font-kmkt-display mt-2 text-2xl font-bold text-white md:text-3xl"
        >
          Viongozi wa KMK(T) Tanzania
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
          Uongozi rasmi wa Kanisa la Mennonite la Kiinjili Tanzania — kadi za kiwango cha juu.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/10" aria-hidden />
            ))
          : rows.length === 0
            ? (
                <p className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
                  Picha za uongozi zitapakiwa kutoka mipangilio ya injini ya viongozi wa kitaifa.
                </p>
              )
            : rows.map((row, i) => (
                <motion.article
                  key={row.role_key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-2xl border border-amber-400/35 bg-gradient-to-br from-[#061633] via-[#0f2744] to-[#123C69] p-4 shadow-xl shadow-black/40 ring-1 ring-white/10"
                >
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-400/15 blur-2xl transition group-hover:bg-amber-400/25"
                    aria-hidden
                  />
                  <div className="relative mx-auto mb-3 h-28 w-28 overflow-hidden rounded-full border-2 border-amber-400/60 shadow-lg shadow-amber-900/30 ring-4 ring-white/10">
                    {row.profile_photo_url ? (
                      <ResponsiveLazyImage
                        src={row.profile_photo_url}
                        alt=""
                        className="h-full w-full object-cover"
                        width={224}
                        height={224}
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#0a1a33] text-xs font-semibold uppercase text-slate-500">
                        KMK(T)
                      </div>
                    )}
                  </div>
                  <p className="text-center font-kmkt-display text-base font-bold text-white">
                    {row.full_name.trim() || "—"}
                  </p>
                  <p className="mt-1 text-center text-xs font-semibold text-amber-200">
                    {nationalLeadershipDisplayTitle(row, "sw")}
                  </p>
                  {(row.phone?.trim() || row.whatsapp?.trim()) ? (
                    <p className="mt-2 text-center text-[11px] font-medium tracking-wide text-emerald-200/95">
                      <span className="text-emerald-300/80">Simu:</span>{" "}
                      {row.phone?.trim() || row.whatsapp?.trim()}
                    </p>
                  ) : null}
                  {row.leadership_quote?.trim() ? (
                    <p className="mt-2 line-clamp-2 text-center text-[11px] leading-snug text-blue-100/85">
                      {row.leadership_quote.trim()}
                    </p>
                  ) : null}
                </motion.article>
              ))}
      </div>
    </section>
  );
}
