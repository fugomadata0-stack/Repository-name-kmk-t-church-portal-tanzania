import type { DayosisiRecord, JimboRecord, KiongoziRecord, LeadershipCvBundle, TawiRecord } from "../../types";
import type { LeadershipProfileExtendedRow, LeadershipRoleCatalogRow } from "../../services/leadershipCredentialsEngineService";
import type { NationalLeadershipProfileRow } from "../../services/nationalLeadershipService";
import { nationalLeadershipDisplayTitle } from "../../services/nationalLeadershipService";
import type { LeadershipHierarchyLevel, UnifiedLeaderRef } from "./types";
import { resolveHierarchyLevelFromLeader } from "./resolveLevel";

export type AutoFillFieldSource =
  | "church_viongozi"
  | "leadership_profiles"
  | "cv_engine"
  | "hierarchy"
  | "catalog"
  | "computed"
  | "national";

export type AutoFillField<T = string> = {
  value: T | null;
  display: string;
  source: AutoFillFieldSource;
  filled: boolean;
};

export type LeadershipCredentialAutoFill = {
  leaderKey: string;
  sourceType: "church_viongozi" | "national_leadership";
  level: LeadershipHierarchyLevel;
  fields: Record<string, AutoFillField<unknown>>;
  /** Sehemu zilizojazwa / jumla (bila media). */
  fillCount: number;
  totalFields: number;
  fillPercent: number;
  hierarchyLabel: string;
  positionTitle: string;
  biography: string | null;
  photoUrl: string | null;
  signatureUrl: string | null;
  photoDataUrl: string | null;
  signatureDataUrl: string | null;
  logoUrl: string | null;
  cvBundle: LeadershipCvBundle | null;
  enrichedLeader: KiongoziRecord | null;
  enrichedNational: NationalLeadershipProfileRow | null;
};

export type AutoFillLoadContext = {
  dayosisi?: DayosisiRecord[];
  majimbo?: JimboRecord[];
  matawi?: TawiRecord[];
  roleCatalog?: LeadershipRoleCatalogRow[];
  extended?: LeadershipProfileExtendedRow | null;
  cvBundle?: LeadershipCvBundle | null;
  logoUrl?: string | null;
  photoDataUrl?: string | null;
  signatureDataUrl?: string | null;
};

const TRACKED_KEYS = [
  "fullName",
  "gender",
  "age",
  "phone",
  "whatsapp",
  "email",
  "physicalAddress",
  "mkoa",
  "wilaya",
  "nationality",
  "churchIdNumber",
  "leadershipIdNumber",
  "positionTitle",
  "roleCatalogTitle",
  "hierarchyLabel",
  "dayosisi",
  "jimbo",
  "tawi",
  "yearsInMinistry",
  "yearsInPosition",
  "dateStarted",
  "dateEnded",
  "serviceStatus",
  "baptized",
  "baptismDate",
  "baptismPlace",
  "baptizedBy",
  "maritalStatus",
  "educationSummary",
  "theologyTraining",
  "professionalCourses",
  "approvedAt",
  "approvedByName",
  "approvedByTitle",
] as const;

function field<T>(
  value: T | null | undefined,
  source: AutoFillFieldSource,
  format?: (v: T) => string,
): AutoFillField<T> {
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "number" && Number.isNaN(value));
  const filled = !empty;
  const display = filled ? (format ? format(value as T) : String(value)) : "—";
  return { value: filled ? (value as T) : null, display, source, filled };
}

function parseYearsFromExperience(text: string | null | undefined): number | null {
  const m = String(text ?? "").match(/(\d{1,2})\s*(?:\+)?\s*(?:miaka|years?)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n < 80 ? n : null;
}

function pickStr(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return null;
}

export function computeAgeFromDob(dob: string | null | undefined): number | null {
  const raw = String(dob ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function mapTermStatusToServiceStatus(
  term: KiongoziRecord["term_status"] | null | undefined,
  former?: boolean | null,
): string {
  if (former) return "former";
  switch (term) {
    case "active":
      return "active";
    case "ended":
      return "former";
    case "suspended":
      return "acting";
    case "pending":
      return "interim";
    default:
      return "active";
  }
}

const SERVICE_STATUS_SW: Record<string, string> = {
  active: "Hai (Active)",
  retired: "Mstaafu (Retired)",
  acting: "Mteule (Acting)",
  interim: "Muda (Interim)",
  former: "Wa zamani (Former)",
};

function matchRoleFromCatalog(
  cheo: string,
  level: LeadershipHierarchyLevel,
  catalog: LeadershipRoleCatalogRow[],
): LeadershipRoleCatalogRow | null {
  const hay = cheo.trim().toLowerCase();
  if (!hay || !catalog.length) return null;
  const levelKey =
    level === "national"
      ? "national"
      : level === "dayosisi"
        ? "dayosisi"
        : level === "jimbo"
          ? "jimbo"
          : level === "tawi"
            ? "tawi"
            : "";
  const pool = levelKey ? catalog.filter((r) => r.level_key === levelKey) : catalog;
  const exact = pool.find((r) => r.title_sw.toLowerCase() === hay || r.title_en.toLowerCase() === hay);
  if (exact) return exact;
  const partial = pool.find(
    (r) => hay.includes(r.title_sw.toLowerCase()) || r.title_sw.toLowerCase().includes(hay),
  );
  return partial ?? null;
}

function resolveHierarchyContext(
  leader: KiongoziRecord,
  ctx: Pick<AutoFillLoadContext, "dayosisi" | "majimbo" | "matawi">,
): { mkoa: string | null; wilaya: string | null } {
  const tawi = ctx.matawi?.find(
    (t) =>
      (leader.tawi_id && t.id === leader.tawi_id) ||
      (leader.tawi && t.jina === leader.tawi && (!leader.jimbo || t.jimbo === leader.jimbo)),
  );
  if (tawi) {
    return {
      mkoa: pickStr(tawi.mkoa, leader.mkoa),
      wilaya: pickStr(tawi.wilaya, leader.wilaya),
    };
  }
  const jimbo = ctx.majimbo?.find(
    (j) => (leader.jimbo_id && j.id === leader.jimbo_id) || j.jina === leader.jimbo,
  );
  if (jimbo) {
    return { mkoa: pickStr(jimbo.mkoa, leader.mkoa), wilaya: pickStr(leader.wilaya) };
  }
  const day = ctx.dayosisi?.find(
    (d) => (leader.dayosisi_id && d.id === leader.dayosisi_id) || d.jina === leader.dayosisi,
  );
  if (day) {
    return { mkoa: pickStr(day.mkoa, leader.mkoa), wilaya: pickStr(leader.wilaya) };
  }
  return { mkoa: pickStr(leader.mkoa), wilaya: pickStr(leader.wilaya) };
}

function summarizeEducation(bundle: LeadershipCvBundle | null | undefined): string | null {
  if (!bundle?.education?.length) return null;
  return bundle.education
    .slice(0, 8)
    .map((e) => {
      const qual = [e.qualification, e.institution, e.year].filter(Boolean).join(" · ");
      return qual || e.education_kind;
    })
    .join("; ");
}

function summarizeTheology(bundle: LeadershipCvBundle | null | undefined, leader: KiongoziRecord): string | null {
  const fromLeader = pickStr(leader.theology_training);
  if (fromLeader) return fromLeader;
  if (!bundle?.education?.length) return null;
  const theology = bundle.education.filter((e) =>
    /theolog|seminary|bible|college|semina/i.test(`${e.education_kind} ${e.institution} ${e.qualification}`),
  );
  if (!theology.length) return null;
  return theology.map((e) => `${e.qualification} — ${e.institution}`).join("; ");
}

function summarizeProfessional(bundle: LeadershipCvBundle | null | undefined, leader: KiongoziRecord): string | null {
  return (
    pickStr(leader.professional_skills, leader.education_summary) ??
    (bundle?.skills?.length
      ? bundle.skills
          .slice(0, 6)
          .map((s) => s.label)
          .join(", ")
      : null)
  );
}

function finalizeAutoFill(
  leaderKey: string,
  sourceType: "church_viongozi" | "national_leadership",
  level: LeadershipHierarchyLevel,
  fields: Record<string, AutoFillField<unknown>>,
  meta: {
    hierarchyLabel: string;
    positionTitle: string;
    biography: string | null;
    photoUrl: string | null;
    signatureUrl: string | null;
    photoDataUrl: string | null;
    signatureDataUrl: string | null;
    logoUrl: string | null;
    cvBundle: LeadershipCvBundle | null;
    enrichedLeader: KiongoziRecord | null;
    enrichedNational: NationalLeadershipProfileRow | null;
  },
): LeadershipCredentialAutoFill {
  const tracked = TRACKED_KEYS.map((k) => fields[k]).filter(Boolean) as AutoFillField<unknown>[];
  const fillCount = tracked.filter((f) => f.filled).length;
  const totalFields = TRACKED_KEYS.length;
  const fillPercent = totalFields ? Math.round((fillCount / totalFields) * 100) : 0;
  return {
    leaderKey,
    sourceType,
    level,
    fields,
    fillCount,
    totalFields,
    fillPercent,
    ...meta,
  };
}

export function buildChurchLeaderAutoFill(
  leader: KiongoziRecord,
  ctx: AutoFillLoadContext = {},
): LeadershipCredentialAutoFill {
  const level = resolveHierarchyLevelFromLeader(leader);
  const ext = ctx.extended ?? null;
  const bundle = ctx.cvBundle ?? null;
  const prof = bundle?.profile ?? null;
  const geo = resolveHierarchyContext(leader, ctx);
  const catalogRole = matchRoleFromCatalog(leader.cheo ?? "", level, ctx.roleCatalog ?? []);
  const hierarchyLabel =
    [leader.dayosisi, leader.jimbo, leader.tawi].filter(Boolean).join(" · ") ||
    leader.leadership_level ||
    leader.ngazi ||
    "KMK(T)";
  const age = computeAgeFromDob(leader.date_of_birth);
  const serviceStatus = pickStr(
    ext?.service_status,
    mapTermStatusToServiceStatus(leader.term_status, leader.former_leader),
  );
  const yearsMinistry =
    ext?.years_in_ministry ??
    parseYearsFromExperience(leader.ministry_experience);
  const enrichedLeader: KiongoziRecord = {
    ...leader,
    full_name: pickStr(leader.full_name, leader.jina) ?? leader.jina,
    gender: pickStr(leader.gender, ext?.gender) ?? leader.gender,
    whatsapp: pickStr(leader.whatsapp, ext?.whatsapp) ?? leader.whatsapp,
    biography: pickStr(prof?.biography ?? null, ext?.biography, leader.biography) ?? leader.biography,
    mkoa: geo.mkoa ?? leader.mkoa,
    wilaya: geo.wilaya ?? leader.wilaya,
    church_member_id: pickStr(ext?.church_id_number, leader.church_member_id) ?? leader.church_member_id,
    national_id: pickStr(leader.national_id) ?? leader.national_id,
    start_date: pickStr(ext?.position_started_at, leader.start_date, leader.appointment_date) ?? leader.start_date,
    end_date: pickStr(ext?.position_ended_at, leader.end_date) ?? leader.end_date,
    education_summary: pickStr(summarizeEducation(bundle), leader.education_summary) ?? leader.education_summary,
    theology_training: pickStr(summarizeTheology(bundle, leader), leader.theology_training) ?? leader.theology_training,
    professional_skills:
      pickStr(summarizeProfessional(bundle, leader), leader.professional_skills) ?? leader.professional_skills,
    pdf_issued_by_name: pickStr(ext?.approved_by_name, leader.pdf_issued_by_name) ?? leader.pdf_issued_by_name,
    pdf_issued_by_title: pickStr(ext?.approved_by_title, leader.pdf_issued_by_title) ?? leader.pdf_issued_by_title,
  };

  const photoUrl = pickStr(leader.photo_url);
  const signatureUrl = pickStr(leader.signature_url);

  const fields: Record<string, AutoFillField<unknown>> = {
    fullName: field(pickStr(leader.full_name, leader.jina), "church_viongozi"),
    gender: field(pickStr(leader.gender, ext?.gender), ext?.gender ? "leadership_profiles" : "church_viongozi"),
    age: field(age, "computed", (n) => `${n} miaka`),
    phone: field(pickStr(leader.simu), "church_viongozi"),
    whatsapp: field(pickStr(leader.whatsapp, ext?.whatsapp), ext?.whatsapp ? "leadership_profiles" : "church_viongozi"),
    email: field(pickStr(leader.email), "church_viongozi"),
    physicalAddress: field(pickStr(leader.address), "church_viongozi"),
    mkoa: field(geo.mkoa, geo.mkoa && geo.mkoa !== leader.mkoa ? "hierarchy" : "church_viongozi"),
    wilaya: field(geo.wilaya, geo.wilaya && geo.wilaya !== leader.wilaya ? "hierarchy" : "church_viongozi"),
    nationality: field(pickStr(ext?.nationality, prof?.nationality), "leadership_profiles"),
    churchIdNumber: field(pickStr(ext?.church_id_number, leader.church_member_id), "leadership_profiles"),
    leadershipIdNumber: field(pickStr(ext?.leadership_id_number, leader.national_id), "leadership_profiles"),
    positionTitle: field(pickStr(leader.cheo), "church_viongozi"),
    roleCatalogTitle: field(
      catalogRole?.title_sw ?? null,
      catalogRole ? "catalog" : "computed",
    ),
    hierarchyLabel: field(hierarchyLabel, "church_viongozi"),
    dayosisi: field(pickStr(leader.dayosisi), "church_viongozi"),
    jimbo: field(pickStr(leader.jimbo), "church_viongozi"),
    tawi: field(pickStr(leader.tawi), "church_viongozi"),
    yearsInMinistry: field(
      yearsMinistry,
      ext?.years_in_ministry != null
        ? "leadership_profiles"
        : yearsMinistry != null
          ? "church_viongozi"
          : "computed",
      (n) => `${n}`,
    ),
    yearsInPosition: field(ext?.years_in_current_position, "leadership_profiles", (n) => `${n}`),
    dateStarted: field(
      pickStr(ext?.position_started_at, leader.start_date, leader.appointment_date),
      ext?.position_started_at ? "leadership_profiles" : "church_viongozi",
    ),
    dateEnded: field(pickStr(ext?.position_ended_at, leader.end_date), "leadership_profiles"),
    serviceStatus: field(
      serviceStatus,
      ext?.service_status ? "leadership_profiles" : "computed",
      (s) => SERVICE_STATUS_SW[s] ?? s,
    ),
    baptized: field(
      ext?.baptized === true ? true : ext?.baptized === false ? false : null,
      "leadership_profiles",
      (b) => (b ? "Ndiyo" : "Hapana"),
    ),
    baptismDate: field(ext?.baptism_date, "leadership_profiles"),
    baptismPlace: field(ext?.baptism_place, "leadership_profiles"),
    baptizedBy: field(ext?.baptized_by, "leadership_profiles"),
    maritalStatus: field(ext?.marital_status, "leadership_profiles"),
    educationSummary: field(
      pickStr(summarizeEducation(bundle), leader.education_summary),
      bundle?.education?.length ? "cv_engine" : "church_viongozi",
    ),
    theologyTraining: field(
      pickStr(summarizeTheology(bundle, leader), leader.theology_training),
      "cv_engine",
    ),
    professionalCourses: field(
      pickStr(summarizeProfessional(bundle, leader), leader.professional_skills),
      "cv_engine",
    ),
    approvedAt: field(ext?.approved_at, "leadership_profiles"),
    approvedByName: field(pickStr(ext?.approved_by_name, leader.pdf_issued_by_name), "leadership_profiles"),
    approvedByTitle: field(pickStr(ext?.approved_by_title, leader.pdf_issued_by_title), "leadership_profiles"),
  };

  return finalizeAutoFill(leader.id, "church_viongozi", level, fields, {
    hierarchyLabel,
    positionTitle: leader.cheo?.trim() || "—",
    biography: pickStr(prof?.biography ?? null, ext?.biography, leader.biography, leader.notes),
    photoUrl,
    signatureUrl,
    photoDataUrl: ctx.photoDataUrl ?? null,
    signatureDataUrl: ctx.signatureDataUrl ?? null,
    logoUrl: ctx.logoUrl ?? null,
    cvBundle: bundle,
    enrichedLeader,
    enrichedNational: null,
  });
}

export function buildNationalLeaderAutoFill(
  row: NationalLeadershipProfileRow,
  ctx: AutoFillLoadContext = {},
): LeadershipCredentialAutoFill {
  const level: LeadershipHierarchyLevel = "national";
  const titleSw = nationalLeadershipDisplayTitle(row, "sw");
  const catalogRole = matchRoleFromCatalog(titleSw, level, ctx.roleCatalog ?? []);
  const hierarchyLabel = "Uongozi wa Kitaifa — KMK(T)";
  const age = computeAgeFromDob(null);

  const fields: Record<string, AutoFillField<unknown>> = {
    fullName: field(pickStr(row.full_name), "national"),
    gender: field(pickStr(row.gender), "national"),
    age: field(age, "computed", (n) => `${n} miaka`),
    phone: field(pickStr(row.phone), "national"),
    whatsapp: field(pickStr(row.whatsapp), "national"),
    email: field(pickStr(row.email), "national"),
    physicalAddress: field(pickStr(row.physical_address), "national"),
    mkoa: field(pickStr(row.region), "national"),
    wilaya: field(pickStr(row.district), "national"),
    nationality: field(pickStr(row.country, "Tanzania"), "national"),
    churchIdNumber: field(null, "national"),
    leadershipIdNumber: field(row.role_key, "national"),
    positionTitle: field(titleSw, "national"),
    roleCatalogTitle: field(catalogRole?.title_sw ?? titleSw, catalogRole ? "catalog" : "national"),
    hierarchyLabel: field(hierarchyLabel, "national"),
    dayosisi: field("KMK(T) — Taifa", "national"),
    jimbo: field(null, "national"),
    tawi: field(null, "national"),
    yearsInMinistry: field(row.term_years, "national", (n) => `${n} miaka`),
    yearsInPosition: field(row.term_years, "national", (n) => `${n}`),
    dateStarted: field(pickStr(row.start_date), "national"),
    dateEnded: field(pickStr(row.end_date), "national"),
    serviceStatus: field(row.status === "active" ? "active" : "former", "national", (s) => SERVICE_STATUS_SW[s] ?? s),
    baptized: field(null, "national"),
    baptismDate: field(null, "national"),
    baptismPlace: field(null, "national"),
    baptizedBy: field(null, "national"),
    maritalStatus: field(null, "national"),
    educationSummary: field(pickStr(row.biography), "national"),
    theologyTraining: field(pickStr(row.leadership_quote), "national"),
    professionalCourses: field(null, "national"),
    approvedAt: field(null, "national"),
    approvedByName: field(null, "national"),
    approvedByTitle: field(null, "national"),
  };

  return finalizeAutoFill(row.role_key, "national_leadership", level, fields, {
    hierarchyLabel,
    positionTitle: titleSw,
    biography: pickStr(row.leadership_quote, row.biography),
    photoUrl: pickStr(row.profile_photo_url),
    signatureUrl: pickStr(row.signature_url),
    photoDataUrl: ctx.photoDataUrl ?? null,
    signatureDataUrl: ctx.signatureDataUrl ?? null,
    logoUrl: ctx.logoUrl ?? null,
    cvBundle: null,
    enrichedLeader: null,
    enrichedNational: row,
  });
}

export function autoFillLeaderRef(ref: UnifiedLeaderRef, ctx: AutoFillLoadContext): LeadershipCredentialAutoFill {
  if (ref.source === "national_leadership") {
    return buildNationalLeaderAutoFill(ref.row, ctx);
  }
  return buildChurchLeaderAutoFill(ref.leader, ctx);
}

export const AUTO_FILL_SECTIONS: { id: string; titleSw: string; titleEn: string; keys: string[] }[] = [
  {
    id: "personal",
    titleSw: "Taarifa binafsi",
    titleEn: "Personal",
    keys: ["fullName", "gender", "age", "phone", "whatsapp", "email", "physicalAddress", "mkoa", "wilaya", "nationality"],
  },
  {
    id: "ids",
    titleSw: "Vitambulisho",
    titleEn: "IDs",
    keys: ["churchIdNumber", "leadershipIdNumber"],
  },
  {
    id: "position",
    titleSw: "Cheo & muundo",
    titleEn: "Position",
    keys: ["positionTitle", "roleCatalogTitle", "hierarchyLabel", "dayosisi", "jimbo", "tawi"],
  },
  {
    id: "ministry",
    titleSw: "Huduma & muda",
    titleEn: "Ministry",
    keys: ["yearsInMinistry", "yearsInPosition", "dateStarted", "dateEnded", "serviceStatus"],
  },
  {
    id: "baptism",
    titleSw: "Ubatizo",
    titleEn: "Baptism",
    keys: ["baptized", "baptismDate", "baptismPlace", "baptizedBy"],
  },
  {
    id: "family",
    titleSw: "Hali ya ndoa",
    titleEn: "Marital",
    keys: ["maritalStatus"],
  },
  {
    id: "education",
    titleSw: "Elimu & mafunzo",
    titleEn: "Education",
    keys: ["educationSummary", "theologyTraining", "professionalCourses"],
  },
  {
    id: "approval",
    titleSw: "Uidhinishaji",
    titleEn: "Approval",
    keys: ["approvedAt", "approvedByName", "approvedByTitle"],
  },
];

export const AUTO_FILL_SOURCE_LABELS: Record<AutoFillFieldSource, string> = {
  church_viongozi: "Viongozi DB",
  leadership_profiles: "Wasifu",
  cv_engine: "CV Engine",
  hierarchy: "Muundo",
  catalog: "Catalog",
  computed: "Hesabu",
  national: "Kitaifa",
};
