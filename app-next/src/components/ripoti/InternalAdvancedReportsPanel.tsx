import { useMemo } from "react";
import { BarChart3, FileSpreadsheet, FileText, Landmark, Users } from "lucide-react";
import { navigatePortalModule } from "../../lib/navigatePortalModule";
import { INTERNAL_RIPOTI_LINKS } from "../../lib/internalPortalConfig";
import { usePortal } from "../../context/PortalContext";

const ICONS: Record<string, typeof FileText> = {
  "Leadership Reports": Landmark,
  "Membership Reports": Users,
  "Finance Reports": FileSpreadsheet,
  "Events Reports": BarChart3,
  "Export Center": FileText,
  "KPI Executive (Ngazi)": BarChart3,
};

type Props = {
  submodule: string;
  canNavigate?: boolean;
};

/** Ripoti za ndani — viungo halisi badala ya domain_entities generic. */
export function InternalAdvancedReportsPanel({ submodule, canNavigate = true }: Props) {
  const { canPortalViewModule } = usePortal();
  const link = INTERNAL_RIPOTI_LINKS[submodule];

  const cards = useMemo(() => {
    return Object.entries(INTERNAL_RIPOTI_LINKS).map(([title, meta]) => ({
      title,
      ...meta,
      Icon: ICONS[title] ?? FileText,
      allowed: canPortalViewModule(meta.moduleKey),
    }));
  }, [canPortalViewModule]);

  if (link) {
    const Icon = ICONS[submodule] ?? FileText;
    const allowed = canPortalViewModule(link.moduleKey);
    return (
      <section className="mx-auto w-full max-w-3xl space-y-4 rounded-2xl border border-indigo-200/40 bg-gradient-to-br from-[#061633] to-[#0f2744] p-6 text-white shadow-xl">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/25 text-indigo-200">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Ripoti ya Ndani</p>
            <h2 className="font-kmkt-display text-xl font-bold">{submodule}</h2>
            <p className="mt-2 text-sm text-slate-300">{link.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canNavigate || !allowed}
            onClick={() => navigatePortalModule(link.moduleKey, link.submodule)}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-[#0a1628] disabled:opacity-40"
          >
            Fungua moduli
          </button>
          <button
            type="button"
            disabled={!canNavigate || !canPortalViewModule("ripoti")}
            onClick={() => navigatePortalModule("ripoti", "Print & PDF Master")}
            className="rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Print & PDF Master
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Ripoti za ndani">
      <header className="rounded-2xl border border-indigo-200/30 bg-gradient-to-r from-[#061633] to-[#123C69] p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Mfumo wa Ndani</p>
        <h2 className="font-kmkt-display mt-1 text-2xl font-bold">Ripoti & Uchambuzi</h2>
        <p className="mt-2 text-sm text-slate-300">
          Chagua aina ya ripoti — kila kiungo kinafungua moduli halisi (fedha, waumini, viongozi, PDF).
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <article
            key={c.title}
            className={`rounded-2xl border p-4 shadow-md transition ${
              c.allowed
                ? "border-white/15 bg-white/5 hover:border-amber-400/40"
                : "border-slate-700/50 bg-slate-900/30 opacity-60"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/20 text-indigo-200">
                <c.Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-white">{c.title}</h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{c.description}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={!canNavigate || !c.allowed}
              onClick={() => navigatePortalModule(c.moduleKey, c.submodule)}
              className="mt-3 w-full rounded-lg border border-amber-400/40 bg-amber-500/15 py-2 text-xs font-bold text-amber-100 disabled:opacity-40"
            >
              Fungua
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
