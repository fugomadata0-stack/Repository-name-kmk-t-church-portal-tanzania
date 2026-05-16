import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList } from "../lib/supabaseResult";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TawiBranchMemberKpis = {
  total: number;
  male: number;
  female: number;
  youth: number;
  children: number;
  catechumen: number;
  baptized: number;
};

export type TawiBranchLeadershipKpis = {
  total: number;
  elders: number;
  jvLeaders: number;
  jwLeaders: number;
};

export type TawiBranchFinanceKpis = {
  mapatoLeo: number;
  mapatoWiki: number;
  mapatoMwezi: number;
  matumiziMwezi: number;
  saldoMwezi: number;
  pendingApprovals: number;
};

export type TawiBranchPlaceholderKpis = {
  assetsTotal: number | null;
  assetValueTz: number | null;
  assetsActive: number | null;
  projectsRevenueTz: number | null;
  projectsTotal: number | null;
  projectsActive: number | null;
  projectsInactive: number | null;
};

export type TawiBranchDashboardPayload = {
  tawiId: string;
  tawiLabel: string;
  jimboLabel: string | null;
  dayosisiLabel: string | null;
  members: TawiBranchMemberKpis;
  leadership: TawiBranchLeadershipKpis;
  finance: TawiBranchFinanceKpis;
  placeholders: TawiBranchPlaceholderKpis;
  /** Mahudhurio (kutoka RPC ya ngazi — mwezi wa sasa). */
  attendanceSessionsMonth: number;
  attendanceHeadcountMonth: number;
  loadedAt: string;
};

type MemberRow = {
  id: string;
  gender: string | null;
  birth_date: string | null;
  is_baptized: boolean | null;
  membership_status: string | null;
};

function ageFromBirth(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(String(birthDate).slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function isMaleGender(g: string | null | undefined): boolean {
  const s = String(g ?? "").toLowerCase().trim();
  return s === "m" || s === "me" || s === "male" || s.includes("kiume");
}

function isFemaleGender(g: string | null | undefined): boolean {
  const s = String(g ?? "").toLowerCase().trim();
  return s === "f" || s === "ke" || s === "female" || s.includes("mwanamke") || s.includes("wanawake");
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function isFinancePendingApproval(status: string | null | undefined): boolean {
  const s = String(status ?? "active")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[()/]/g, "");
  return ["pending", "submitted", "needs_review", "verified", "draft"].includes(s);
}

function isFinanceActiveRow(status: string | null | undefined): boolean {
  const s = String(status ?? "active").toLowerCase().replace(/\s+/g, "_");
  return s === "active" || s === "approved" || s === "posted_to_ledger";
}

async function fetchMembersLinkedToTawi(c: ReturnType<typeof getSupabase>, tawiId: string): Promise<MemberRow[]> {
  if (!c) return [];

  const famRes = await c.from("church_families").select("id").eq("tawi_id", tawiId).limit(5000);
  if (famRes.error) throw new Error(formatPostgrestError(famRes.error, "church_families.tawi"));
  const familyIds = (famRes.data ?? []).map((r) => String((r as { id: string }).id)).filter(Boolean);

  const sel = "id, gender, birth_date, is_baptized, membership_status";

  const direct = await c.from("church_members").select(sel).eq("tawi_id", tawiId).limit(8000);
  if (direct.error) throw new Error(formatPostgrestError(direct.error, "church_members.tawi"));

  let viaFamily: { data: unknown[] | null; error: { message: string } | null } = { data: [], error: null };
  if (familyIds.length) {
    const vf = await c.from("church_members").select(sel).in("family_id", familyIds).limit(8000);
    viaFamily = { data: vf.data ?? null, error: vf.error ? { message: vf.error.message } : null };
    if (viaFamily.error) throw new Error(viaFamily.error.message || "church_members.family");
  }

  const map = new Map<string, MemberRow>();
  const ingest = (rows: unknown[]) => {
    for (const raw of rows) {
      const r = raw as Record<string, unknown>;
      const id = String(r.id ?? "");
      if (!id) continue;
      map.set(id, {
        id,
        gender: r.gender != null ? String(r.gender) : null,
        birth_date: r.birth_date != null ? String(r.birth_date).slice(0, 10) : null,
        is_baptized: Boolean(r.is_baptized),
        membership_status: r.membership_status != null ? String(r.membership_status) : null,
      });
    }
  };
  ingest(direct.data ?? []);
  ingest(viaFamily.data ?? []);
  return [...map.values()];
}

function aggregateMemberKpis(rows: MemberRow[]): TawiBranchMemberKpis {
  let male = 0;
  let female = 0;
  let youth = 0;
  let children = 0;
  let catechumen = 0;
  let baptized = 0;

  for (const m of rows) {
    if (isMaleGender(m.gender)) male += 1;
    else if (isFemaleGender(m.gender)) female += 1;
    const age = ageFromBirth(m.birth_date);
    if (age != null && age >= 13 && age <= 35) youth += 1;
    if (age != null && age < 13) children += 1;
    const ms = String(m.membership_status ?? "active").toLowerCase();
    const isCat = ms === "visitor" || (!m.is_baptized && ms === "active" && (age == null || age >= 6));
    if (isCat) catechumen += 1;
    if (m.is_baptized) baptized += 1;
  }

  return {
    total: rows.length,
    male,
    female,
    youth,
    children,
    catechumen,
    baptized,
  };
}

async function fetchLeadershipKpis(c: ReturnType<typeof getSupabase>, tawiId: string): Promise<TawiBranchLeadershipKpis> {
  if (!c) return { total: 0, elders: 0, jvLeaders: 0, jwLeaders: 0 };
  const res = await c
    .from("church_viongozi")
    .select("id, jina, cheo, jumuiya_name, status")
    .eq("tawi_id", tawiId)
    .limit(2000);
  if (res.error) throw new Error(formatPostgrestError(res.error, "church_viongozi.tawi"));
  const rows = unwrapList(res, "church_viongozi.tawi.list");
  let elders = 0;
  let jvLeaders = 0;
  let jwLeaders = 0;
  let active = 0;
  for (const raw of rows) {
    const r = raw as Record<string, unknown>;
    const st = String(r.status ?? "active").toLowerCase();
    if (st === "archived" || st === "inactive") continue;
    active += 1;
    const cheo = String(r.cheo ?? "").toLowerCase();
    const jn = String(r.jina ?? "").toLowerCase();
    const jm = String(r.jumuiya_name ?? "").toLowerCase();
    if (cheo.includes("mzee") || jn.includes("mzee")) elders += 1;
    if (jm.includes("jv") || jm.includes("vijana")) jvLeaders += 1;
    if (jm.includes("jw") || jm.includes("wanawake")) jwLeaders += 1;
  }
  return { total: active, elders, jvLeaders, jwLeaders };
}

async function fetchFinanceKpis(c: ReturnType<typeof getSupabase>, tawiId: string): Promise<TawiBranchFinanceKpis> {
  const empty: TawiBranchFinanceKpis = {
    mapatoLeo: 0,
    mapatoWiki: 0,
    mapatoMwezi: 0,
    matumiziMwezi: 0,
    saldoMwezi: 0,
    pendingApprovals: 0,
  };
  if (!c) return empty;

  const now = new Date();
  const today = ymd(now);
  const w0 = startOfWeekMonday(now);
  const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const res = await c
    .from("church_finance_entries")
    .select("entry_date, amount_tz, aina, status")
    .eq("tawi_id", tawiId)
    .gte("entry_date", ymd(new Date(now.getFullYear(), now.getMonth() - 2, 1)))
    .lte("entry_date", monthEnd)
    .limit(8000);
  if (res.error) throw new Error(formatPostgrestError(res.error, "church_finance_entries.tawi"));

  let mapatoLeo = 0;
  let mapatoWiki = 0;
  let mapatoMwezi = 0;
  let matumiziMwezi = 0;
  let pendingApprovals = 0;

  for (const raw of res.data ?? []) {
    const r = raw as Record<string, unknown>;
    const dt = String(r.entry_date ?? "").slice(0, 10);
    const amt = typeof r.amount_tz === "number" ? r.amount_tz : Number(r.amount_tz);
    const kiasi = Number.isFinite(amt) ? amt : 0;
    const aina = String(r.aina ?? "");
    const st = String(r.status ?? "active");

    if (isFinancePendingApproval(st)) pendingApprovals += 1;

    if (!isFinanceActiveRow(st)) continue;

    if (aina === "Mapato") {
      if (dt === today) mapatoLeo += kiasi;
      if (dt >= ymd(w0) && dt <= today) mapatoWiki += kiasi;
      if (dt >= monthStart && dt <= monthEnd) mapatoMwezi += kiasi;
    }
    if (aina === "Matumizi" && dt >= monthStart && dt <= monthEnd) {
      matumiziMwezi += kiasi;
    }
  }

  return {
    mapatoLeo,
    mapatoWiki,
    mapatoMwezi,
    matumiziMwezi,
    saldoMwezi: mapatoMwezi - matumiziMwezi,
    pendingApprovals,
  };
}

/** Muhtasari wa KPI za tawi moja — data halisi kutoka Supabase (sehemu za assets/miradi bado placeholder). */
export async function fetchTawiBranchDashboardPayload(tawiId: string): Promise<TawiBranchDashboardPayload | null> {
  const id = tawiId.trim();
  if (!id || !UUID_RE.test(id)) return null;

  const c = getSupabase();
  if (!c) return null;

  const twRes = await c
    .from("church_tawi")
    .select("id, jina, jimbo_id, church_jimbo ( jina, dayosisi ( jina ) )")
    .eq("id", id)
    .maybeSingle();
  if (twRes.error) throw new Error(formatPostgrestError(twRes.error, "church_tawi.one"));
  const tw = twRes.data as Record<string, unknown> | null;
  if (!tw) return null;

  const jb = tw.church_jimbo as { jina?: string; dayosisi_id?: string; dayosisi?: { jina?: string } } | null;
  const tawiLabel = String(tw.jina ?? "").trim() || "Tawi";
  const jimboLabel = jb?.jina != null ? String(jb.jina).trim() : null;
  const dayosisiLabel = jb?.dayosisi?.jina != null ? String(jb.dayosisi.jina).trim() : null;

  const [memberRows, leadership, finance] = await Promise.all([
    fetchMembersLinkedToTawi(c, id),
    fetchLeadershipKpis(c, id),
    fetchFinanceKpis(c, id),
  ]);

  const members = aggregateMemberKpis(memberRows);

  let attendanceSessionsMonth = 0;
  let attendanceHeadcountMonth = 0;
  try {
    const { fetchNgaziOperationsSummary } = await import("./ngaziOperationsService");
    const now = new Date();
    const from = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const ngazi = await fetchNgaziOperationsSummary({ tawiId: id, from, to });
    const row = ngazi?.levels?.find((l) => l.ngazi === "tawi" && l.entity_id === id);
    if (row) {
      attendanceSessionsMonth = row.attendance_sessions;
      attendanceHeadcountMonth = row.attendance_total;
    }
  } catch {
    /* RPC haipatikani — acha zeros */
  }

  const placeholders: TawiBranchPlaceholderKpis = {
    assetsTotal: null,
    assetValueTz: null,
    assetsActive: null,
    projectsRevenueTz: null,
    projectsTotal: null,
    projectsActive: null,
    projectsInactive: null,
  };

  return {
    tawiId: id,
    tawiLabel,
    jimboLabel,
    dayosisiLabel,
    members,
    leadership,
    finance,
    placeholders,
    attendanceSessionsMonth,
    attendanceHeadcountMonth,
    loadedAt: new Date().toISOString(),
  };
}

export function isValidTawiDashboardId(id: string): boolean {
  return UUID_RE.test(id.trim());
}
