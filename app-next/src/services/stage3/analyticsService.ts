import { formatPostgrestError, logSupabaseQueryError } from "../../lib/supabaseErrors";
import { getSupabase } from "../../lib/supabaseClient";
import type { AnalyticsDashboardPayload } from "../../types";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return 0;
}

function ym(dateLike: string | null | undefined): string {
  const s = String(dateLike ?? "");
  return s.length >= 7 ? s.slice(0, 7) : "";
}

function ymd(dateLike: string | null | undefined): string {
  const s = String(dateLike ?? "");
  return s.length >= 10 ? s.slice(0, 10) : "";
}

function groupSum(rows: Record<string, unknown>[], key: string, valueKey: string): { label: string; amount: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[key] ?? "").trim() || "Haijabainishwa";
    const v = num(r[valueKey]);
    m.set(k, (m.get(k) ?? 0) + v);
  }
  return [...m.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function groupCount(rows: Record<string, unknown>[], key: string): { label: string; total: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[key] ?? "").trim() || "Haijabainishwa";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
}

function parsePayload(raw: unknown): AnalyticsDashboardPayload {
  const o = raw as Record<string, unknown>;
  const totals = (o.totals as Record<string, unknown>) || {};
  const period = (o.period as Record<string, unknown>) || {};
  const range = (o.range as Record<string, unknown>) || {};

  const finance_by_month = Array.isArray(o.finance_by_month)
    ? (o.finance_by_month as Record<string, unknown>[]).map((r) => ({
        month: String(r.month ?? ""),
        mapato: num(r.mapato),
      }))
    : [];

  const recent_activity = Array.isArray(o.recent_activity)
    ? (o.recent_activity as Record<string, unknown>[]).map((r) => ({
        kind: String(r.kind ?? ""),
        label: String(r.label ?? ""),
        at: String(r.at ?? ""),
      }))
    : [];

  return {
    range: { from: String(range.from ?? ""), to: String(range.to ?? "") },
    category_filter: o.category_filter == null ? null : String(o.category_filter),
    totals: {
      members: num(totals.members),
      families: num(totals.families),
      finance_entries: num(totals.finance_entries),
      income_sources: num(totals.income_sources),
      income_lines: num(totals.income_lines),
      documents: num(totals.documents),
      sermons: num(totals.sermons),
      events: num(totals.events),
      videos: num(totals.videos),
      audios: num(totals.audios),
      media_total: num(totals.media_total),
      dayosisi: num(totals.dayosisi),
      majimbo: num(totals.majimbo),
      matawi: num(totals.matawi),
      jumuiya: num(totals.jumuiya),
      idara: num(totals.idara),
      taasisi: num(totals.taasisi),
      leaders_total: num(totals.leaders_total),
      leaders_active: num(totals.leaders_active),
      leaders_pending: num(totals.leaders_pending),
      leaders_expiring_terms: num(totals.leaders_expiring_terms),
      members_active: num(totals.members_active),
      members_pending: num(totals.members_pending),
      notifications: num(totals.notifications),
      audit_logs: num(totals.audit_logs),
      failed_logins: num(totals.failed_logins),
    },
    period: {
      members_new: num(period.members_new),
      families_new: num(period.families_new),
      finance_entries: num(period.finance_entries),
      finance_income_sum: num(period.finance_income_sum),
      income_lines_sum: num(period.income_lines_sum),
      documents: num(period.documents),
      sermons: num(period.sermons),
      events: num(period.events),
      videos: num(period.videos),
      audios: num(period.audios),
    },
    finance_by_month,
    income_by_category: Array.isArray(o.income_by_category) ? (o.income_by_category as any) : [],
    income_by_source: Array.isArray(o.income_by_source) ? (o.income_by_source as any) : [],
    budget_vs_actual: Array.isArray(o.budget_vs_actual) ? (o.budget_vs_actual as any) : [],
    top_branches: Array.isArray(o.top_branches) ? (o.top_branches as any) : [],
    members_growth: Array.isArray(o.members_growth) ? (o.members_growth as any) : [],
    members_by_region: Array.isArray(o.members_by_region) ? (o.members_by_region as any) : [],
    members_by_gender: Array.isArray(o.members_by_gender) ? (o.members_by_gender as any) : [],
    members_by_age_group: Array.isArray(o.members_by_age_group) ? (o.members_by_age_group as any) : [],
    leaders_by_level: Array.isArray(o.leaders_by_level) ? (o.leaders_by_level as any) : [],
    term_expiry_trend: Array.isArray(o.term_expiry_trend) ? (o.term_expiry_trend as any) : [],
    leadership_distribution: Array.isArray(o.leadership_distribution) ? (o.leadership_distribution as any) : [],
    media_uploads_by_month: Array.isArray(o.media_uploads_by_month) ? (o.media_uploads_by_month as any) : [],
    documents_by_category: Array.isArray(o.documents_by_category) ? (o.documents_by_category as any) : [],
    livestream_trend: Array.isArray(o.livestream_trend) ? (o.livestream_trend as any) : [],
    login_activity: Array.isArray(o.login_activity) ? (o.login_activity as any) : [],
    audit_activity: Array.isArray(o.audit_activity) ? (o.audit_activity as any) : [],
    notification_trend: Array.isArray(o.notification_trend) ? (o.notification_trend as any) : [],
    leaders_by_level_total: Array.isArray(o.leaders_by_level_total) ? (o.leaders_by_level_total as any) : [],
    realtime_status: (o.realtime_status as "online" | "offline") ?? "online",
    storage_usage_mb: num(o.storage_usage_mb),
    recent_activity,
  };
}

/** Takwimu za dashibodi — RPC inatumia RLS ya analytics kwenye seva. */
export async function fetchPortalAnalyticsDashboard(params: {
  from?: string | null;
  to?: string | null;
  category?: string | null;
  year?: string | null;
  month?: string | null;
  dayosisi_id?: string | null;
  jimbo_id?: string | null;
  tawi_id?: string | null;
  source?: string | null;
  leadership_level?: string | null;
  department?: string | null;
}): Promise<AnalyticsDashboardPayload> {
  const c = clientOrThrow();
  const from = params.from ?? null;
  const to = params.to ?? null;
  const category = params.category?.trim() ? params.category.trim() : null;
  const monthFilter = params.month?.trim() || null;

  const safe = async <T>(name: string, q: PromiseLike<{ data: T; error: any }>, fallback: T): Promise<T> => {
    const res = await q;
    if (res.error) {
      logSupabaseQueryError(res.error, {
        table: name,
        action: "select",
        context: `analytics.${name}`,
        queryPurpose: "dashboard_kpi_fetch",
      });
      console.warn(formatPostgrestError(res.error, `analytics.${name}`));
      return fallback;
    }
    return (res.data ?? fallback) as T;
  };

  const applyDate = (q: any, column: string) => {
    let out = q;
    if (from) out = out.gte(column, from);
    if (to) out = out.lte(column, to);
    return out;
  };

  const [
    members,
    families,
    leaders,
    finance,
    incomeLines,
    docs,
    events,
    videos,
    audios,
    news,
    streams,
    audits,
    notifications,
    dayosisi,
    majimbo,
    matawi,
  ] = await Promise.all([
    safe("members", applyDate(c.from("church_members").select("*"), "created_at"), [] as any[]),
    safe("families", applyDate(c.from("church_families").select("*"), "created_at"), [] as any[]),
    safe(
      "leaders",
      applyDate(c.from("church_viongozi").select("*").not("status", "eq", "archived"), "created_at"),
      [] as any[]
    ),
    safe("finance", applyDate(c.from("church_finance_entries").select("*"), "entry_date"), [] as any[]),
    safe("income_lines", applyDate(c.from("church_income_lines").select("*"), "collection_date"), [] as any[]),
    safe("documents", applyDate(c.from("documents").select("*"), "created_at"), [] as any[]),
    safe("events", applyDate(c.from("events").select("*"), "created_at"), [] as any[]),
    safe("videos", applyDate(c.from("videos").select("*"), "created_at"), [] as any[]),
    safe("audios", applyDate(c.from("audios").select("*"), "created_at"), [] as any[]),
    safe("news", applyDate(c.from("news_posts").select("*"), "created_at"), [] as any[]),
    safe("streams", applyDate(c.from("live_streams").select("*"), "created_at"), [] as any[]),
    safe("audit", applyDate(c.from("audit_logs").select("*"), "created_at"), [] as any[]),
    safe("notifications", applyDate(c.from("notifications").select("*"), "created_at"), [] as any[]),
    safe("dayosisi", c.from("dayosisi").select("*"), [] as any[]),
    safe("majimbo", c.from("church_jimbo").select("*"), [] as any[]),
    safe("matawi", c.from("church_tawi").select("*"), [] as any[]),
  ]);

  const filteredIncome = incomeLines.filter((r) => {
    if (category && !String(r.main_category ?? r.sub_category ?? r.source_name ?? "").toLowerCase().includes(category.toLowerCase())) return false;
    if (params.source && !String(r.source_name ?? "").toLowerCase().includes(params.source.toLowerCase())) return false;
    if (params.dayosisi_id && String(r.dayosisi_id ?? "") !== params.dayosisi_id) return false;
    if (params.jimbo_id && String(r.jimbo_id ?? "") !== params.jimbo_id) return false;
    if (params.tawi_id && String(r.tawi_id ?? "") !== params.tawi_id) return false;
    if (monthFilter && ym(r.collection_date) !== monthFilter) return false;
    return true;
  });
  const filteredFinance = finance.filter((r) => {
    if (category && !String(r.kategoria ?? "").toLowerCase().includes(category.toLowerCase())) return false;
    if (params.dayosisi_id && String(r.dayosisi_id ?? "") !== params.dayosisi_id) return false;
    if (params.jimbo_id && String(r.jimbo_id ?? "") !== params.jimbo_id) return false;
    if (params.tawi_id && String(r.tawi_id ?? "") !== params.tawi_id) return false;
    if (monthFilter && ym(r.entry_date) !== monthFilter) return false;
    return true;
  });
  const filteredMembers = members.filter((r) => {
    if (params.dayosisi_id && String(r.dayosisi_id ?? "") !== params.dayosisi_id) return false;
    if (params.jimbo_id && String(r.jimbo_id ?? "") !== params.jimbo_id) return false;
    if (params.tawi_id && String(r.tawi_id ?? "") !== params.tawi_id) return false;
    if (monthFilter && ym(r.created_at) !== monthFilter) return false;
    return true;
  });
  const filteredLeaders = leaders.filter((r) => {
    if (params.leadership_level && String(r.leadership_level ?? r.ngazi ?? "").toLowerCase() !== params.leadership_level.toLowerCase()) return false;
    if (params.department && !String(r.idara_name ?? r.huduma_name ?? "").toLowerCase().includes(params.department.toLowerCase())) return false;
    return true;
  });

  const financeByMonthMap = new Map<string, number>();
  [...filteredFinance, ...filteredIncome].forEach((r) => {
    const m = ym(String((r as any).entry_date ?? (r as any).collection_date ?? ""));
    if (!m) return;
    financeByMonthMap.set(m, (financeByMonthMap.get(m) ?? 0) + num((r as any).amount_tz));
  });
  const finance_by_month = [...financeByMonthMap.entries()].map(([month, mapato]) => ({ month, mapato })).sort((a, b) => a.month.localeCompare(b.month));

  const budget = filteredIncome.filter((r) => String(r.budgeted ?? "") === "Yes").reduce((s, r) => s + num(r.amount_tz), 0);
  const actual = filteredIncome.reduce((s, r) => s + num(r.amount_tz), 0);

  const now = new Date();
  const in30 = new Date();
  in30.setDate(now.getDate() + 30);

  const payload: AnalyticsDashboardPayload = parsePayload({
    range: { from: from ?? "", to: to ?? "" },
    category_filter: category,
    filters: {
      year: params.year ?? null,
      month: params.month ?? null,
      dayosisi_id: params.dayosisi_id ?? null,
      jimbo_id: params.jimbo_id ?? null,
      tawi_id: params.tawi_id ?? null,
      source: params.source ?? null,
      leadership_level: params.leadership_level ?? null,
      department: params.department ?? null,
    },
    totals: {
      members: filteredMembers.length,
      families: families.length,
      finance_entries: filteredFinance.length,
      income_sources: 0,
      income_lines: filteredIncome.length,
      documents: docs.length,
      sermons: 0,
      events: events.length,
      videos: videos.length,
      audios: audios.length,
      media_total: docs.length + videos.length + audios.length + news.length,
      dayosisi: (dayosisi ?? []).length,
      majimbo: (majimbo ?? []).length,
      matawi: (matawi ?? []).length,
      jumuiya: 0,
      idara: 0,
      taasisi: 0,
      leaders_total: filteredLeaders.length,
      leaders_active: filteredLeaders.filter((r) => String(r.term_status ?? "active") === "active").length,
      leaders_pending: filteredLeaders.filter((r) => String(r.term_status ?? "") === "pending").length,
      leaders_expiring_terms:
        filteredLeaders.filter((r) => {
          const e = String(r.end_date ?? "");
          if (!e) return false;
          const d = new Date(e);
          return d >= now && d <= in30;
        }).length,
      members_active: filteredMembers.filter((r) => String(r.membership_status ?? "") === "active").length,
      members_pending: filteredMembers.filter((r) => String(r.membership_status ?? "") === "visitor").length,
      notifications: notifications.length,
      audit_logs: audits.length,
      failed_logins: notifications.filter((n) => String(n.type ?? "") === "auth" && String(n.priority ?? "") !== "success").length,
    },
    period: {
      members_new: filteredMembers.length,
      families_new: families.length,
      finance_entries: filteredFinance.length,
      finance_income_sum: filteredFinance.filter((r) => String(r.aina ?? "") === "Mapato").reduce((s, r) => s + num(r.amount_tz), 0),
      income_lines_sum: filteredIncome.reduce((s, r) => s + num(r.amount_tz), 0),
      documents: docs.length,
      sermons: 0,
      events: events.length,
      videos: videos.length,
      audios: audios.length,
    },
    finance_by_month,
    income_by_category: groupSum(filteredIncome, "main_category", "amount_tz").slice(0, 12),
    income_by_source: groupSum(filteredIncome, "source_name", "amount_tz").slice(0, 12),
    budget_vs_actual: [{ label: "Current period", budget, actual }],
    top_branches: groupSum(filteredIncome, "branch_center", "amount_tz").slice(0, 10),
    members_growth: groupCount(filteredMembers.map((r) => ({ month: ym(String(r.created_at ?? "")) })), "month").map((x) => ({ month: x.label, total: x.total })),
    members_by_region: groupCount(filteredMembers, "region_name").slice(0, 12),
    members_by_gender: groupCount(filteredMembers, "gender"),
    members_by_age_group: (() => {
      const groups = { "0-17": 0, "18-35": 0, "36-55": 0, "56+": 0, Unknown: 0 };
      filteredMembers.forEach((m) => {
        const bd = String((m as any).birth_date ?? "");
        if (!bd) {
          groups.Unknown += 1;
          return;
        }
        const age = Math.max(0, now.getFullYear() - Number(bd.slice(0, 4)));
        if (age <= 17) groups["0-17"] += 1;
        else if (age <= 35) groups["18-35"] += 1;
        else if (age <= 55) groups["36-55"] += 1;
        else groups["56+"] += 1;
      });
      return Object.entries(groups).map(([label, total]) => ({ label, total }));
    })(),
    leaders_by_level: groupCount(filteredLeaders, "leadership_level"),
    term_expiry_trend: groupCount(filteredLeaders.map((r) => ({ month: ym(String(r.end_date ?? "")) })), "month").map((x) => ({ month: x.label, total: x.total })),
    leadership_distribution: groupCount(filteredLeaders, "cheo").slice(0, 12),
    media_uploads_by_month: groupCount(
      [...docs, ...videos, ...audios, ...news, ...events, ...streams].map((r) => ({ month: ym(String((r as any).created_at ?? "")) })),
      "month"
    ).map((x) => ({ month: x.label, total: x.total })),
    documents_by_category: groupCount(docs, "category").slice(0, 12),
    livestream_trend: groupCount(streams.map((s) => ({ month: ym(String((s as any).scheduled_at ?? (s as any).created_at ?? "")) })), "month").map((x) => ({
      month: x.label,
      total: x.total,
    })),
    login_activity: groupCount(
      notifications.filter((n) => String(n.type ?? "") === "auth").map((n) => ({ day: ymd(String((n as any).created_at ?? "")) })),
      "day"
    ).map((x) => ({ day: x.label, total: x.total })),
    audit_activity: groupCount(audits.map((a) => ({ day: ymd(String((a as any).created_at ?? "")) })), "day").map((x) => ({ day: x.label, total: x.total })),
    notification_trend: groupCount(notifications.map((n) => ({ day: ymd(String((n as any).created_at ?? "")) })), "day").map((x) => ({ day: x.label, total: x.total })),
    leaders_by_level_total: groupCount(filteredLeaders, "leadership_level"),
    realtime_status: "online",
    storage_usage_mb: 0,
    recent_activity: [
      ...audits.slice(0, 6).map((a) => ({ kind: "audit", label: String((a as any).action ?? "Audit"), at: String((a as any).created_at ?? "") })),
      ...notifications.slice(0, 6).map((n) => ({ kind: "notification", label: String((n as any).title ?? "Notification"), at: String((n as any).created_at ?? "") })),
    ],
  });
  return payload;
}
