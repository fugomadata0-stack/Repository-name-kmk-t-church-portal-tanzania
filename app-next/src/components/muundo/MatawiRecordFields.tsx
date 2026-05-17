import { useEffect, useMemo, useState } from "react";
import { TanzaniaLocationFields } from "../common/TanzaniaLocationFields";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";

type Hierarchy = { dayosisi: DayosisiRecord[]; majimbo: JimboRecord[] };

/** Fomu ya usajili wa kina wa tawi / kituo (Muundo → Matawi). */
export function MatawiRecordFields({ initial, hierarchy }: { initial: Partial<TawiRecord> & { id?: string }; hierarchy: Hierarchy }) {
  const initialJimbo = initial.jimbo_id ? String(initial.jimbo_id) : "";
  const initialDs = useMemo(() => {
    const j = hierarchy.majimbo.find((x) => x.id === initialJimbo);
    return j?.dayosisi_id ? String(j.dayosisi_id) : "";
  }, [hierarchy.majimbo, initialJimbo]);

  const [dayosisiId, setDayosisiId] = useState(initialDs);
  const [jimboId, setJimboId] = useState(initialJimbo);

  useEffect(() => {
    setDayosisiId(initialDs);
    setJimboId(initialJimbo);
  }, [initial.id, initialDs, initialJimbo]);

  const jimboOptions = useMemo(() => {
    if (!dayosisiId) return hierarchy.majimbo;
    return hierarchy.majimbo.filter((j) => j.dayosisi_id === dayosisiId);
  }, [hierarchy.majimbo, dayosisiId]);

  const suggestMkoa = useMemo(() => {
    const j = hierarchy.majimbo.find((x) => x.id === jimboId);
    return j?.mkoa?.trim() || null;
  }, [hierarchy.majimbo, jimboId]);

  return (
    <>
      <label className="grid gap-1 text-xs md:col-span-2">
        Jina la Tawi / Kituo <span className="text-rose-600">*</span>
        <input name="jina" required defaultValue={initial.jina ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">
        Branch code (msimbo)
        <input name="branch_code" defaultValue={initial.branch_code ?? ""} className="rounded-lg border px-3 py-2 text-sm" placeholder="mf. TW-MUS-001" />
      </label>
      <label className="grid gap-1 text-xs">
        Aina
        <input name="aina" defaultValue={initial.aina ?? "Tawi"} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Dayosisi (chuja majimbo)
        <select
          value={dayosisiId}
          onChange={(e) => {
            setDayosisiId(e.target.value);
            setJimboId("");
          }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">— Chagua dayosisi (hiari) —</option>
          {hierarchy.dayosisi.map((d) => (
            <option key={d.id} value={d.id}>
              {d.jina || d.code}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Jimbo <span className="text-rose-600">*</span>
        <select
          name="jimbo_id"
          required
          value={jimboId}
          onChange={(e) => setJimboId(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">— Chagua jimbo —</option>
          {jimboOptions.map((j) => (
            <option key={j.id} value={j.id}>
              {j.jina}
            </option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2">
        <TanzaniaLocationFields
          formMode
          suggestMkoa={suggestMkoa}
          defaultValue={{
            mkoa: initial.mkoa ?? "",
            wilaya: initial.wilaya ?? "",
            kata: initial.kata ?? "",
            mtaa: initial.mtaa ?? "",
          }}
          names={{ mkoa: "mkoa", wilaya: "wilaya", kata: "kata", mtaa: "mtaa" }}
          className="md:grid-cols-2"
        />
      </div>
      <label className="grid gap-1 text-xs">
        GPS Lat
        <input
          name="gps_lat"
          type="number"
          step="any"
          defaultValue={initial.gps_lat != null ? String(initial.gps_lat) : ""}
          className="rounded-lg border px-3 py-2 text-sm"
          placeholder="-1.2345"
        />
      </label>
      <label className="grid gap-1 text-xs">
        GPS Lng
        <input
          name="gps_lng"
          type="number"
          step="any"
          defaultValue={initial.gps_lng != null ? String(initial.gps_lng) : ""}
          className="rounded-lg border px-3 py-2 text-sm"
          placeholder="34.5678"
        />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">
        Tarehe ya kuanzishwa
        <input
          name="founded_date"
          type="date"
          defaultValue={initial.founded_date ? String(initial.founded_date).slice(0, 10) : ""}
          className="rounded-lg border px-3 py-2 text-sm"
        />
      </label>
      <label className="grid gap-1 text-xs">
        Kiongozi wa tawi
        <input name="kiongozi" defaultValue={initial.kiongozi ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">
        Simu
        <input name="simu" defaultValue={initial.simu ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">
        Hali ya tawi
        <select name="status" defaultValue={initial.status ?? "Active"} className="rounded-lg border px-3 py-2 text-sm">
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Suspended">Suspended</option>
          <option value="Pending">Pending</option>
          <option value="Needs Review">Needs Review</option>
          <option value="Archived">Archived</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs">
        Uhakiki wa usajili
        <select name="verification_status" defaultValue={initial.verification_status ?? "unverified"} className="rounded-lg border px-3 py-2 text-sm">
          <option value="unverified">Hajathibitishwa</option>
          <option value="pending_review">Inasubiri ukaguzi</option>
          <option value="verified">Imethibitishwa</option>
        </select>
      </label>
      <p className="md:col-span-2 text-[11px] leading-snug text-slate-600">
        GPS na maeneo ya kiutawala yanatumika kwa ripoti na ramani baadae. Uhakiki unaweza kuwekwa na msimamizi baada ya ukaguzi wa nyumba.
      </p>
    </>
  );
}

/** Majina ya uwanja wa fomu ya tawi (FormData → payload). */
export const MATAWI_FORM_FIELD_KEYS = [
  "jina",
  "branch_code",
  "aina",
  "jimbo_id",
  "mkoa",
  "wilaya",
  "kata",
  "mtaa",
  "gps_lat",
  "gps_lng",
  "founded_date",
  "kiongozi",
  "simu",
  "status",
  "verification_status",
] as const;
