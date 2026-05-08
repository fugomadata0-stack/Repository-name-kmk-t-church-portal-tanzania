import { useMemo, useState } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { CategoryCombobox } from "../common/CategoryCombobox";
import { CHURCH_LEVEL_OPTIONS, FINANCE_WORKFLOW_STATUSES } from "../../data/financeTaxonomy";
import type { DayosisiRecord, FedhaRecord, JimboRecord, TawiRecord } from "../../types";
import { formatMoneyTz, parseMoneyTz } from "../../lib/money";
import { todayIsoInPortalTz } from "../../lib/tzDates";

const AINA_OPTS = ["Mapato", "Matumizi", "Michango", "Nyingine"] as const;

type Props = {
  initial: Partial<FedhaRecord> | null;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  /** Makundi yaliyounganishwa: defaults + site.categories + DB */
  kategoriaOptions: readonly string[] | string[];
  onClose: () => void;
  onSave: (row: Partial<FedhaRecord> & { kiasi: number | string }) => void | Promise<void>;
};

export function FedhaRecordModal({ initial, dayosisi, majimbo, matawi, kategoriaOptions, onClose, onSave }: Props) {
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dayosisiId, setDayosisiId] = useState(
    () => initial?.dayosisi_id ?? dayosisi.find((d) => d.jina === initial?.dayosisi)?.id ?? ""
  );
  const [jimboId, setJimboId] = useState(() => initial?.jimbo_id ?? "");
  const [tawiId, setTawiId] = useState(() => initial?.tawi_id ?? "");

  const majimboFiltered = useMemo(
    () => (dayosisiId ? majimbo.filter((j) => j.dayosisi_id === dayosisiId) : majimbo),
    [majimbo, dayosisiId]
  );

  const matawiFiltered = useMemo(
    () => (jimboId ? matawi.filter((t) => t.jimbo_id === jimboId) : matawi),
    [matawi, jimboId]
  );

  const ngaziList = useMemo(() => [...CHURCH_LEVEL_OPTIONS], []);

  return (
    <ModalScrollLayer onBackdropClick={onClose}>
      <form
        className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setFormError("");
          const fd = new FormData(e.currentTarget);
          const tarehe = String(fd.get("tarehe") ?? "").trim();
          const aina = String(fd.get("aina") ?? "").trim();
          const kategoria = String(fd.get("kategoria") ?? "").trim();
          const kiasiRaw = String(fd.get("kiasi") ?? "");
          const ngazi = String(fd.get("ngazi") ?? "").trim();
          const status = String(fd.get("status") ?? "Active").trim();
          const kiasi = parseMoneyTz(kiasiRaw);
          if (!tarehe) {
            setFormError("Tarehe inahitajika.");
            return;
          }
          if (!aina || !AINA_OPTS.includes(aina as (typeof AINA_OPTS)[number])) {
            setFormError("Chagua aina halisi.");
            return;
          }
          if (!Number.isFinite(kiasi) || kiasi < 0) {
            setFormError("Kiasi lazima kiwe nambari ≥ 0.");
            return;
          }
          setSaving(true);
          try {
            await Promise.resolve(
              onSave({
                id: initial?.id,
                tarehe,
                aina,
                kategoria,
                kiasi,
                ngazi,
                status: status as FedhaRecord["status"],
                dayosisi_id: dayosisiId || null,
                jimbo_id: jimboId || null,
                tawi_id: tawiId || null,
              })
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <h3 className="text-lg font-bold text-[#0B1F3A]">{initial?.id ? "Hariri Miamala" : "Ongeza Miamala"}</h3>
        <p className="mt-1 text-xs text-slate-600">
          Chagua dayosisi/jimbo kutoka orodha — si makosa ya maandishi ya mikono.
        </p>
        {formError ? <p className="mt-2 text-sm text-rose-600">{formError}</p> : null}
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-slate-800">
            Tarehe
            <input
              name="tarehe"
              type="date"
              required
              defaultValue={(initial?.tarehe ?? todayIsoInPortalTz()).slice(0, 10)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-800">
            Aina
            <select
              name="aina"
              required
              defaultValue={initial?.aina ?? "Mapato"}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {AINA_OPTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <CategoryCombobox
            name="kategoria"
            label="Kategoria (chagua au andika mpya)"
            options={kategoriaOptions}
            defaultValue={initial?.kategoria ?? ""}
            className="md:col-span-2"
          />
          <label className="grid gap-1 text-xs font-medium text-slate-800">
            Kiasi (TZS)
            <input
              name="kiasi"
              inputMode="decimal"
              required
              placeholder="0 au 1,500,000"
              defaultValue={initial?.kiasi != null ? formatMoneyTz(initial.kiasi) : ""}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 placeholder:text-slate-500"
            />
          </label>
          <CategoryCombobox
            name="ngazi"
            label="Ngazi"
            options={ngaziList}
            defaultValue={initial?.ngazi ?? ""}
            placeholder="Chagua ngazi au andika nyingine…"
          />
          <label className="grid gap-1 text-xs font-medium text-slate-800 md:col-span-2">
            Dayosisi
            <select
              value={dayosisiId}
              onChange={(ev) => {
                setDayosisiId(ev.target.value);
                setJimboId("");
                setTawiId("");
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">—</option>
              {dayosisi.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.jina} ({d.code})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-800 md:col-span-2">
            Jimbo
            <select
              value={jimboId}
              onChange={(ev) => {
                setJimboId(ev.target.value);
                setTawiId("");
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">—</option>
              {majimboFiltered.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jina}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-800 md:col-span-2">
            Tawi / kituo (hiari)
            <select
              value={tawiId}
              onChange={(ev) => setTawiId(ev.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">—</option>
              {matawiFiltered.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.jina}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-800 md:col-span-2">
            Status
            <select
              name="status"
              defaultValue={initial?.status ?? "Active"}
              className="max-h-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {FINANCE_WORKFLOW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Ghairi
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#16A34A] px-3 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#15803d] disabled:opacity-50"
          >
            {saving ? "Inahifadhi…" : "Hifadhi"}
          </button>
        </div>
      </form>
    </ModalScrollLayer>
  );
}
