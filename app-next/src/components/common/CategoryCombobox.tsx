import { useId } from "react";

type Props = {
  name: string;
  label: string;
  options: readonly string[] | string[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

/**
 * Chaguo + maandishi — `<datalist>` inaruhusu chaguo mengi (10+) na kategoria mpya bila kuandika kwenye mipangilio kwanza.
 */
export function CategoryCombobox({
  name,
  label,
  options,
  defaultValue = "",
  placeholder = "Chagua kategoria au andika mpya…",
  required = false,
  className = "",
}: Props) {
  const id = useId();
  const listId = `dl-${id.replace(/:/g, "")}`;

  return (
    <label className={`grid gap-1 text-xs font-medium text-slate-800 ${className}`}>
      {label}
      <input
        name={name}
        list={listId}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
}
