import { getSupabase } from "../lib/supabaseClient";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { unwrapList } from "../lib/supabaseResult";
import type { BranchEngineLeaderSlot } from "../lib/matawiBranchEngineTypes";
import type { BranchEngineWorkspacePayload } from "./matawiBranchEngineWorkspaceService";
import type { MasterBranchScope } from "./masterBranchEngineService";
import { parseMoneyTz } from "../lib/money";
import { upsertAttendanceSession } from "./attendanceService";
import { upsertFinanceEntry } from "./financeEntriesService";
import { upsertChurchTawi } from "./muundoHierarchyService";
import { upsertKiongozi } from "./viongoziService";
import type { DayosisiRecord, JimboRecord, KiongoziRecord, Status, TawiRecord } from "../types";

export const BRANCH_ENGINE_TAWI_ROLES = [
  "Mwongozi wa Tawi",
  "Katibu wa Tawi",
  "Naibu Katibu wa Tawi",
  "Mhazini wa Tawi",
] as const;

export type BranchEngineSyncResult = {
  ok: boolean;
  messages: string[];
  tawiId?: string;
  leaderSlots?: Record<string, BranchEngineLeaderSlot>;
  syncRefs?: BranchEngineWorkspacePayload["syncRefs"];
};

function f(fields: Record<string, string>, key: string): string {
  return String(fields[key] ?? "").trim();
}

function n(fields: Record<string, string>, key: string): number {
  const v = Number(String(fields[key] ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(v) ? v : 0;
}

function resolveTawiContext(
  tawiId: string,
  matawi: TawiRecord[],
  majimbo: JimboRecord[],
): { tawi: TawiRecord; jimboId: string | null; dayosisiId: string | null } | null {
  const tawi = matawi.find((t) => t.id === tawiId);
  if (!tawi) return null;
  const jb = majimbo.find((j) => j.id === tawi.jimbo_id);
  return { tawi, jimboId: tawi.jimbo_id ?? jb?.id ?? null, dayosisiId: jb?.dayosisi_id ?? null };
}

function attendanceTotalFromFields(fields: Record<string, string>): number {
  const ids = [
    "attendance_sunday_service",
    "attendance_prayer_meeting",
    "attendance_youth_meeting",
    "attendance_women_meeting",
    "attendance_choir_practice",
    "attendance_bible_study",
    "attendance_children_sunday_school",
    "attendance_visitors_attendance",
    "attendance_online_livestream",
  ];
  const sum = ids.reduce((s, id) => s + n(fields, id), 0);
  const explicit = n(fields, "attendance_total_attendance");
  return explicit > 0 ? explicit : sum;
}

function mapFinanceStatus(raw: string): Status {
  const s = raw.toLowerCase();
  if (s.includes("approved") || s.includes("verified")) return "Approved";
  if (s.includes("pending")) return "Pending";
  if (s.includes("draft")) return "Draft";
  if (s.includes("reject")) return "Needs Review";
  return "Active";
}

function parseGps(raw: string): { lat: number | null; lng: number | null } {
  const parts = raw.split(/[,;\s]+/).map((x) => Number(x.trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return { lat: parts[0], lng: parts[1] };
  }
  return { lat: null, lng: null };
}

export function matchTawiLeaderRole(cheo: string): string | null {
  const c = cheo.toLowerCase();
  if (c.includes("naibu") && c.includes("katibu")) return "Naibu Katibu wa Tawi";
  if (c.includes("mwongozi") || c.includes("mkuu wa tawi")) return "Mwongozi wa Tawi";
  if (c.includes("katibu")) return "Katibu wa Tawi";
  if (c.includes("mhazini") || c.includes("treasurer")) return "Mhazini wa Tawi";
  return null;
}

export async function fetchTawiLeaderSlots(tawiId: string): Promise<Record<string, BranchEngineLeaderSlot>> {
  const c = getSupabase();
  if (!c || !tawiId) return {};
  const res = await c
    .from("church_viongozi")
    .select("id, jina, cheo, simu, whatsapp, email, status")
    .eq("tawi_id", tawiId)
    .not("status", "eq", "archived")
    .limit(24);
  if (res.error) throw new Error(formatPostgrestError(res.error, "church_viongozi.tawi.leaders"));
  const rows = unwrapList(res, "church_viongozi.tawi.leaders");
  const out: Record<string, BranchEngineLeaderSlot> = {};
  for (const raw of rows) {
    const r = raw as Record<string, unknown>;
    const role = matchTawiLeaderRole(String(r.cheo ?? "")) ?? String(r.cheo ?? "").trim();
    if (!role) continue;
    out[role] = {
      id: String(r.id ?? ""),
      role,
      jina: String(r.jina ?? ""),
      simu: String(r.simu ?? ""),
      whatsapp: String(r.whatsapp ?? ""),
      email: String(r.email ?? ""),
      status: String(r.status ?? "active"),
    };
  }
  return out;
}

function leaderFieldsToSlot(fields: Record<string, string>): BranchEngineLeaderSlot | null {
  const jina = f(fields, "leaders_jina_kamili");
  if (!jina) return null;
  const role = f(fields, "leaders_nafasi_ya_kiongozi") || "Mwongozi wa Tawi";
  return {
    role,
    jina,
    simu: f(fields, "leaders_simu"),
    whatsapp: f(fields, "leaders_whatsapp"),
    email: f(fields, "leaders_email"),
    status: f(fields, "leaders_status") || "Active",
  };
}

function slotToLeaderFields(slot: BranchEngineLeaderSlot): Record<string, string> {
  return {
    leaders_nafasi_ya_kiongozi: slot.role,
    leaders_jina_kamili: slot.jina,
    leaders_simu: slot.simu ?? "",
    leaders_whatsapp: slot.whatsapp ?? "",
    leaders_email: slot.email ?? "",
    leaders_status: slot.status ?? "Active",
  };
}

export function mergeLeaderSlotsIntoPayload(
  payload: BranchEngineWorkspacePayload,
  leaderSlots: Record<string, BranchEngineLeaderSlot>,
): BranchEngineWorkspacePayload {
  const next: BranchEngineWorkspacePayload = {
    ...payload,
    leaderSlots: { ...leaderSlots, ...(payload.leaderSlots ?? {}) },
  };
  const primary =
    leaderSlots["Mwongozi wa Tawi"] ??
    leaderSlots["Katibu wa Tawi"] ??
    Object.values(leaderSlots)[0];
  if (primary) {
    const hasName = Boolean(f(payload.fields, "leaders_jina_kamili"));
    if (!hasName) {
      next.fields = { ...payload.fields, ...slotToLeaderFields(primary) };
    }
  }
  return next;
}

async function syncRegistration(
  fields: Record<string, string>,
  entityId: string,
  dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  _matawi: TawiRecord[],
): Promise<{ tawiId: string; message: string }> {
  const jina = f(fields, "registration_jina_la_tawi");
  if (!jina) throw new Error("Jina la tawi linahitajika ili kusawazisha na orodha rasmi.");

  const gps = parseGps(f(fields, "registration_gps_location"));
  const row: Partial<TawiRecord> & { jina: string } = {
    id: entityId || undefined,
    jina,
    branch_code: f(fields, "registration_branch_code") || null,
    dayosisi: f(fields, "registration_dayosisi"),
    jimbo: f(fields, "registration_jimbo"),
    mkoa: f(fields, "registration_mkoa") || null,
    wilaya: f(fields, "registration_wilaya") || null,
    kata: f(fields, "registration_kata") || null,
    mtaa: f(fields, "registration_kijiji_mtaa") || null,
    gps_lat: gps.lat,
    gps_lng: gps.lng,
    founded_date: f(fields, "registration_tarehe_ya_kuanzishwa") || null,
    status: (f(fields, "registration_status") || "Active") as TawiRecord["status"],
    aina: "Tawi",
  };

  const saved = await upsertChurchTawi(row, dayosisi, majimbo);
  return {
    tawiId: saved.id,
    message: entityId ? "Tawi imesasishwa kwenye orodha rasmi." : "Tawi mpya imeongezwa kwenye orodha rasmi.",
  };
}

async function syncAttendance(
  fields: Record<string, string>,
  tawiId: string,
  matawi: TawiRecord[],
  majimbo: JimboRecord[],
  priorSessionId?: string,
): Promise<{ sessionId: string; message: string }> {
  const ctx = resolveTawiContext(tawiId, matawi, majimbo);
  if (!ctx) throw new Error("Tawi halijapatikana kwa mahudhurio.");

  const attendanceDate =
    f(fields, "attendance_attendance_date") || new Date().toISOString().slice(0, 10);
  const serviceName = f(fields, "attendance_service_type") || "Ibada ya Jumapili";
  const visitors = n(fields, "attendance_visitors_attendance");
  const youth = n(fields, "attendance_youth_meeting");
  const women = n(fields, "attendance_women_meeting");
  const children = n(fields, "attendance_children_sunday_school");
  const total = attendanceTotalFromFields(fields);
  const men = Math.max(0, total - women - youth - children - visitors);

  const saved = await upsertAttendanceSession({
    id: priorSessionId,
    attendance_date: attendanceDate,
    service_name: serviceName,
    attendance_type: f(fields, "attendance_attendance_period") || "Weekly",
    dayosisi_id: ctx.dayosisiId,
    jimbo_id: ctx.jimboId,
    tawi_id: tawiId,
    total_men: men,
    total_women: women,
    total_youth: youth,
    total_children: children,
    visitors,
    total_attendance: total,
    notes: f(fields, "attendance_notes") || null,
    status: f(fields, "attendance_report_status")?.toLowerCase().includes("approved")
      ? "Active"
      : "Pending",
  });

  return {
    sessionId: saved.id,
    message: priorSessionId
      ? "Mahudhurio yamesasishwa kwenye attendance_sessions."
      : "Mahudhurio yamehifadhiwa kwenye attendance_sessions.",
  };
}

async function syncFinance(
  fields: Record<string, string>,
  tawiId: string,
  matawi: TawiRecord[],
  majimbo: JimboRecord[],
  priorEntryId?: string,
): Promise<{ entryId: string; message: string }> {
  const ctx = resolveTawiContext(tawiId, matawi, majimbo);
  if (!ctx) throw new Error("Tawi halijapatikana kwa fedha.");

  const kiasiRaw = f(fields, "finance_kiasi");
  const kiasi = kiasiRaw ? parseMoneyTz(kiasiRaw) : 0;
  if (!Number.isFinite(kiasi) || kiasi <= 0) {
    throw new Error("Weka kiasi halali kwenye Fedha & Michango ili kusawazisha.");
  }

  const chanzo = f(fields, "finance_finance_source") || "Sadaka";
  const saved = await upsertFinanceEntry({
    id: priorEntryId,
    tarehe: f(fields, "finance_transaction_date") || new Date().toISOString().slice(0, 10),
    aina: "Mapato",
    kategoria: chanzo,
    kiasi,
    ngazi: "Tawi",
    dayosisi: ctx.tawi.dayosisi,
    jimbo: ctx.tawi.jimbo,
    tawi: ctx.tawi.jina,
    dayosisi_id: ctx.dayosisiId ?? undefined,
    jimbo_id: ctx.jimboId ?? undefined,
    tawi_id: tawiId,
    status: mapFinanceStatus(f(fields, "finance_finance_status")),
  });

  return {
    entryId: saved.id,
    message: priorEntryId
      ? "Mchango/mapato yamesasishwa kwenye church_finance_entries."
      : "Mchango/mapato yamehifadhiwa kwenye church_finance_entries.",
  };
}

/** Pakia mahudhurio ya hivi karibuni kutoka jedwali rasmi. */
export async function fetchLatestAttendanceFieldsForTawi(
  tawiId: string,
): Promise<Record<string, string>> {
  const c = getSupabase();
  if (!c || !tawiId) return {};
  const res = await c
    .from("attendance_sessions")
    .select("*")
    .eq("tawi_id", tawiId)
    .order("attendance_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error || !res.data) return {};
  const r = res.data as Record<string, unknown>;
  const out: Record<string, string> = {
    attendance_attendance_date: String(r.attendance_date ?? "").slice(0, 10),
    attendance_service_type: String(r.service_name ?? ""),
    attendance_attendance_period: String(r.attendance_type ?? ""),
    attendance_sunday_service: String(r.total_men ?? ""),
    attendance_women_meeting: String(r.total_women ?? ""),
    attendance_youth_meeting: String(r.total_youth ?? ""),
    attendance_children_sunday_school: String(r.total_children ?? ""),
    attendance_visitors_attendance: String(r.visitors ?? ""),
    attendance_total_attendance: String(r.total_attendance ?? ""),
    attendance_notes: String(r.notes ?? ""),
    attendance_report_status: String(r.status ?? ""),
  };
  return out;
}

/** Pakia mchango/mapato wa hivi karibuni kutoka jedwali rasmi. */
export async function fetchLatestFinanceFieldsForTawi(tawiId: string): Promise<Record<string, string>> {
  const c = getSupabase();
  if (!c || !tawiId) return {};
  const res = await c
    .from("church_finance_entries")
    .select("*")
    .eq("tawi_id", tawiId)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error || !res.data) return {};
  const r = res.data as Record<string, unknown>;
  const amt = r.amount_tz;
  return {
    finance_transaction_date: String(r.entry_date ?? "").slice(0, 10),
    finance_finance_source: String(r.kategoria ?? ""),
    finance_kiasi: String(amt ?? ""),
    finance_finance_status: String(r.status ?? ""),
  };
}

async function syncLeaderRow(
  slot: BranchEngineLeaderSlot,
  tawi: TawiRecord,
  tawiId: string,
  majimbo: JimboRecord[],
): Promise<BranchEngineLeaderSlot> {
  const jb = majimbo.find((j) => j.id === tawi.jimbo_id);
  const saved = await upsertKiongozi({
    id: slot.id,
    jina: slot.jina,
    cheo: slot.role,
    ngazi: "Tawi",
    leadership_level: "Tawi Level",
    assigned_entity: tawi.jina,
    tawi_id: tawiId,
    jimbo_id: tawi.jimbo_id ?? jb?.id ?? null,
    dayosisi_id: jb?.dayosisi_id ?? null,
    dayosisi: tawi.dayosisi,
    jimbo: tawi.jimbo,
    tawi: tawi.jina,
    simu: slot.simu ?? "",
    whatsapp: slot.whatsapp,
    email: slot.email,
    status: (slot.status ?? "Active") as KiongoziRecord["status"],
  });
  return {
    id: saved.id,
    role: slot.role,
    jina: saved.jina,
    simu: saved.simu,
    whatsapp: saved.whatsapp ?? undefined,
    email: saved.email ?? undefined,
    status: saved.status,
  };
}

/**
 * Baada ya kuhifadhi workspace, changanisha moduli muhimu na jedwali za Supabase.
 */
export async function syncBranchEngineModuleToSupabase(input: {
  moduleId: string;
  scope: MasterBranchScope;
  entityId: string;
  payload: BranchEngineWorkspacePayload;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
}): Promise<BranchEngineSyncResult> {
  const messages: string[] = [];
  let tawiId = input.scope === "tawi" ? input.entityId : "";
  let leaderSlots = { ...(input.payload.leaderSlots ?? {}) };
  let syncRefs = { ...(input.payload.syncRefs ?? {}) };

  try {
    if (input.moduleId === "registration" && f(input.payload.fields, "registration_jina_la_tawi")) {
      const reg = await syncRegistration(
        input.payload.fields,
        input.scope === "tawi" ? input.entityId : tawiId,
        input.dayosisi,
        input.majimbo,
        input.matawi,
      );
      tawiId = reg.tawiId;
      messages.push(reg.message);
    }

    if (input.moduleId === "leaders" && (tawiId || input.scope === "tawi")) {
      if (!tawiId && input.scope === "tawi") tawiId = input.entityId;
      if (!tawiId) {
        messages.push("Chagua tawi kwenye baa ya ngazi ili kusawazisha viongozi.");
      } else {
        const tawi = input.matawi.find((t) => t.id === tawiId);
        if (!tawi) throw new Error("Tawi halijapatikana kwenye orodha ya portal.");
        const current = leaderFieldsToSlot(input.payload.fields);
        if (current) {
          const prior = leaderSlots[current.role];
          const saved = await syncLeaderRow(
            { ...current, id: prior?.id },
            tawi,
            tawiId,
            input.majimbo,
          );
          leaderSlots = { ...leaderSlots, [saved.role]: saved };
          messages.push(`Kiongozi (${saved.role}) amesawazishwa na church_viongozi.`);
        }
      }
    }

    if (input.moduleId === "attendance" && tawiId) {
      const att = await syncAttendance(
        input.payload.fields,
        tawiId,
        input.matawi,
        input.majimbo,
        syncRefs.attendanceSessionId,
      );
      syncRefs = { ...syncRefs, attendanceSessionId: att.sessionId };
      messages.push(att.message);
    }

    if (input.moduleId === "finance" && tawiId) {
      const fin = await syncFinance(
        input.payload.fields,
        tawiId,
        input.matawi,
        input.majimbo,
        syncRefs.financeEntryId,
      );
      syncRefs = { ...syncRefs, financeEntryId: fin.entryId };
      messages.push(fin.message);
    }

    if (input.moduleId === "contributionForms" && tawiId) {
      let formTotal = 0;
      for (const [key, val] of Object.entries(input.payload.fields)) {
        if (key.startsWith("form_contribution_")) formTotal += parseMoneyTz(String(val));
      }
      if (formTotal > 0) {
        const fin = await syncFinance(
          {
            ...input.payload.fields,
            finance_kiasi: String(formTotal),
            finance_finance_source: "Fomu ya Michango — Jumla",
            finance_transaction_date:
              f(input.payload.fields, "contributionforms_tarehe") || new Date().toISOString().slice(0, 10),
          },
          tawiId,
          input.matawi,
          input.majimbo,
          syncRefs.financeEntryId,
        );
        syncRefs = { ...syncRefs, financeEntryId: fin.entryId };
        messages.push("Fomu ya michango imesawazishwa na church_finance_entries.");
      } else {
        messages.push("Jumla ya michango kwenye fomu ni 0 — haijasawazishwa kwenye fedha.");
      }
    }

    return { ok: true, messages, tawiId: tawiId || undefined, leaderSlots, syncRefs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Usawazishaji umeshindwa.";
    return { ok: false, messages: [msg, ...messages], tawiId: tawiId || undefined, leaderSlots, syncRefs };
  }
}
