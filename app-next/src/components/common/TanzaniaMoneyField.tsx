import { TZ_CURRENCY_CODE, TZ_CURRENCY_LABEL } from "../../lib/tanzaniaFormDefaults";
import { parseMoneyTz } from "../../lib/money";

type Props = {
  label?: string;
  name?: string;
  value: number | string;
  onChange: (amount: number) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
};

/** Kiasi cha fedha — chaguomsingi TZS (Tanzania). */
export function TanzaniaMoneyField({
  label = "Kiasi (TZS)",
  name,
  value,
  onChange,
  disabled,
  required,
  className = "grid gap-1 text-xs",
  inputClassName = "min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm focus:outline-none",
  placeholder = "0",
}: Props) {
  const str =
    typeof value === "number"
      ? Number.isFinite(value) && value > 0
        ? String(value)
        : ""
      : String(value ?? "");

  return (
    <label className={className}>
      {label}
      {required ? <span className="text-rose-600"> *</span> : null}
      <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
        <span
          className="flex shrink-0 items-center border-r border-slate-200 bg-amber-50 px-2 text-[11px] font-bold text-amber-950"
          title={TZ_CURRENCY_LABEL}
        >
          {TZ_CURRENCY_CODE}
        </span>
        <input
          type="text"
          inputMode="decimal"
          name={name}
          value={str}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          onChange={(e) => {
            const n = parseMoneyTz(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className={inputClassName}
        />
      </div>
    </label>
  );
}
