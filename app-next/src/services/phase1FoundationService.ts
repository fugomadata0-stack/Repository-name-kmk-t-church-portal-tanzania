import { getSupabaseOrThrow } from "../lib/supabaseClient";

export type Phase1Scope = "tawi" | "jimbo" | "dayosisi" | "kmkt";

export type MembershipCategoryStats = {
  total: number;
  wanaume: number;
  wanawake: number;
  vijana: number;
  watoto: number;
  wazee: number;
  wageni: number;
  waliobatizwa: number;
  wasio_batizwa: number;
  ke: number;
  me: number;
  jvkmkt: number;
  jwkmkt: number;
};

export type MembershipStatisticsResult = {
  scope: Phase1Scope;
  entity_id: string | null;
  generated_at?: string;
  categories: MembershipCategoryStats;
  error?: string;
};

export type FinanceDistributionSummary = {
  scope: Phase1Scope;
  entity_id: string | null;
  period_start: string;
  period_end: string;
  income_total: number;
  income_local: number;
  income_upward: number;
  expenses_total: number;
  balance: number;
  transfers_approved: number;
  transfers_pending: number;
  direct_kmkt_total?: number;
  remaining: number;
  error?: string;
};

export type InstitutionProjectType =
  | "bible_college"
  | "school"
  | "hospital"
  | "clinic"
  | "hospital_clinic"
  | "admin_center"
  | "mission_center"
  | "training_center"
  | "other";

export type ChurchInstitutionProject = {
  id: string;
  project_type: InstitutionProjectType;
  name: string;
  registration_number: string | null;
  location_region: string | null;
  location_district: string | null;
  location_address: string | null;
  leader_name: string | null;
  leader_phone: string | null;
  leader_title: string | null;
  dayosisi_id: string | null;
  jimbo_id: string | null;
  tawi_id: string | null;
  budget_income_tz: number;
  budget_expense_tz: number;
  balance_tz: number;
  approval_status: string;
  documents_json: unknown;
  kpi_json: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type IncomeDistributionSetting = {
  id: string;
  scope_level: Phase1Scope;
  entity_id: string | null;
  retain_percent: number;
  upward_percent: number;
  direct_to_kmkt_allowed: boolean;
  notes: string | null;
};

export type IncomeRemittance = {
  id: string;
  income_line_id: string | null;
  from_level: string;
  to_level: string;
  from_entity_id: string | null;
  to_entity_id: string | null;
  amount_tz: number;
  transfer_amount_tz: number;
  remaining_amount_tz: number;
  approval_status: string;
  receipt_number: string | null;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  created_at: string;
};

const EMPTY_CATEGORIES: MembershipCategoryStats = {
  total: 0,
  wanaume: 0,
  wanawake: 0,
  vijana: 0,
  watoto: 0,
  wazee: 0,
  wageni: 0,
  waliobatizwa: 0,
  wasio_batizwa: 0,
  ke: 0,
  me: 0,
  jvkmkt: 0,
  jwkmkt: 0,
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseCategories(raw: unknown): MembershipCategoryStats {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CATEGORIES };
  const o = raw as Record<string, unknown>;
  return {
    total: num(o.total),
    wanaume: num(o.wanaume),
    wanawake: num(o.wanawake),
    vijana: num(o.vijana),
    watoto: num(o.watoto),
    wazee: num(o.wazee),
    wageni: num(o.wageni),
    waliobatizwa: num(o.waliobatizwa),
    wasio_batizwa: num(o.wasio_batizwa),
    ke: num(o.ke),
    me: num(o.me),
    jvkmkt: num(o.jvkmkt),
    jwkmkt: num(o.jwkmkt),
  };
}

export async function fetchMembershipStatistics(
  scope: Phase1Scope = "kmkt",
  entityId?: string | null
): Promise<MembershipStatisticsResult> {
  const { data, error } = await getSupabaseOrThrow().rpc("portal_membership_statistics", {
    p_scope: scope,
    p_entity_id: entityId ?? null,
  });
  if (error) {
    return {
      scope,
      entity_id: entityId ?? null,
      categories: { ...EMPTY_CATEGORIES },
      error: error.message,
    };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  if (row.error === "forbidden") {
    return {
      scope,
      entity_id: entityId ?? null,
      categories: { ...EMPTY_CATEGORIES },
      error: "Huna ruhusa ya kuona takwimu za uanachama.",
    };
  }
  return {
    scope: (String(row.scope ?? scope) as Phase1Scope) || scope,
    entity_id: (row.entity_id as string | null) ?? entityId ?? null,
    generated_at: row.generated_at as string | undefined,
    categories: parseCategories(row.categories),
  };
}

export async function fetchFinanceDistributionSummary(
  scope: Phase1Scope = "kmkt",
  entityId?: string | null,
  periodStart?: string,
  periodEnd?: string
): Promise<FinanceDistributionSummary> {
  const { data, error } = await getSupabaseOrThrow().rpc("portal_finance_distribution_summary", {
    p_scope: scope,
    p_entity_id: entityId ?? null,
    p_period_start: periodStart ?? null,
    p_period_end: periodEnd ?? null,
  });
  const empty: FinanceDistributionSummary = {
    scope,
    entity_id: entityId ?? null,
    period_start: periodStart ?? "",
    period_end: periodEnd ?? "",
    income_total: 0,
    income_local: 0,
    income_upward: 0,
    expenses_total: 0,
    balance: 0,
    transfers_approved: 0,
    transfers_pending: 0,
    direct_kmkt_total: 0,
    remaining: 0,
  };
  if (error) return { ...empty, error: error.message };
  const row = (data ?? {}) as Record<string, unknown>;
  if (row.error === "forbidden") {
    return { ...empty, error: "Huna ruhusa ya kuona muhtasari wa fedha." };
  }
  return {
    scope: (String(row.scope ?? scope) as Phase1Scope) || scope,
    entity_id: (row.entity_id as string | null) ?? entityId ?? null,
    period_start: String(row.period_start ?? periodStart ?? ""),
    period_end: String(row.period_end ?? periodEnd ?? ""),
    income_total: num(row.income_total),
    income_local: num(row.income_local),
    income_upward: num(row.income_upward),
    expenses_total: num(row.expenses_total),
    balance: num(row.balance),
    transfers_approved: num(row.transfers_approved),
    transfers_pending: num(row.transfers_pending),
    direct_kmkt_total: num(row.direct_kmkt_total),
    remaining: num(row.remaining),
  };
}

export async function listInstitutionProjectsForScope(
  scope: Phase1Scope = "kmkt",
  entityId?: string | null
): Promise<ChurchInstitutionProject[]> {
  const all = await listInstitutionProjects();
  if (scope === "kmkt" || !entityId) return all;
  if (scope === "dayosisi") return all.filter((p) => p.dayosisi_id === entityId);
  if (scope === "jimbo") return all.filter((p) => p.jimbo_id === entityId);
  if (scope === "tawi") return all.filter((p) => p.tawi_id === entityId);
  return all;
}

export async function listInstitutionProjects(): Promise<ChurchInstitutionProject[]> {
  const { data, error } = await getSupabaseOrThrow()
    .from("church_institution_projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ChurchInstitutionProject[];
}

export async function upsertInstitutionProject(
  row: Partial<ChurchInstitutionProject> & { name: string; project_type: InstitutionProjectType }
): Promise<ChurchInstitutionProject> {
  const payload = {
    ...row,
    balance_tz: num(row.budget_income_tz) - num(row.budget_expense_tz),
    updated_at: new Date().toISOString(),
  };
  if (row.id) {
    const { data, error } = await getSupabaseOrThrow()
      .from("church_institution_projects")
      .update(payload)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as ChurchInstitutionProject;
  }
  const { data, error } = await getSupabaseOrThrow()
    .from("church_institution_projects")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ChurchInstitutionProject;
}

export async function listIncomeDistributionSettings(): Promise<IncomeDistributionSetting[]> {
  const { data, error } = await getSupabaseOrThrow()
    .from("church_income_distribution_settings")
    .select("*")
    .order("scope_level");
  if (error) throw new Error(error.message);
  return (data ?? []) as IncomeDistributionSetting[];
}

export async function listIncomeRemittances(limit = 100): Promise<IncomeRemittance[]> {
  const { data, error } = await getSupabaseOrThrow()
    .from("church_income_remittances")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as IncomeRemittance[];
}

export const PROJECT_TYPE_LABELS: Record<InstitutionProjectType, string> = {
  bible_college: "Chuo cha Biblia / Bible College",
  school: "Shule / School",
  hospital: "Hospitali / Hospital",
  clinic: "Kliniki / Clinic",
  hospital_clinic: "Hospitali & Kliniki",
  admin_center: "Kituo cha Utawala / Admin Center",
  mission_center: "Kituo cha Uinjilisti / Mission Center",
  training_center: "Kituo cha Mafunzo / Training Center",
  other: "Nyingine / Other",
};

export const MEMBERSHIP_CATEGORY_LABELS: { key: keyof MembershipCategoryStats; sw: string; en: string }[] = [
  { key: "total", sw: "Jumla", en: "Total" },
  { key: "wanaume", sw: "Wanaume", en: "Men" },
  { key: "wanawake", sw: "Wanawake", en: "Women" },
  { key: "vijana", sw: "Vijana", en: "Youth" },
  { key: "watoto", sw: "Watoto", en: "Children" },
  { key: "wazee", sw: "Wazee", en: "Elders" },
  { key: "wageni", sw: "Wageni", en: "Visitors" },
  { key: "waliobatizwa", sw: "Waliobatizwa", en: "Baptized" },
  { key: "wasio_batizwa", sw: "Wasio batizwa", en: "Not baptized" },
  { key: "ke", sw: "KE", en: "Women's Union" },
  { key: "me", sw: "ME", en: "Men's Union" },
  { key: "jvkmkt", sw: "JVKMK(T)", en: "Youth Union" },
  { key: "jwkmkt", sw: "JWKMK(T)", en: "Women's Youth" },
];
