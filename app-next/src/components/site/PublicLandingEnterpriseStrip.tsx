import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Database, Eye, History, Lock, Radio, Shield, Target } from "lucide-react";
import {
  KMKT_ABOUT_HISTORY,
  KMKT_CORE_VALUES,
  KMKT_MISSION,
  KMKT_VISION,
} from "../../data/kmktCanonicalContent";
import { getSupabase } from "../../lib/supabaseClient";
import { useCountUp } from "../../hooks/useCountUp";

const TRUST_ITEMS = [
  { icon: Shield, label: "RLS & RBAC", hint: "Ruhusa kwa ngazi" },
  { icon: Database, label: "Supabase Live", hint: "Data halisi" },
  { icon: Eye, label: "Audit Trail", hint: "Uwajibikaji" },
  { icon: Lock, label: "Usalama", hint: "SSL / Auth" },
] as const;

const TIMELINE = [
  { year: "Historia", text: "KMK(T) — huduma ya Injili Tanzania" },
  { year: "Ngazi", text: "Dayosisi · Jimbo · Tawi / Kituo" },
  { year: "Leo", text: "Portal ya kitaifa — ripoti na uwazi" },
] as const;

const FLOW_STEPS = [
  { n: "01", title: "Omba / Ingia", desc: "Akaunti na uthibitisho" },
  { n: "02", title: "Ngazi & Ruhusa", desc: "Roles & Permissions" },
  { n: "03", title: "Ripoti Live", desc: "KPI na mahudhurio" },
  { n: "04", title: "Uwazi", desc: "Nyaraka na audit" },
] as const;

type PulseStats = {
  dayosisi: number | null;
  majimbo: number | null;
  majimboActive: number | null;
  showMajimboActive: boolean;
  matawi: number | null;
  waumini: number | null;
  loading: boolean;
};

function PulseMetric({
  label,
  value,
  loading,
  activeValue,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  activeValue?: number | null;
}) {
  const animated = useCountUp(value, { enabled: !loading && value != null });
  const showActive =
    !loading &&
    activeValue != null &&
    typeof activeValue === "number" &&
    Number.isFinite(activeValue);
  return (
    <div className="cursor-default rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-kmkt-display text-xl font-black tabular-nums text-white">
        {loading ? "…" : value == null ? "—" : animated.toLocaleString("sw-TZ")}
      </p>
      {showActive ? (
        <p className="mt-0.5 text-[9px] font-medium text-emerald-300/90">
          {activeValue.toLocaleString("sw-TZ")} hai
        </p>
      ) : null}
    </div>
  );
}

/** Trust bar, timeline, mission/values, live pulse — vipengele 1–3. */
export function PublicLandingEnterpriseStrip({ stats, liveAt }: { stats: PulseStats; liveAt: string | null }) {
  const [about, setAbout] = useState({
    vision: KMKT_VISION,
    mission: KMKT_MISSION,
    core_values: KMKT_CORE_VALUES,
    history: KMKT_ABOUT_HISTORY,
  });

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await client
          .from("about_kmkt")
          .select("vision,mission,core_values,history")
          .eq("published", true)
          .limit(1)
          .maybeSingle();
        if (cancelled || !data) return;
        const row = data as Record<string, unknown>;
        setAbout({
          vision: String(row.vision ?? "").trim() || KMKT_VISION,
          mission: String(row.mission ?? "").trim() || KMKT_MISSION,
          core_values: String(row.core_values ?? "").trim() || KMKT_CORE_VALUES,
          history: String(row.history ?? "").trim() || KMKT_ABOUT_HISTORY,
        });
      } catch {
        /* chaguo-msingi */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveLabel = liveAt
    ? new Date(liveAt).toLocaleTimeString("sw-TZ", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section
      className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] space-y-6 px-3 py-6 sm:px-6 lg:px-8"
      aria-labelledby="enterprise-strip-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="overflow-hidden rounded-2xl border border-emerald-400/35 bg-gradient-to-r from-emerald-950/50 via-[#0a1628]/90 to-[#061633]/90 p-4 shadow-xl shadow-emerald-950/30 backdrop-blur-md"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <motion.div className="flex items-center gap-3" animate={{ opacity: [0.85, 1, 0.85] }} transition={{ duration: 2.5, repeat: Infinity }}>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
            </span>
            <motion.div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">Mfumo hai</p>
              <p id="enterprise-strip-title" className="font-kmkt-display text-lg font-bold text-white">
                Live pulse — data kutoka Supabase
              </p>
              {liveLabel ? (
                <p className="text-xs text-slate-400">Sasisho la mwisho · {liveLabel}</p>
              ) : (
                <p className="text-xs text-slate-400">Inapakia takwimu za umma…</p>
              )}
            </motion.div>
          </motion.div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <PulseMetric label="Dayosisi" value={stats.dayosisi} loading={stats.loading} />
            <PulseMetric
              label="Majimbo"
              value={stats.majimbo}
              loading={stats.loading}
              activeValue={stats.showMajimboActive ? stats.majimboActive : null}
            />
            <PulseMetric label="Matawi" value={stats.matawi} loading={stats.loading} />
            <PulseMetric label="Waumini" value={stats.waumini} loading={stats.loading} />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 backdrop-blur-md sm:gap-3"
      >
        {TRUST_ITEMS.map(({ icon: Icon, label, hint }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a1628]/60 px-3 py-2 transition hover:border-amber-400/35"
          >
            <Icon className="h-4 w-4 text-amber-300" aria-hidden />
            <div>
              <p className="text-xs font-bold text-white">{label}</p>
              <p className="text-[10px] text-slate-500">{hint}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-violet-400/35 bg-gradient-to-br from-violet-500/10 via-[#0a1628]/80 to-[#061633] p-5 shadow-lg"
        >
          <div className="flex items-center gap-2 text-violet-200">
            <Target className="h-5 w-5" aria-hidden />
            <h3 className="font-kmkt-display text-lg font-bold text-white">Dhamira & Maadili</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            <span className="font-semibold text-violet-200">Maono:</span> {about.vision}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            <span className="font-semibold text-violet-200">Dhamira:</span> {about.mission}
          </p>
          <p className="mt-3 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-100">{about.core_values}</p>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/10 via-[#0a1628]/80 to-[#061633] p-5 shadow-lg"
        >
          <div className="flex items-center gap-2 text-amber-200">
            <History className="h-5 w-5" aria-hidden />
            <h3 className="font-kmkt-display text-lg font-bold text-white">Historia & Hatua</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{about.history}</p>
          <ol className="mt-4 space-y-2">
            {TIMELINE.map((t, i) => (
              <motion.li
                key={t.year}
                initial={{ opacity: 0, x: 8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-3 rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2"
              >
                <span className="shrink-0 font-kmkt-display text-sm font-bold text-amber-300">{t.year}</span>
                <span className="text-xs text-slate-300">{t.text}</span>
              </motion.li>
            ))}
          </ol>
        </motion.article>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FLOW_STEPS.map((step) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="cursor-default rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/10 to-[#061633] p-4 shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-kmkt-display text-2xl font-black text-sky-400/80">{step.n}</span>
              <Activity className="h-4 w-4 text-sky-300/70" aria-hidden />
            </div>
            <p className="mt-2 text-sm font-bold text-white">{step.title}</p>
            <p className="mt-1 text-xs text-slate-400">{step.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <p className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
        <Radio className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
        Takwimu zinasasishwa kiotomatiki wakati data inabadilika kwenye kanisa
      </p>
    </section>
  );
}
