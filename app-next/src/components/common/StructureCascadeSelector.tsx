import { useMemo } from "react";
import type { ChurchStructureEntity } from "../../types";

type Props = {
  options: {
    dayosisi: ChurchStructureEntity[];
    majimbo: ChurchStructureEntity[];
    matawi: ChurchStructureEntity[];
  };
  value: { dayosisi_id?: string | null; jimbo_id?: string | null; tawi_id?: string | null };
  onChange: (next: { dayosisi_id?: string; jimbo_id?: string; tawi_id?: string }) => void;
  includeInactive?: boolean;
};

export function StructureCascadeSelector({ options, value, onChange, includeInactive = false }: Props) {
  const dayosisi = useMemo(
    () => options.dayosisi.filter((x) => includeInactive || x.status === "active"),
    [options.dayosisi, includeInactive]
  );
  const majimbo = useMemo(
    () =>
      options.majimbo.filter(
        (x) => (includeInactive || x.status === "active") && (!value.dayosisi_id || x.parent_id === value.dayosisi_id)
      ),
    [options.majimbo, includeInactive, value.dayosisi_id]
  );
  const matawi = useMemo(
    () =>
      options.matawi.filter(
        (x) => (includeInactive || x.status === "active") && (!value.jimbo_id || x.parent_id === value.jimbo_id)
      ),
    [options.matawi, includeInactive, value.jimbo_id]
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="grid gap-1 text-sm font-medium text-slate-800">
        Dayosisi
        <select
          value={value.dayosisi_id ?? ""}
          onChange={(e) => onChange({ dayosisi_id: e.target.value, jimbo_id: "", tawi_id: "" })}
          className="rounded-xl border border-slate-200 px-3 py-2"
        >
          <option value="">—</option>
          {dayosisi.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-800">
        Jimbo
        <select
          value={value.jimbo_id ?? ""}
          onChange={(e) => onChange({ dayosisi_id: value.dayosisi_id ?? "", jimbo_id: e.target.value, tawi_id: "" })}
          className="rounded-xl border border-slate-200 px-3 py-2"
        >
          <option value="">—</option>
          {majimbo.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-800">
        Tawi/Kituo
        <select
          value={value.tawi_id ?? ""}
          onChange={(e) =>
            onChange({
              dayosisi_id: value.dayosisi_id ?? "",
              jimbo_id: value.jimbo_id ?? "",
              tawi_id: e.target.value,
            })
          }
          className="rounded-xl border border-slate-200 px-3 py-2"
        >
          <option value="">—</option>
          {matawi.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
