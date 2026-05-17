import { GraduationCap } from "lucide-react";
import type { LeadershipEducationCatalogRow } from "../../services/leadershipCredentialsEngineService";

type Props = {
  catalog: LeadershipEducationCatalogRow[];
  selectedKeys: string[];
  disabled?: boolean;
  onChange: (keys: string[]) => void;
};

export function EducationCatalogSelect({ catalog, selectedKeys, disabled, onChange }: Props) {
  const academic = catalog
    .filter((c) => c.category === "academic")
    .sort((a, b) => a.sort_order - b.sort_order);

  function toggle(key: string) {
    if (disabled) return;
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((k) => k !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-[#123C69]" aria-hidden />
        <h3 className="text-sm font-bold text-[#0B1F3A]">Elimu (chagua kiotomatiki)</h3>
      </header>
      <div className="flex flex-wrap gap-2">
        {academic.map((opt) => {
          const on = selectedKeys.includes(opt.option_key);
          return (
            <button
              key={opt.option_key}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt.option_key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                on
                  ? "bg-[#0B1F3A] text-amber-100 shadow"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300"
              }`}
              title={opt.label_en}
            >
              {opt.label_sw}
            </button>
          );
        })}
      </div>
    </section>
  );
}
