import type { Dispatch, SetStateAction } from "react";
import { upsertDayosisi, isPersistedDayosisiId } from "../services/dayosisiService";
import {
  upsertChurchJimbo,
  upsertChurchTawi,
  resolveDayosisiId,
  resolveJimboId,
  resolveTawiId,
  isPersistedUuid,
} from "../services/muundoHierarchyService";
import { fetchCascadeOptions } from "../services/churchStructureService";
import { fetchDayosisi } from "../services/dayosisiService";
import { enrichIncomeLineGeo } from "./incomeGeoResolve";
import { upsertKiongozi, isViongoziUuid } from "../services/viongoziService";
import { upsertFinanceEntry } from "../services/financeEntriesService";
import { upsertIncomeSource, upsertIncomeLine, isIncomeUuid } from "../services/incomeModuleService";
import { upsertDomainEntity, isDomainEntityUuid } from "../services/domainModuleService";
import { parseMinistrySegment } from "./membershipIntelligence";
import { upsertChurchMember, upsertChurchFamily, isPersistedUuid as isMemberUuid } from "../services/wauminiService";
import { getSupabase } from "./supabaseClient";
import { parseMoneyTz } from "./money";
import type {
  ChurchFamilyRecord,
  DayosisiRecord,
  DomainEntityRecord,
  FedhaRecord,
  IncomeManagementRecord,
  IncomeSourceRecord,
  JimboRecord,
  KiongoziRecord,
  MembershipStatusDb,
  Status,
  TawiRecord,
} from "../types";

function t(s: string | undefined): string {
  return String(s ?? "").trim();
}

function resolveFamilyLookup(raw: string, families: ChurchFamilyRecord[]): string | null {
  const v = t(raw);
  if (!v) return null;
  if (isPersistedUuid(v)) return v;
  const low = v.toLowerCase();
  const f = families.find((x) => x.family_name.trim().toLowerCase() === low);
  return f && isPersistedUuid(f.id) ? f.id : null;
}

function parseMembershipExcel(s: string): MembershipStatusDb {
  const x = t(s).toLowerCase();
  if (!x) return "active";
  if (x === "active" || x.includes("hai")) return "active";
  if (x === "visitor" || x.includes("mgeni")) return "visitor";
  if (x === "transferred" || x.includes("alihamishiwa")) return "transferred";
  if (x === "deceased" || x.includes("amefariki")) return "deceased";
  if (x === "suspended" || x.includes("mezuiwa")) return "suspended";
  const allowed: MembershipStatusDb[] = ["active", "visitor", "transferred", "deceased", "suspended"];
  return allowed.includes(x as MembershipStatusDb) ? (x as MembershipStatusDb) : "active";
}

function parseGenderCell(s: string): string | null {
  const x = t(s).toLowerCase();
  if (!x) return null;
  if (x === "m" || x === "male" || x.includes("mwanaume")) return "male";
  if (x === "f" || x === "female" || x.includes("mwanamke")) return "female";
  if (x === "other" || x.includes("nyingine")) return "other";
  return null;
}

function parseYesNoCell(s: string): boolean {
  const x = t(s).toLowerCase();
  return x === "ndiyo" || x === "ndio" || x === "yes" || x === "true" || x === "1" || x === "y" || x === "na";
}

function asStatus(s: string): Status {
  const x = t(s);
  if (!x) return "Active";
  return x as Status;
}

function mkLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveJimboScoped(
  jimboLabel: string,
  dayosisiId: string | null,
  majimbo: JimboRecord[]
): string | null {
  const raw = t(jimboLabel);
  if (!raw) return null;
  if (isPersistedUuid(raw)) return raw;
  const pool = dayosisiId ? majimbo.filter((m) => m.dayosisi_id === dayosisiId) : majimbo;
  return resolveJimboId(raw, pool);
}

function resolveTawiScoped(tawiLabel: string, jimboId: string | null, matawi: TawiRecord[]): string | null {
  const raw = t(tawiLabel);
  if (!raw) return null;
  if (isPersistedUuid(raw)) return raw;
  const pool = jimboId ? matawi.filter((tw) => tw.jimbo_id === jimboId) : matawi;
  const tn = raw.toLowerCase();
  const tw = pool.find((x) => x.jina.trim().toLowerCase() === tn);
  return tw && isPersistedUuid(tw.id) ? tw.id : null;
}

function rowToDayosisi(r: Record<string, string>): DayosisiRecord {
  const id = t(r.id);
  return {
    id: id && isPersistedDayosisiId(id) ? id : "",
    jina: t(r.jina),
    code: t(r.code),
    askofu: t(r.askofu),
    makao: t(r.makao),
    mkoa: t(r.mkoa),
    simu: t(r.simu),
    email: t(r.email),
    maelezo: t(r.maelezo),
    status: asStatus(r.status),
  };
}

export async function bulkImportDayosisi(
  rows: Record<string, string>[],
  setDayosisi: Dispatch<SetStateAction<DayosisiRecord[]>>,
  emit: (action: "create" | "update", id?: string) => void
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    try {
      const rec = rowToDayosisi(r);
      if (!rec.jina || !rec.code) throw new Error("Jina na code vinahitajika.");
      if (!getSupabase()) rec.id = rec.id || mkLocalId("d");
      const saved = await upsertDayosisi(rec);
      const updating = Boolean(r.id && isPersistedDayosisiId(t(r.id)));
      setDayosisi((prev) => (updating ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      emit(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}

export async function bulkImportMajimbo(
  rows: Record<string, string>[],
  dayosisiList: DayosisiRecord[],
  setMajimbo: Dispatch<SetStateAction<JimboRecord[]>>,
  emit: (action: "create" | "update", id?: string) => void
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    try {
      if (!getSupabase()) throw new Error("Supabase inahitajika kwa majimbo.");
      const id = t(r.id);
      const merged = {
        ...(id && isPersistedUuid(id) ? { id } : {}),
        jina: t(r.jina),
        dayosisi: t(r.dayosisi),
        mkuu: t(r.mkuu),
        mkoa: t(r.mkoa),
        simu: t(r.simu),
        status: asStatus(r.status),
      } as Partial<JimboRecord> & { jina: string; dayosisi: string };
      if (!merged.jina || !merged.dayosisi) throw new Error("Jimbo na dayosisi vinahitajika.");
      const saved = await upsertChurchJimbo(merged, dayosisiList);
      const updating = Boolean(id && isPersistedUuid(id));
      setMajimbo((prev) => (updating ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      emit(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}

export async function bulkImportMatawi(
  rows: Record<string, string>[],
  dayosisiList: DayosisiRecord[],
  majimbo: JimboRecord[],
  setMatawi: Dispatch<SetStateAction<TawiRecord[]>>,
  emit: (action: "create" | "update", id?: string) => void
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    try {
      if (!getSupabase()) throw new Error("Supabase inahitajika kwa matawi.");
      const id = t(r.id);
      const merged = {
        ...(id && isPersistedUuid(id) ? { id } : {}),
        jina: t(r.jina),
        aina: t(r.aina) || "Tawi",
        jimbo: t(r.jimbo),
        dayosisi: t(r.dayosisi),
        branch_code: t(r.branch_code) || undefined,
        mkoa: t(r.mkoa) || undefined,
        wilaya: t(r.wilaya) || undefined,
        kata: t(r.kata) || undefined,
        mtaa: t(r.mtaa) || undefined,
        gps_lat: t(r.gps_lat) ? Number(r.gps_lat) : undefined,
        gps_lng: t(r.gps_lng) ? Number(r.gps_lng) : undefined,
        founded_date: t(r.founded_date) || undefined,
        verification_status: t(r.verification_status) || undefined,
        kiongozi: t(r.kiongozi),
        simu: t(r.simu),
        status: asStatus(r.status),
      } as Partial<TawiRecord> & { jina: string; jimbo: string };
      if (!merged.jina || !merged.jimbo) throw new Error("Tawi na jimbo vinahitajika.");
      const saved = await upsertChurchTawi(merged, dayosisiList, majimbo);
      const updating = Boolean(id && isPersistedUuid(id));
      setMatawi((prev) => (updating ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      emit(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}

export async function bulkImportViongozi(
  rows: Record<string, string>[],
  dayosisiList: DayosisiRecord[],
  majimbo: JimboRecord[],
  matawi: TawiRecord[],
  setViongozi: Dispatch<SetStateAction<KiongoziRecord[]>>,
  emit: (action: "create" | "update", id?: string) => void
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    try {
      if (!getSupabase()) throw new Error("Supabase inahitajika kwa viongozi.");
      const id = t(r.id);
      const dayosisiId = resolveDayosisiId(t(r.dayosisi), dayosisiList);
      const jimboId = resolveJimboScoped(r.jimbo, dayosisiId, majimbo);
      const tawiId = resolveTawiScoped(r.tawi, jimboId, matawi);
      const merged = {
        ...(id && isViongoziUuid(id) ? { id } : {}),
        jina: t(r.jina),
        cheo: t(r.cheo),
        leadership_level: t(r.leadership_level),
        assigned_entity: t(r.assigned_entity),
        ngazi: t(r.ngazi),
        dayosisi_id: dayosisiId,
        jimbo_id: jimboId,
        tawi_id: tawiId,
        simu: t(r.simu),
        email: t(r.email),
        start_date: t(r.start_date),
        end_date: t(r.end_date),
        term_status: t(r.term_status) || "active",
        appointment_document_url: t(r.appointment_document_url),
        appointment_document_name: t(r.appointment_document_name),
        appointment_document_path: t(r.appointment_document_path),
        appointment_document_size: Number(t(r.appointment_document_size) || 0) || null,
        appointment_document_type: t(r.appointment_document_type),
        appointment_uploaded_at: t(r.appointment_uploaded_at),
        status: asStatus(r.status),
      } as Partial<KiongoziRecord> & { jina: string };
      if (!merged.jina) throw new Error("Jina linahitajika.");
      const saved = await upsertKiongozi(merged);
      const updating = Boolean(id && isViongoziUuid(id));
      setViongozi((prev) => (updating ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      emit(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}

export async function bulkImportFedha(
  rows: Record<string, string>[],
  dayosisiList: DayosisiRecord[],
  majimbo: JimboRecord[],
  matawi: TawiRecord[],
  setFedha: Dispatch<SetStateAction<FedhaRecord[]>>,
  emit: (action: "create" | "update", id?: string) => void
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    try {
      if (!getSupabase()) throw new Error("Supabase inahitajika kwa fedha.");
      const id = t(r.id);
      const dayosisiId = resolveDayosisiId(t(r.dayosisi), dayosisiList);
      const jimboId = resolveJimboScoped(r.jimbo, dayosisiId, majimbo);
      const tawiId = resolveTawiScoped(r.tawi, jimboId, matawi);
      const kiasi = parseMoneyTz(r.kiasi);
      if (!Number.isFinite(kiasi) || kiasi < 0) throw new Error("Kiasi si sahihi.");
      const aina = t(r.aina);
      if (!["Mapato", "Matumizi", "Michango", "Nyingine"].includes(aina)) throw new Error("Aina si sahihi.");
      const merged: Partial<FedhaRecord> & { kiasi: number; tarehe: string; aina: string } = {
        ...(id && isPersistedUuid(id) ? { id } : {}),
        tarehe: t(r.tarehe).slice(0, 10),
        aina,
        kategoria: t(r.kategoria),
        kiasi,
        ngazi: t(r.ngazi),
        status: asStatus(r.status),
        dayosisi_id: dayosisiId,
        jimbo_id: jimboId,
        tawi_id: tawiId,
      };
      if (!merged.tarehe) throw new Error("Tarehe inahitajika.");
      const saved = await upsertFinanceEntry(merged);
      const updating = Boolean(id && isPersistedUuid(id));
      setFedha((prev) => (updating ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      emit(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}

export async function bulkImportVyanzoMapato(
  rows: Record<string, string>[],
  setSources: Dispatch<SetStateAction<IncomeSourceRecord[]>>,
  emit: (action: "create" | "update", id?: string) => void
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    try {
      if (!getSupabase()) throw new Error("Supabase inahitajika.");
      const id = t(r.id);
      const ainaRaw = t(r.aina).toLowerCase();
      const aina: IncomeSourceRecord["aina"] = ainaRaw.includes("taarifa") ? "Taarifa ya Msingi" : "Mapato Halisi";
      const merged = {
        ...(id && isIncomeUuid(id) ? { id } : {}),
        chanzo: t(r.chanzo),
        category: t(r.category),
        subtitle: t(r.subtitle),
        aina,
        maelezo: t(r.maelezo),
        status: asStatus(r.status),
      } as Partial<IncomeSourceRecord> & { chanzo: string };
      if (!merged.chanzo) throw new Error("Chanzo kinahitajika.");
      const saved = await upsertIncomeSource(merged);
      const updating = Boolean(id && isIncomeUuid(id));
      setSources((prev) => (updating ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      emit(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}

export async function bulkImportMapatoIncome(
  rows: Record<string, string>[],
  setLines: Dispatch<SetStateAction<IncomeManagementRecord[]>>,
  emit: (action: "create" | "update", id?: string) => void
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  const cascade = await fetchCascadeOptions().catch(() => ({
    dayosisi: [],
    majimbo: [],
    matawi: [],
    idara: [],
    huduma: [],
    taasisi: [],
    jumuiya: [],
  }));
  const majimboPool = cascade.majimbo.map((m) => ({
    id: m.id,
    jina: m.name,
    dayosisi: "",
    status: "Active" as const,
  }));
  const matawiPool = cascade.matawi.map((m) => ({
    id: m.id,
    jina: m.name,
    jimbo: "",
    jimbo_id: m.parent_id ?? undefined,
    status: "Active" as const,
  }));
  const dayosisiList = await fetchDayosisi().catch(() => [] as DayosisiRecord[]);
  for (const r of rows) {
    try {
      if (!getSupabase()) throw new Error("Supabase inahitajika.");
      const id = t(r.id);
      const amount = typeof r.amount === "number" ? r.amount : parseMoneyTz(String(r.amount ?? ""));
      const merged: Partial<IncomeManagementRecord> = {
        ...(id && isIncomeUuid(id) ? { id } : {}),
        incomeCode: t(r.incomeCode),
        sourceName: t(r.sourceName),
        mainCategory: t(r.mainCategory),
        subCategory: t(r.subCategory),
        churchLevel: t(r.churchLevel),
        incomeType: (t(r.incomeType) as IncomeManagementRecord["incomeType"]) || "Cash",
        frequency: (t(r.frequency) as IncomeManagementRecord["frequency"]) || "One-time",
        budgeted: t(r.budgeted) === "Yes" ? "Yes" : "No",
        restrictedFund: t(r.restrictedFund) === "Yes" ? "Yes" : "No",
        fundPurpose: t(r.fundPurpose),
        collectionDate: t(r.collectionDate).slice(0, 10),
        serviceEventDate: t(r.serviceEventDate).slice(0, 10),
        collectorReceiver: t(r.collectorReceiver),
        approvedBy: t(r.approvedBy),
        receiptNo: t(r.receiptNo),
        transactionReference: t(r.transactionReference),
        amount,
        currency: t(r.currency) || "TZS",
        status: asStatus(r.status),
        branchCenter: t(r.branchCenter),
        remarks: t(r.remarks),
        dayosisi_id: resolveDayosisiId(t(r.dayosisi_id), dayosisiList),
        jimbo_id: resolveJimboId(t(r.jimbo_id) || t(r.jimbo_name), majimboPool as never),
        tawi_id: resolveTawiId(t(r.tawi_id) || t(r.tawi_name), matawiPool as never),
      };
      if (!merged.incomeCode || !merged.sourceName) throw new Error("Income code na chanzo vinahitajika.");
      const enriched = await enrichIncomeLineGeo(merged);
      const saved = await upsertIncomeLine(enriched);
      const updating = Boolean(id && isIncomeUuid(id));
      setLines((prev) => (updating ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      emit(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}

/** Kwa matumizi ya GenericModuleView — hifadhi ndani ya hali ya karibu. */
export async function bulkImportChurchFamilies(
  rows: Record<string, string>[],
  ctx: {
    dayosisiList: DayosisiRecord[];
    reload: () => Promise<void>;
    onEachSaved?: (action: "create" | "update", id: string) => void;
  }
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  if (!getSupabase()) {
    return { ok: 0, fail: rows.length };
  }
  for (const r of rows) {
    try {
      const family_name = t(r.family_name);
      if (!family_name) throw new Error("Jina la familia linahitajika.");
      const id = t(r.id);
      const dayosisi_id = resolveDayosisiId(t(r.dayosisi_id), ctx.dayosisiList);
      const saved = await upsertChurchFamily({
        ...(id && isMemberUuid(id) ? { id } : {}),
        family_name,
        dayosisi_id,
        jimbo_name: t(r.jimbo_name) || null,
        tawi_name: t(r.tawi_name) || null,
        phone: t(r.phone) || null,
        email: t(r.email) || null,
        maelezo: t(r.maelezo) || null,
      });
      const updating = Boolean(id && isMemberUuid(id));
      ctx.onEachSaved?.(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  await ctx.reload();
  return { ok, fail };
}

export async function bulkImportChurchMembers(
  rows: Record<string, string>[],
  ctx: {
    families: ChurchFamilyRecord[];
    dayosisiList: DayosisiRecord[];
    reload: () => Promise<void>;
    onEachSaved?: (action: "create" | "update", id: string) => void;
  }
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  if (!getSupabase()) {
    return { ok: 0, fail: rows.length };
  }
  const cascade = await fetchCascadeOptions().catch(() => ({
    dayosisi: [],
    majimbo: [],
    matawi: [],
    idara: [],
    huduma: [],
    taasisi: [],
    jumuiya: [],
  }));
  const majimboPool = cascade.majimbo.map((m) => ({
    id: m.id,
    jina: m.name,
    dayosisi: "",
    status: "Active" as const,
  }));
  const matawiPool = cascade.matawi.map((m) => ({
    id: m.id,
    jina: m.name,
    jimbo: "",
    jimbo_id: m.parent_id ?? undefined,
    status: "Active" as const,
  }));
  for (const r of rows) {
    try {
      const first_name = t(r.first_name);
      const last_name = t(r.last_name);
      if (!first_name || !last_name) throw new Error("Jina la kwanza na la mwisho vinahitajika.");
      const id = t(r.id);
      const family_id = resolveFamilyLookup(t(r.family_name), ctx.families);
      const dayosisi_id = resolveDayosisiId(t(r.dayosisi_id), ctx.dayosisiList);
      const jimbo_id =
        resolveJimboId(t(r.jimbo_id) || t(r.jimbo_name), majimboPool as never) ?? (t(r.jimbo_id) || null);
      const tawi_id =
        resolveTawiId(t(r.tawi_id) || t(r.tawi_name), matawiPool as never) ?? (t(r.tawi_id) || null);
      const gender = parseGenderCell(r.gender) ?? "";
      const merged = {
        ...(id && isMemberUuid(id) ? { id } : {}),
        first_name,
        last_name,
        family_id,
        gender,
        birth_date: t(r.birth_date).slice(0, 10) || null,
        phone: t(r.phone) || null,
        email: t(r.email) || null,
        membership_status: parseMembershipExcel(r.membership_status),
        baptism_date: t(r.baptism_date).slice(0, 10) || null,
        baptism_place: t(r.baptism_place) || null,
        is_baptized: parseYesNoCell(r.is_baptized),
        member_number: t(r.member_number) || null,
        dayosisi_id,
        jimbo_id: jimbo_id && isMemberUuid(jimbo_id) ? jimbo_id : null,
        tawi_id: tawi_id && isMemberUuid(tawi_id) ? tawi_id : null,
        tawi_name: t(r.tawi_name) || null,
        ministry_segment: parseMinistrySegment(r.ministry_segment ?? r.chama),
        notes: t(r.notes) || null,
      };
      const saved = await upsertChurchMember(merged);
      const updating = Boolean(id && isMemberUuid(id));
      ctx.onEachSaved?.(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  await ctx.reload();
  return { ok, fail };
}

export async function bulkImportDomainEntities(
  rows: Record<string, string>[],
  ctx: {
    moduleKey: string;
    submoduleKey: string;
    setRows: Dispatch<SetStateAction<DomainEntityRecord[]>>;
    onSaved: (action: "create" | "update", id: string) => void;
  }
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    try {
      if (!getSupabase()) throw new Error("Supabase inahitajika.");
      const id = t(r.id);
      const merged: Partial<DomainEntityRecord> & { module_key: string; title: string } = {
        ...(id && isDomainEntityUuid(id) ? { id } : {}),
        module_key: ctx.moduleKey,
        submodule_key: ctx.submoduleKey,
        title: t(r.title),
        category: t(r.category) || undefined,
        reference_code: t(r.reference_code) || undefined,
        event_date: t(r.event_date).slice(0, 10) || undefined,
        details: t(r.details) || undefined,
        status: asStatus(r.status),
      };
      if (!merged.title) throw new Error("Kichwa kinahitajika.");
      const saved = await upsertDomainEntity(merged);
      const updating = Boolean(id && isDomainEntityUuid(id));
      ctx.setRows((prev) => (updating ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      ctx.onSaved(updating ? "update" : "create", saved.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}

export async function bulkImportGenericRows(
  rows: Record<string, string>[],
  setRows: Dispatch<SetStateAction<{ id: string; title: string; category: string; notes: string; status: string }[]>>,
  currentRows: { id: string; title: string }[]
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  const taken = new Set(currentRows.map((x) => x.title.trim().toLowerCase()));
  for (const r of rows) {
    try {
      const title = t(r.title);
      if (!title) throw new Error("Kichwa kinahitajika.");
      const tl = title.toLowerCase();
      const id = t(r.id);
      const updating = Boolean(id && currentRows.some((x) => x.id === id));
      if (!updating && taken.has(tl)) throw new Error("Kichwa kimerudiwa.");
      const row = {
        id: id && !id.startsWith("row-") ? id : mkLocalId("row"),
        title,
        category: t(r.category) || "Jumla",
        notes: t(r.notes),
        status: t(r.status) || "Active",
      };
      setRows((prev) => {
        const upd = id && prev.some((x) => x.id === id);
        if (upd) return prev.map((x) => (x.id === id ? { ...x, ...row } : x));
        return [row, ...prev];
      });
      taken.add(tl);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}
