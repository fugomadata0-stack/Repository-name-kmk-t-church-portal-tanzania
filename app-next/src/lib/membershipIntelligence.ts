import type { MembershipCategoryStats } from "../services/phase1FoundationService";

export type MinistrySegment = "none" | "ke" | "me" | "jvkmkt" | "jwkmkt";

export const MINISTRY_SEGMENT_OPTIONS: { value: MinistrySegment; sw: string; en: string }[] = [
  { value: "none", sw: "Hakuna", en: "None" },
  { value: "ke", sw: "KE", en: "Women's Union" },
  { value: "me", sw: "ME", en: "Men's Union" },
  { value: "jvkmkt", sw: "JVKMK(T)", en: "Youth Union" },
  { value: "jwkmkt", sw: "JWKMK(T)", en: "Women's Youth" },
];

export function parseMinistrySegment(raw: unknown): MinistrySegment {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "ke") return "ke";
  if (s === "me") return "me";
  if (s === "jvkmkt" || s === "jv" || s.includes("vijana")) return "jvkmkt";
  if (s === "jwkmkt" || s === "jw") return "jwkmkt";
  return "none";
}

function ageFromBirth(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function isMale(g: string | null | undefined): boolean {
  const x = String(g ?? "").toLowerCase();
  return ["m", "me", "male", "kiume", "mwanaume", "wanaume"].includes(x);
}

function isFemale(g: string | null | undefined): boolean {
  const x = String(g ?? "").toLowerCase();
  return ["f", "ke", "female", "kike", "mwanamke", "wanawake"].includes(x);
}

export type MemberIntelRow = {
  gender?: string | null;
  birth_date?: string | null;
  membership_status?: string | null;
  is_baptized?: boolean | null;
  ministry_segment?: string | null;
};

/** Hesabu ya ndani (fallback ikiwa RPC haipatikani) — inalingana na SQL. */
export function aggregateMembershipCategories(rows: MemberIntelRow[]): MembershipCategoryStats {
  let wanaume = 0;
  let wanawake = 0;
  let vijana = 0;
  let watoto = 0;
  let wazee = 0;
  let wageni = 0;
  let waliobatizwa = 0;
  let wasio_batizwa = 0;
  let ke = 0;
  let me = 0;
  let jvkmkt = 0;
  let jwkmkt = 0;

  for (const m of rows) {
    if (isMale(m.gender)) wanaume += 1;
    else if (isFemale(m.gender)) wanawake += 1;
    const age = ageFromBirth(m.birth_date ?? null);
    if (age != null && age >= 13 && age <= 35) vijana += 1;
    if (age != null && age < 13) watoto += 1;
    if (age != null && age >= 60) wazee += 1;
    if (String(m.membership_status ?? "").toLowerCase() === "visitor") wageni += 1;
    if (m.is_baptized) waliobatizwa += 1;
    else wasio_batizwa += 1;
    const seg = parseMinistrySegment(m.ministry_segment);
    if (seg === "ke") ke += 1;
    if (seg === "me") me += 1;
    if (seg === "jvkmkt") jvkmkt += 1;
    if (seg === "jwkmkt") jwkmkt += 1;
  }

  return {
    total: rows.length,
    wanaume,
    wanawake,
    vijana,
    watoto,
    wazee,
    wageni,
    waliobatizwa,
    wasio_batizwa,
    ke,
    me,
    jvkmkt,
    jwkmkt,
  };
}

export function categoryChartData(categories: MembershipCategoryStats): { name: string; value: number }[] {
  return [
    { name: "Wanaume", value: categories.wanaume },
    { name: "Wanawake", value: categories.wanawake },
    { name: "Vijana", value: categories.vijana },
    { name: "Watoto", value: categories.watoto },
    { name: "Wazee", value: categories.wazee },
    { name: "Wageni", value: categories.wageni },
    { name: "Waliobatizwa", value: categories.waliobatizwa },
    { name: "Wasio batizwa", value: categories.wasio_batizwa },
    { name: "KE", value: categories.ke },
    { name: "ME", value: categories.me },
    { name: "JVKMK(T)", value: categories.jvkmkt },
    { name: "JWKMK(T)", value: categories.jwkmkt },
  ].filter((x) => x.value > 0);
}
