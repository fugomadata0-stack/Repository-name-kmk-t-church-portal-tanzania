import { ArrowLeft, Layers, Settings } from "lucide-react";
import { modules } from "../../data/portalModules";
import { usePortal } from "../../context/PortalContext";

interface Props {
  moduleKey: string;
  submodule: string;
  /** Orodha ya submodules zinazotumika kwa moduli hii (kutoka portalModules) */
  availableSubmodules: string[];
}

export function SubmoduleEmptyState(props: Props) {
  const { canPortalEditModule } = usePortal();
  const mod = modules.find((m) => m.key === props.moduleKey);
  const canConfigure = canPortalEditModule("mipangilio") || canPortalEditModule("usalama");

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
      role="region"
      aria-labelledby="submodule-empty-title"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/30 blur-2xl" aria-hidden />
      <div className="relative mx-auto max-w-lg text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#0B3C5D]/10 text-[#0B3C5D]">
          <Layers className="h-7 w-7" aria-hidden />
        </div>
        <h2 id="submodule-empty-title" className="text-lg font-bold text-[#0B1F3A]">
          Kipengele hakipo tayari bado
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Submodule <strong className="text-slate-800">&ldquo;{props.submodule}&rdquo;</strong>{" "}
          {mod ? <>hazijasajiliwa kwenye skrini ya <strong>{mod.label}</strong>.</> : "haipo kwenye orodha ya moduli."}
        </p>
        <p className="mt-3 text-xs text-slate-600">
          Chagua kipengele kilicho wazi kutoka menyu ya kushoto, au rudi Dashibodi.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("kmt-portal-navigate", {
                  detail: { moduleKey: "dashboard", submodule: "Overview" },
                })
              )
            }
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Rudi Dashibodi
          </button>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-xs text-slate-800 shadow-inner">
          <p className="font-semibold text-[#0B1F3A]">Vipengele vinavyopatikana ({props.availableSubmodules.length})</p>
          <ul className="mt-2 grid gap-1.5">
            {props.availableSubmodules.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-1.5 text-left font-medium text-slate-800 hover:bg-white hover:text-[#0B1F3A]"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("kmt-portal-navigate", {
                        detail: { moduleKey: props.moduleKey, submodule: s },
                      })
                    )
                  }
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {canConfigure ? (
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
            <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Wasimamizi: sanidi moduli na matrix ya ruhusa katika{" "}
            <strong>Usalama → Permissions</strong> au mipangilio husika.
          </p>
        ) : null}
      </div>
    </section>
  );
}
