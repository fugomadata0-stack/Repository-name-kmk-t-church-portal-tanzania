import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Church, FolderKanban, Shield, Users } from "lucide-react";
import { PremiumKPICard } from "./PremiumKPICard";
import { PortalKpiRowSkeleton } from "../common/PortalSkeleton";
import { fetchPortalPublicDashboardCountsCached } from "../../lib/portalPublicDashboardCache";
import { safeLocaleCount } from "../../lib/portalHardening/safeDisplay";

/** Dashibodi ya umma — strip ya KPI (hakuna kuingia). */
export function PublicExecutiveKpiDashboard() {
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
        title: "Matawi",
        value: safeLocaleCount(counts.matawiActive),
        hint: `${safeLocaleCount(counts.matawi)} jumla`,
        icon: <Church className="h-4 w-4" />,
      },
      { title: "Waumini", value: safeLocaleCount(counts.waumini), hint: "Wanachama", icon: <Users className="h-4 w-4" /> },
      {
        title: "Mahudhurio",
        value: safeLocaleCount(counts.attendanceSessionsMonth),
        hint: `Leo ${safeLocaleCount(counts.attendanceSessionsToday)}`,
        icon: <Activity className="h-4 w-4" />,
      },
      { title: "Miradi Hai", value: safeLocaleCount(counts.projectsActive), hint: "Taasisi", icon: <FolderKanban className="h-4 w-4" /> },
      { title: "Matukio", value: safeLocaleCount(counts.matukio), hint: "Yanayokuja", icon: <Shield className="h-4 w-4" /> },
    ];
  }, [counts]);

  return (
    <section className="w-full min-w-0 space-y-4" aria-label="KPI za umma">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">Mfumo Hai</p>
        <h3 className="text-lg font-bold text-[#0B1F3A]">Takwimu za KMK(T)</h3>
      </div>
      {loading ? (
        <PortalKpiRowSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 justify-items-center gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <PremiumKPICard key={card.title} title={card.title} value={card.value} hint={card.hint} icon={card.icon} index={i} static live={false} />
          ))}
        </div>
      )}
    </section>
  );
}
