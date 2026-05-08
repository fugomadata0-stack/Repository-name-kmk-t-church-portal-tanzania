import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList, unwrapOrThrow } from "../lib/supabaseResult";
import type { ChurchFamilyRecord, ChurchMemberRecord, DayosisiRecord, MembershipStatusDb, Status } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function membershipToStatus(m: MembershipStatusDb): Status {
  const map: Record<MembershipStatusDb, Status> = {
    active: "Active",
    visitor: "Pending",
    transferred: "Inactive",
    deceased: "Archived",
    suspended: "Needs Review",
  };
  return map[m] ?? "Active";
}

function parseMembership(raw: string | null | undefined): MembershipStatusDb {
  const s = String(raw ?? "active").toLowerCase();
  if (s === "visitor") return "visitor";
  if (s === "transferred") return "transferred";
  if (s === "deceased") return "deceased";
  if (s === "suspended") return "suspended";
  return "active";
}

export function mapFamilyRow(row: Record<string, unknown>): ChurchFamilyRecord {
  return {
    id: String(row.id),
    family_name: String(row.family_name ?? ""),
    head_member_id: row.head_member_id ? String(row.head_member_id) : null,
    head_member_name: row.head_member_name ? String(row.head_member_name) : null,
    dayosisi_id: row.dayosisi_id ? String(row.dayosisi_id) : null,
    jimbo_name: row.jimbo_name != null ? String(row.jimbo_name) : null,
    tawi_name: row.tawi_name != null ? String(row.tawi_name) : null,
    phone: row.phone != null ? String(row.phone) : null,
    email: row.email != null ? String(row.email) : null,
    maelezo: row.maelezo != null ? String(row.maelezo) : null,
    status: "Active",
  };
}

export function mapMemberRow(row: Record<string, unknown>): ChurchMemberRecord {
  const nested = row.church_families as { family_name?: string } | null | undefined;
  const family_name =
    nested && typeof nested === "object" && nested.family_name != null ? String(nested.family_name) : "";
  const fn = String(row.first_name ?? "");
  const ln = String(row.last_name ?? "");
  const ms = parseMembership(row.membership_status as string);
  return {
    id: String(row.id),
    family_id: row.family_id ? String(row.family_id) : null,
    family_name,
    relation_to_head: row.relation_to_head ? String(row.relation_to_head) : null,
    first_name: fn,
    last_name: ln,
    jina_kamili: `${fn} ${ln}`.trim(),
    gender: String(row.gender ?? ""),
    birth_date: row.birth_date ? String(row.birth_date).slice(0, 10) : null,
    phone: row.phone != null ? String(row.phone) : null,
    email: row.email != null ? String(row.email) : null,
    nida_number: row.nida_number ? String(row.nida_number) : null,
    photo_url: row.photo_url ? String(row.photo_url) : null,
    marital_status: row.marital_status ? String(row.marital_status) : null,
    occupation: row.occupation ? String(row.occupation) : null,
    region_name: row.region_name ? String(row.region_name) : null,
    district_name: row.district_name ? String(row.district_name) : null,
    ward_street: row.ward_street ? String(row.ward_street) : null,
    membership_status: ms,
    baptism_date: row.baptism_date ? String(row.baptism_date).slice(0, 10) : null,
    baptism_place: row.baptism_place != null ? String(row.baptism_place) : null,
    is_baptized: Boolean(row.is_baptized),
    member_number: row.member_number != null ? String(row.member_number) : null,
    dayosisi_id: row.dayosisi_id ? String(row.dayosisi_id) : null,
    jimbo_name: row.jimbo_name ? String(row.jimbo_name) : null,
    tawi_name: row.tawi_name != null ? String(row.tawi_name) : null,
    jumuiya_name: row.jumuiya_name ? String(row.jumuiya_name) : null,
    idara_name: row.idara_name ? String(row.idara_name) : null,
    huduma_name: row.huduma_name ? String(row.huduma_name) : null,
    notes: row.notes != null ? String(row.notes) : null,
    status: membershipToStatus(ms),
  };
}

export async function fetchChurchFamilies(): Promise<ChurchFamilyRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const res = await c.from("church_families").select("*").order("family_name", { ascending: true });
  const rows = unwrapList(res, "church_families.list");
  return rows.map((r) => mapFamilyRow(r as unknown as Record<string, unknown>));
}

export async function upsertChurchFamily(row: Partial<ChurchFamilyRecord> & { family_name: string }): Promise<ChurchFamilyRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const payload = {
    family_name: row.family_name.trim(),
    head_member_id: row.head_member_id || null,
    head_member_name: row.head_member_name?.trim() || null,
    dayosisi_id: row.dayosisi_id || null,
    jimbo_name: row.jimbo_name?.trim() || null,
    tawi_name: row.tawi_name?.trim() || null,
    phone: row.phone?.trim() || null,
    email: row.email?.trim() || null,
    maelezo: row.maelezo?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (row.id && isPersistedUuid(row.id)) {
    const res = await c.from("church_families").update(payload).eq("id", row.id).select("*").single();
    const data = unwrapOrThrow(res, "church_families.update");
    return mapFamilyRow(data as unknown as Record<string, unknown>);
  }
  const res = await c.from("church_families").insert(payload).select("*").single();
  const data = unwrapOrThrow(res, "church_families.insert");
  return mapFamilyRow(data as unknown as Record<string, unknown>);
}

export async function deleteChurchFamily(id: string): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const res = await c.from("church_families").delete().eq("id", id);
  if (res.error) throw new Error(formatPostgrestError(res.error, "church_families.delete"));
}

export type FetchMembersOptions = {
  baptizedOnly?: boolean;
  membershipStatus?: MembershipStatusDb | "ALL";
};

export async function fetchChurchMembers(opts?: FetchMembersOptions): Promise<ChurchMemberRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  let q = c
    .from("church_members")
    .select("*, church_families ( family_name )")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });
  if (opts?.membershipStatus && opts.membershipStatus !== "ALL") {
    q = q.eq("membership_status", opts.membershipStatus);
  }
  const res = await q;
  const rows = unwrapList(res, "church_members.list");
  let list = rows.map((r) => mapMemberRow(r as unknown as Record<string, unknown>));
  if (opts?.baptizedOnly) {
    list = list.filter((m) => m.is_baptized || Boolean(m.baptism_date));
  }
  return list;
}

export async function upsertChurchMember(
  row: Partial<ChurchMemberRecord> & { first_name: string; last_name: string }
): Promise<ChurchMemberRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const dupFields = [row.phone?.trim(), row.email?.trim(), row.member_number?.trim()].filter(Boolean) as string[];
  if (dupFields.length > 0) {
    const orQuery = [
      row.phone?.trim() ? `phone.eq.${row.phone.trim()}` : "",
      row.email?.trim() ? `email.eq.${row.email.trim()}` : "",
      row.member_number?.trim() ? `member_number.eq.${row.member_number.trim()}` : "",
    ]
      .filter(Boolean)
      .join(",");
    const dupRes = await c.from("church_members").select("id").or(orQuery).limit(5);
    if (dupRes.error) throw new Error(formatPostgrestError(dupRes.error, "church_members.duplicate_check"));
    const hasConflict = (dupRes.data ?? []).some((d) => !row.id || String((d as { id: string }).id) !== row.id);
    if (hasConflict) throw new Error("Muumini huyu tayari yupo.");
  }
  const payload = {
    family_id: row.family_id || null,
    relation_to_head: row.relation_to_head?.trim() || null,
    first_name: row.first_name.trim(),
    last_name: row.last_name.trim(),
    gender: row.gender?.trim() ? row.gender.trim() : null,
    birth_date: row.birth_date?.trim() ? row.birth_date.trim().slice(0, 10) : null,
    phone: row.phone?.trim() || null,
    email: row.email?.trim() || null,
    nida_number: row.nida_number?.trim() || null,
    photo_url: row.photo_url?.trim() || null,
    marital_status: row.marital_status?.trim() || null,
    occupation: row.occupation?.trim() || null,
    region_name: row.region_name?.trim() || null,
    district_name: row.district_name?.trim() || null,
    ward_street: row.ward_street?.trim() || null,
    membership_status: row.membership_status ?? "active",
    baptism_date: row.baptism_date?.trim() ? row.baptism_date.trim().slice(0, 10) : null,
    baptism_place: row.baptism_place?.trim() || null,
    is_baptized: row.is_baptized ?? false,
    member_number: row.member_number?.trim() ? row.member_number.trim() : null,
    dayosisi_id: row.dayosisi_id || null,
    jimbo_name: row.jimbo_name?.trim() || null,
    tawi_name: row.tawi_name?.trim() || null,
    jumuiya_name: row.jumuiya_name?.trim() || null,
    idara_name: row.idara_name?.trim() || null,
    huduma_name: row.huduma_name?.trim() || null,
    notes: row.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (row.id && isPersistedUuid(row.id)) {
    const res = await c.from("church_members").update(payload).eq("id", row.id).select("*, church_families ( family_name )").single();
    const data = unwrapOrThrow(res, "church_members.update");
    return mapMemberRow(data as unknown as Record<string, unknown>);
  }
  const res = await c.from("church_members").insert(payload).select("*, church_families ( family_name )").single();
  const data = unwrapOrThrow(res, "church_members.insert");
  return mapMemberRow(data as unknown as Record<string, unknown>);
}

export async function deleteChurchMember(id: string): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const res = await c.from("church_members").delete().eq("id", id);
  if (res.error) throw new Error(formatPostgrestError(res.error, "church_members.delete"));
}

export async function upsertFamilyMemberLink(input: {
  family_id: string | null;
  member_id: string;
  relationship_type?: string | null;
}): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const clearRes = await c.from("family_members").delete().eq("member_id", input.member_id);
  if (clearRes.error) throw new Error(formatPostgrestError(clearRes.error, "family_members.clear_member_links"));
  if (!input.family_id) return;

  const payload = {
    family_id: input.family_id,
    member_id: input.member_id,
    relationship_type: input.relationship_type?.trim() || "ndugu",
    is_head: (input.relationship_type?.trim() || "").toLowerCase() === "baba",
  };
  const res = await c
    .from("family_members")
    .upsert(payload, { onConflict: "family_id,member_id" })
    .select("id")
    .limit(1);
  if (res.error) throw new Error(formatPostgrestError(res.error, "family_members.upsert"));
}

export async function ensureMemberCard(input: {
  member_id: string;
  member_number: string | null;
  verify_url: string;
}): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const fallbackCardNo = `KMKT-CARD-${input.member_id.slice(0, 8).toUpperCase()}`;
  const res = await c.from("member_cards").upsert(
    {
      member_id: input.member_id,
      card_number: input.member_number || fallbackCardNo,
      qr_url: input.verify_url,
      issued_at: new Date().toISOString(),
    },
    { onConflict: "member_id" }
  );
  if (res.error) throw new Error(formatPostgrestError(res.error, "member_cards.upsert"));
}

export async function fetchWauminiCounts(): Promise<{
  families: number;
  members: number;
  activeMembers: number;
  baptized: number;
}> {
  const c = getSupabase();
  if (!c) return { families: 0, members: 0, activeMembers: 0, baptized: 0 };
  try {
    const [f, m, a, b] = await Promise.all([
      c.from("church_families").select("*", { count: "exact", head: true }),
      c.from("church_members").select("*", { count: "exact", head: true }),
      c.from("church_members").select("*", { count: "exact", head: true }).eq("membership_status", "active"),
      c.from("church_members").select("*", { count: "exact", head: true }).eq("is_baptized", true),
    ]);
    if (f.error || m.error || a.error || b.error) return { families: 0, members: 0, activeMembers: 0, baptized: 0 };
    return {
      families: f.count ?? 0,
      members: m.count ?? 0,
      activeMembers: a.count ?? 0,
      baptized: b.count ?? 0,
    };
  } catch {
    return { families: 0, members: 0, activeMembers: 0, baptized: 0 };
  }
}

/** Majina ya dayosisi kwa dropdown */
export function dayosisiOptions(dayosisi: DayosisiRecord[]): { id: string; label: string }[] {
  return dayosisi.map((d) => ({ id: d.id, label: d.jina }));
}
