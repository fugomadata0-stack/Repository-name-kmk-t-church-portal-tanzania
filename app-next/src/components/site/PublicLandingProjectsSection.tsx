import { motion } from "framer-motion";
import { Building2, FolderKanban } from "lucide-react";
import type { PublicProjectRow } from "../../services/publicLandingService";

const PROJECT_TYPE_LABELS: Record<string, string> = {
  bible_college: "Chuo cha Biblia",
  school: "Shule",
  hospital_clinic: "Hospitali / Kliniki",
  admin_center: "Kituo cha Utawala",
  mission_center: "Kituo cha Misheni",
  training_center: "Kituo cha Mafunzo",
  other: "Mradi",
};

function projectLabel(type: string): string {
  return PROJECT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function PublicLandingProjectsSection({
  projects,
  projectsActiveCount,
  loading,
}: {
  projects: PublicProjectRow[];
  projectsActiveCount?: number | null;
  loading?: boolean;
}) {
  return (
    <section
      id="public-projects"
      className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] scroll-mt-24 px-3 py-10 sm:px-6 lg:px-8"
      aria-labelledby="public-projects-title"
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300/90">Taasisi</p>
          <h2 id="public-projects-title" className="font-kmkt-display mt-2 text-2xl font-bold text-white md:text-3xl">
            Miradi ya Kanisa
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">Shule, vituo vya huduma na miradi ya taasisi — muhtasari wa umma.</p>
        </div>
        {typeof projectsActiveCount === "number" ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-950/40 px-4 py-3">
            <FolderKanban className="h-8 w-8 text-emerald-300" aria-hidden />
            <motion.div>
              <p className="text-2xl font-bold tabular-nums text-white">{projectsActiveCount.toLocaleString("sw-TZ")}</p>
              <p className="text-[10px] font-semibold uppercase text-emerald-200">Miradi hai</p>
            </motion.div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <motion.div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/10" aria-hidden />
          ))}
        </motion.div>
      ) : projects.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
          Hakuna miradi ya umma iliyowekwa bado. Miradi yenye hali active zitaonekana hapa.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-[#061633] to-[#0f2744] p-4 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-200">
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-white line-clamp-2">{p.name}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-200">{projectLabel(p.project_type)}</p>
                  {(p.location_region || p.location_district) ? (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {[p.location_region, p.location_district].filter(Boolean).join(" • ")}
                    </p>
                  ) : null}
                </div>
                </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
