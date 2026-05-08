import { useMemo } from "react";
import { modules } from "../../data/portalModules";
import type { SignupReferencePayload } from "../../services/signupReferenceFromSupabase";

interface Props {
  role: string;
  value: Record<string, string>;
  onChange: (name: string, next: string) => void;
  /** Orodha zote kutoka Supabase — hakuna maombi ya maeneo ya mfano. */
  hierarchy: SignupReferencePayload;
}

function sel(
  name: string,
  label: string,
  options: readonly string[],
  required: boolean,
  val: string,
  onChange: (n: string, v: string) => void,
  first = "Chagua"
) {
  return (
    <label key={name} className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        required={required}
        value={val}
        onChange={(e) => onChange(name, e.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
      >
        <option value="">{first}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function txt(
  name: string,
  label: string,
  required: boolean,
  val: string,
  onChange: (n: string, v: string) => void,
  placeholder = ""
) {
  return (
    <label key={name} className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        required={required}
        value={val}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
      />
    </label>
  );
}

function area(name: string, label: string, val: string, onChange: (n: string, v: string) => void, rows = 2) {
  return (
    <label key={name} className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
      {label}
      <textarea
        name={name}
        rows={rows}
        value={val}
        onChange={(e) => onChange(name, e.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
      />
    </label>
  );
}

const LEVELS = ["National", "Diocese", "Jimbo", "Branch"] as const;

function emptyDataHint() {
  return (
    <p className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      Hakuna data bado kwenye Supabase kwa sehemu hii — ongeza rekodi kwenye Muundo / Jumuiya / Taasisi kisha jaribu tena.
    </p>
  );
}

function LocationBlock({
  prefix,
  value,
  onChange,
  hierarchy,
}: {
  prefix: string;
  value: Record<string, string>;
  onChange: Props["onChange"];
  hierarchy: SignupReferencePayload;
}) {
  const levelField = prefix === "viewer" ? "viewerScope" : `${prefix}Level`;
  const lv = String(value[levelField] || "");
  const showD = ["Diocese", "Jimbo", "Branch"].includes(lv);
  const showJ = ["Jimbo", "Branch"].includes(lv);
  const showB = lv === "Branch";

  const dioceseList = hierarchy.dioceses;
  const dioceseVal = value[`${prefix}Diocese`] || "";
  const jimboList = hierarchy.jimboByDiocese[dioceseVal] ?? [];
  const jimboVal = value[`${prefix}Jimbo`] || "";
  const branchList = hierarchy.branchByJimbo[jimboVal] ?? [];

  return (
    <>
      {showD ? sel(`${prefix}Diocese`, "Dayosisi", dioceseList, showD, dioceseVal, onChange) : null}
      {showJ ? sel(`${prefix}Jimbo`, "Jimbo", jimboList, showJ, jimboVal, onChange) : null}
      {showB ? sel(`${prefix}Branch`, "Tawi / Parokia / Kituo", branchList, showB, value[`${prefix}Branch`] || "", onChange) : null}
    </>
  );
}

/** Hatua 3 — chaguo zinatoka Supabase (muundo + portal_domain_entities + mpangilio wa moduli). */
export function SignupDynamicFields({ role, value, onChange, hierarchy }: Props) {
  const diocese = value.diocese || "";
  const jimboList = useMemo(() => hierarchy.jimboByDiocese[diocese] ?? [], [diocese, hierarchy]);
  const jimbo = value.jimbo || "";
  const branchList = useMemo(() => hierarchy.branchByJimbo[jimbo] ?? [], [hierarchy, jimbo]);
  const instType = value.institutionType || "";
  const instList = useMemo(() => hierarchy.institutionsByType[instType] ?? [], [hierarchy, instType]);

  const eventTypeOptions = modules.find((m) => m.key === "matukio")?.submodules ?? [];
  const mediaResponsibilityOptions = modules.find((m) => m.key === "machapisho")?.submodules ?? [];

  if (!role) {
    return <p className="text-sm text-amber-800">Chagua role kwenye hatua ya 2 kwanza.</p>;
  }

  if (role === "Diocese Data Officer") {
    const empty = hierarchy.dioceses.length === 0;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {empty ? emptyDataHint() : null}
        {sel("diocese", "Dayosisi", hierarchy.dioceses, true, diocese, onChange)}
        {txt("diocesePosition", "Cheo / title (dayosisi)", false, value.diocesePosition || "", onChange)}
        {txt("assignedResponsibility", "Wajibu uliopangiwa", false, value.assignedResponsibility || "", onChange)}
        {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
      </div>
    );
  }

  if (role === "Jimbo Data Officer") {
    const empty = hierarchy.dioceses.length === 0;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {empty ? emptyDataHint() : null}
        {sel("diocese", "Dayosisi", hierarchy.dioceses, true, diocese, onChange)}
        {sel("jimbo", "Jimbo", jimboList, true, jimbo, onChange)}
        {txt("jimboPosition", "Cheo (jimbo)", false, value.jimboPosition || "", onChange)}
        {txt("assignedResponsibility", "Wajibu uliopangiwa", false, value.assignedResponsibility || "", onChange)}
        {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
      </div>
    );
  }

  if (role === "Branch Data Officer") {
    const empty = hierarchy.dioceses.length === 0;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {empty ? emptyDataHint() : null}
        {sel("diocese", "Dayosisi", hierarchy.dioceses, true, diocese, onChange)}
        {sel("jimbo", "Jimbo", jimboList, true, jimbo, onChange)}
        {sel("branch", "Tawi / Parokia / Kituo", branchList, true, value.branch || "", onChange)}
        {txt("localUnitTitle", "Jina la kitengo cha ndani", false, value.localUnitTitle || "", onChange)}
        {txt("assignedResponsibility", "Wajibu uliopangiwa", false, value.assignedResponsibility || "", onChange)}
        {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
      </div>
    );
  }

  if (role === "Department Officer") {
    const lv = value.departmentLevel || "";
    const showLoc = ["Diocese", "Jimbo", "Branch"].includes(lv);
    const empty = hierarchy.departments.length === 0;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {empty ? emptyDataHint() : null}
        {sel("department", "Idara", hierarchy.departments, true, value.department || "", onChange)}
        {sel("departmentLevel", "Ngazi ya idara", [...LEVELS], true, lv, onChange)}
        {showLoc ? <LocationBlock prefix="department" value={value} onChange={onChange} hierarchy={hierarchy} /> : null}
        {txt("departmentPosition", "Cheo katika idara", false, value.departmentPosition || "", onChange)}
        {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
      </div>
    );
  }

  if (role === "Fellowship Officer") {
    const lv = value.fellowshipLevel || "";
    const showLoc = ["Diocese", "Jimbo", "Branch"].includes(lv);
    const empty = hierarchy.fellowships.length === 0;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {empty ? emptyDataHint() : null}
        {sel("fellowship", "Jumuiya", hierarchy.fellowships, true, value.fellowship || "", onChange)}
        {sel("fellowshipLevel", "Ngazi ya jumuiya", [...LEVELS], true, lv, onChange)}
        {showLoc ? <LocationBlock prefix="fellowship" value={value} onChange={onChange} hierarchy={hierarchy} /> : null}
        {txt("fellowshipPosition", "Cheo katika jumuiya", false, value.fellowshipPosition || "", onChange)}
        {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
      </div>
    );
  }

  if (role === "Choir Officer") {
    const lv = value.choirLevel || "";
    const showLoc = ["Diocese", "Jimbo", "Branch"].includes(lv);
    const empty = hierarchy.choirs.length === 0;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {empty ? emptyDataHint() : null}
        {sel("choir", "Kwaya", hierarchy.choirs, true, value.choir || "", onChange)}
        {sel("choirLevel", "Ngazi ya kwaya", [...LEVELS], true, lv, onChange)}
        {showLoc ? <LocationBlock prefix="choir" value={value} onChange={onChange} hierarchy={hierarchy} /> : null}
        {txt("choirPosition", "Cheo katika kwaya", false, value.choirPosition || "", onChange)}
        {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
      </div>
    );
  }

  if (role === "Institution Officer") {
    const keys = hierarchy.institutionTypeLabels;
    const empty = keys.length === 0;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {empty ? emptyDataHint() : null}
        {sel("institutionType", "Aina ya taasisi", keys, true, instType, onChange)}
        {sel("institution", "Taasisi maalum", instList, true, value.institution || "", onChange)}
        {txt("institutionLocation", "Mahali", false, value.institutionLocation || "", onChange)}
        {txt("institutionPosition", "Cheo katika taasisi", false, value.institutionPosition || "", onChange)}
        {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
      </div>
    );
  }

  if (role === "Events Officer") {
    const lv = value.eventLevel || "";
    const showLoc = ["Diocese", "Jimbo", "Branch"].includes(lv);
    const emptyTypes = eventTypeOptions.length === 0;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {sel(
          "eventLevel",
          "Ngazi ya matukio",
          ["National", "Diocese", "Jimbo", "Branch", "Department", "Fellowship"],
          true,
          lv,
          onChange
        )}
        {showLoc ? <LocationBlock prefix="event" value={value} onChange={onChange} hierarchy={hierarchy} /> : null}
        {emptyTypes ? emptyDataHint() : null}
        {sel("eventType", "Aina ya matukio", eventTypeOptions, true, value.eventType || "", onChange)}
        {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
      </div>
    );
  }

  if (role === "Publications/Media Officer") {
    const ml = value.mediaLevel || "";
    const showLoc = ["Diocese", "Jimbo", "Branch"].includes(ml);
    const emptyMedia = mediaResponsibilityOptions.length === 0;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {emptyMedia ? emptyDataHint() : null}
        {sel("mediaResponsibility", "Wajibu wa media", mediaResponsibilityOptions, true, value.mediaResponsibility || "", onChange)}
        {sel("mediaLevel", "Ngazi", ["National", "Diocese", "Jimbo", "Branch", "Department"], true, ml, onChange)}
        {showLoc ? <LocationBlock prefix="media" value={value} onChange={onChange} hierarchy={hierarchy} /> : null}
        {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
      </div>
    );
  }

  const vScope = value.viewerScope || "";
  const showViewerLoc = ["Diocese", "Jimbo", "Branch", "Department", "Institution"].includes(vScope);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {txt("viewerReason", "Sababu ya kutaka ufikiaji", true, value.viewerReason || "", onChange)}
      {sel("viewerScope", "Unategemea kuona katika ngazi", ["Public", "Diocese", "Jimbo", "Branch", "Department", "Institution"], true, vScope, onChange)}
      {showViewerLoc ? <LocationBlock prefix="viewer" value={value} onChange={onChange} hierarchy={hierarchy} /> : null}
      {area("supportingNote", "Maelezo ya ziada", value.supportingNote || "", onChange)}
    </div>
  );
}
