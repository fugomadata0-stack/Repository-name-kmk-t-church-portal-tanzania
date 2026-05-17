import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TANZANIA_MIKOA,
  getDistrictsForMkoa,
  getKataForWilaya,
  matchMkoaFromText,
} from "../../data/tanzaniaAdminDivisions";

export type TanzaniaLocationValue = {
  mkoa: string;
  wilaya: string;
  kata: string;
  mtaa?: string;
};

const MANUAL = "__manual__";

type FieldNames = {
  mkoa: string;
  wilaya: string;
  kata: string;
  mtaa?: string;
};

type Props = {
  defaultValue?: Partial<TanzaniaLocationValue>;
  value?: TanzaniaLocationValue;
  onChange?: (next: TanzaniaLocationValue) => void;
  /** Fomu ya HTML: hidden inputs + majina ya uwanja */
  formMode?: boolean;
  names?: FieldNames;
  showKata?: boolean;
  showMtaa?: boolean;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  /** Jaza mkoa kutoka jimbo/dayosisi ikiwa inapatikana */
  suggestMkoa?: string | null;
};

function isListed(value: string, options: string[]): boolean {
  const v = value.trim().toLowerCase();
  return options.some((o) => o.toLowerCase() === v);
}

function LocationSelect({
  label,
  required,
  value,
  options,
  disabled,
  labelClassName,
  inputClassName,
  onChange,
  manualPlaceholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  options: string[];
  disabled?: boolean;
  labelClassName: string;
  inputClassName: string;
  onChange: (next: string) => void;
  manualPlaceholder: string;
}) {
  const inList = value && isListed(value, options);
  const [manual, setManual] = useState(Boolean(value && !inList && options.length > 0));

  useEffect(() => {
    if (!value) return;
    if (options.length && !isListed(value, options)) setManual(true);
  }, [value, options]);

  const selectValue = manual ? MANUAL : value || "";

  return (
    <label className={labelClassName}>
      {label}
      {required ? <span className="text-rose-600"> *</span> : null}
      {options.length > 0 ? (
        <select
          value={selectValue}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            if (v === MANUAL) {
              setManual(true);
              onChange(value && !isListed(value, options) ? value : "");
              return;
            }
            setManual(false);
            onChange(v);
          }}
          className={inputClassName}
        >
          <option value="">— Chagua —</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value={MANUAL}>Ingiza manually…</option>
        </select>
      ) : null}
      {(manual || options.length === 0) && (
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={manualPlaceholder}
          className={`${inputClassName} ${options.length > 0 ? "mt-1" : ""}`}
          list={options.length > 0 ? undefined : undefined}
        />
      )}
    </label>
  );
}

export function TanzaniaLocationFields({
  defaultValue,
  value: controlled,
  onChange,
  formMode = false,
  names = { mkoa: "mkoa", wilaya: "wilaya", kata: "kata", mtaa: "mtaa" },
  showKata = true,
  showMtaa = true,
  disabled = false,
  className = "",
  labelClassName = "grid gap-1 text-xs",
  inputClassName = "rounded-lg border border-slate-200 px-3 py-2 text-sm",
  suggestMkoa,
}: Props) {
  const [internal, setInternal] = useState<TanzaniaLocationValue>(() => ({
    mkoa: defaultValue?.mkoa ?? "",
    wilaya: defaultValue?.wilaya ?? "",
    kata: defaultValue?.kata ?? "",
    mtaa: defaultValue?.mtaa ?? "",
  }));

  const current = controlled ?? internal;
  const setAll = useCallback(
    (patch: Partial<TanzaniaLocationValue>) => {
      const next = { ...current, ...patch };
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, current, onChange],
  );

  const mkoaOptions = useMemo(() => [...TANZANIA_MIKOA], []);
  const districtOptions = useMemo(() => getDistrictsForMkoa(current.mkoa), [current.mkoa]);
  const kataOptions = useMemo(
    () => getKataForWilaya(current.mkoa, current.wilaya),
    [current.mkoa, current.wilaya],
  );

  useEffect(() => {
    const suggested = matchMkoaFromText(suggestMkoa ?? "") ?? suggestMkoa?.trim();
    if (!suggested || current.mkoa.trim()) return;
    setAll({ mkoa: suggested });
  }, [suggestMkoa, current.mkoa, setAll]);

  useEffect(() => {
    if (districtOptions.length === 1 && !current.wilaya.trim()) {
      setAll({ wilaya: districtOptions[0] });
    }
  }, [districtOptions, current.wilaya, setAll]);

  useEffect(() => {
    if (kataOptions.length === 1 && showKata && !current.kata.trim()) {
      setAll({ kata: kataOptions[0] });
    }
  }, [kataOptions, current.kata, showKata, setAll]);

  const onMkoa = (mkoa: string) => {
    setAll({ mkoa, wilaya: "", kata: "" });
  };

  const onWilaya = (wilaya: string) => {
    setAll({ wilaya, kata: "" });
  };

  return (
    <div className={`grid gap-2 md:grid-cols-2 ${className}`.trim()} role="group" aria-label="Eneo la Tanzania">
      {formMode ? (
        <>
          <input type="hidden" name={names.mkoa} value={current.mkoa} />
          <input type="hidden" name={names.wilaya} value={current.wilaya} />
          {showKata ? <input type="hidden" name={names.kata} value={current.kata} /> : null}
          {showMtaa && names.mtaa ? <input type="hidden" name={names.mtaa} value={current.mtaa ?? ""} /> : null}
        </>
      ) : null}
      <LocationSelect
        label="Mkoa"
        value={current.mkoa}
        options={mkoaOptions}
        disabled={disabled}
        labelClassName={labelClassName}
        inputClassName={inputClassName}
        onChange={onMkoa}
        manualPlaceholder="Andika mkoa"
      />
      <LocationSelect
        label="Wilaya"
        value={current.wilaya}
        options={districtOptions}
        disabled={disabled || !current.mkoa.trim()}
        labelClassName={labelClassName}
        inputClassName={inputClassName}
        onChange={onWilaya}
        manualPlaceholder={current.mkoa ? "Andika wilaya" : "Chagua mkoa kwanza"}
      />
      {showKata ? (
        <LocationSelect
          label="Kata"
          value={current.kata}
          options={kataOptions}
          disabled={disabled || !current.wilaya.trim()}
          labelClassName={labelClassName}
          inputClassName={inputClassName}
          onChange={(kata) => setAll({ kata })}
          manualPlaceholder={current.wilaya ? "Andika kata" : "Chagua wilaya kwanza"}
        />
      ) : null}
      {showMtaa ? (
        <label className={labelClassName}>
          Kijiji / Mtaa
          <input
            type="text"
            name={formMode ? names.mtaa : undefined}
            value={current.mtaa ?? ""}
            disabled={disabled}
            onChange={(e) => setAll({ mtaa: e.target.value })}
            placeholder="Mtaa au kijiji"
            className={inputClassName}
          />
        </label>
      ) : null}
      <p className="md:col-span-2 text-[11px] leading-snug text-slate-600">
        Chagua kutoka orodha ya Tanzania; ikiwa eneo halipo, tumia <strong>Ingiza manually</strong>.
      </p>
    </div>
  );
}
