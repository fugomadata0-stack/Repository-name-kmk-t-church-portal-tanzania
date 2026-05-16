import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import type { MasterBranchScope } from "../../services/masterBranchEngineService";

const LEVELS: { scope: MasterBranchScope; label: string; sub: string }[] = [
  { scope: "tawi", label: "Tawi / Kituo", sub: "Msingi wa huduma" },
  { scope: "jimbo", label: "Jimbo", sub: "Mkusanyiko wa matawi" },
  { scope: "dayosisi", label: "Dayosisi", sub: "Uongozi wa eneo" },
  { scope: "kitaifa", label: "KMK(T)", sub: "Taifa — makao makuu" },
];

type Props = {
  activeScope: MasterBranchScope;
  onSelectScope: (scope: MasterBranchScope) => void;
};

export function MasterBranchHierarchyFlow({ activeScope, onSelectScope }: Props) {
  return (
    <section
      className="rounded-2xl border border-slate-200/90 bg-white/70 p-4 shadow-lg backdrop-blur-md"
      aria-label="Mtiririko wa ngazi — tawi hadi kitaifa"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Usawazishaji wa ngazi</p>
      <p className="mt-1 text-xs text-slate-600">
        Data inapanda kiotomatiki: <strong>Tawi</strong> → <strong>Jimbo</strong> → <strong>Dayosisi</strong> →{" "}
        <strong>KMK(T)</strong>
      </p>
      <div className="mt-4 flex flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        {LEVELS.map((lv, i) => (
          <motion.div key={lv.scope} className="flex flex-col items-center gap-1 sm:flex-1" layout>
            <button
              type="button"
              onClick={() => onSelectScope(lv.scope)}
              className={`w-full rounded-xl border px-3 py-2.5 text-center transition ${
                activeScope === lv.scope
                  ? "border-amber-400/60 bg-gradient-to-br from-[#061633] to-[#134b72] text-white shadow-md"
                  : "border-slate-200 bg-slate-50 text-slate-800 hover:border-cyan-300 hover:bg-white"
              }`}
            >
              <span className="block text-xs font-bold">{lv.label}</span>
              <span className={`mt-0.5 block text-[10px] ${activeScope === lv.scope ? "text-cyan-100/90" : "text-slate-500"}`}>
                {lv.sub}
              </span>
            </button>
            {i < LEVELS.length - 1 ? (
              <ArrowDown className="h-4 w-4 shrink-0 text-amber-600 sm:hidden" aria-hidden />
            ) : null}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
