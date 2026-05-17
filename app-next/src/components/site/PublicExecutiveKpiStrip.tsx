import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Church, FolderKanban, Users } from "lucide-react";
import { PremiumKPICard } from "../executive/PremiumKPICard";
import { PortalKpiRowSkeleton } from "../common/PortalSkeleton";
import { fetchPortalPublicDashboardCountsCached } from "../../lib/portalPublicDashboardCache";
import { safeLocaleCount } from "../../lib/portalHardening/safeDisplay";

/** KPI za umma — hakuna data nyeti (idhini, michango, n.k.). */
export function PublicExecutiveKpiStrip() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof fetchPortalPublicDashboardCountsCached>>["counts"]>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { counts: c } = await fetchPortalPublicDashboardCountsCached();
      setCounts(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 120_000);
    return () => window.clearInterval(id);
  }, [load]);

  const cards = useMemo(() => {
    if (!counts) return [];
    return [
      { title: "Dayosisi", value: safeLocaleCount(counts.dayosisi), hint: "Taifa", icon: <Church className="h-4 w-4" /> },
      {
        title: "Matawi Hai",
        value: safeLocaleCount(counts.matawiActive),
        hint: `${safeLocaleCount(counts.matawi)} jumla`,
        icon: <Church className="h-4 w-4" />,
      },
      { title: "Waumini", value: safeLocaleCount(counts.waumini), hint: "Wanachama", icon: <Users className="h-4 w-4" /> },
      {
        title: "Mahudhurio (mwezi)",
        value: safeLocaleCount(counts.attendanceSessionsMonth),
        hint: `Leo ${safeLocaleCount(counts.attendanceSessionsToday)}`,
        icon: <Activity className="h-4 w-4" />,
      },
      {
        title: "Miradi Hai",
        value: safeLocaleCount(counts.projectsActive),
        hint: "Taasisi",
        icon: <FolderKanban className="h-4 w-4" />,
      },
      { title: "Matukio", value: safeLocaleCount(counts.matukio), hint: "Yanayokuja", icon: <Activity className="h-4 w-4" /> },
    ];
  }, [counts]);

  return (
    <section
      id="public-stats"
      className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] scroll-mt-24 px-3 py-8 sm:px-6 lg:px-8"
      aria-label="Takwimu za umma"
    >
      <div className="mb-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">Dashibodi ya Umma</p>
        <h3 className="font-kmkt-display text-xl font-bold text-white md:text-2xl">Takwimu za KMK(T)</h3>
        <p className="mt-1 text-xs text-slate-400">Muhtasari wa muundo na huduma — bila data nyeti ya ndani.</p>
      </div>
      {loading ? (
        <PortalKpiRowSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((card, i) => (
            <PremiumKPICard
              key={card.title}
              title={card.title}
              value={card.value}
              hint={card.hint}
              icon={card.icon}
              index={i}
              static
              live={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
