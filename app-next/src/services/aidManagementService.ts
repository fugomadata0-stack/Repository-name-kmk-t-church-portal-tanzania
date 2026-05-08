import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { safeJsonParseUnknown } from "../lib/security";
import type {
  AidBeneficiaryRow,
  AidDisbursementRow,
  AidRequestJoinedRow,
  AidRequestRow,
} from "../types";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function unwrapRel<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

function parseItems(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);
  if (typeof raw === "string") {
    const j = safeJsonParseUnknown(raw, null);
    if (Array.isArray(j)) return j.map((x) => String(x));
  }
  return [];
}

export function normalizeAidRequestRow(r: AidRequestJoinedRow): AidRequestJoinedRow {
  const ben = unwrapRel(r.aid_beneficiaries);
  const dis = unwrapRel(r.aid_disbursements);
  return {
    ...r,
    items: parseItems(r.items),
    aid_beneficiaries: ben ?? null,
    aid_disbursements: dis ?? null,
  };
}

export async function fetchAidBeneficiaries(): Promise<AidBeneficiaryRow[]> {
  const c = clientOrThrow();
  const { data, error } = await c.from("aid_beneficiaries").select("*").order("full_name", { ascending: true });
  if (error) throw new Error(formatPostgrestError(error, "aid_beneficiaries"));
  return (data ?? []) as AidBeneficiaryRow[];
}

export async function fetchAidRequestsJoined(): Promise<AidRequestJoinedRow[]> {
  const c = clientOrThrow();
  const { data, error } = await c
    .from("aid_requests")
    .select("*, aid_beneficiaries (*), aid_disbursements (*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(formatPostgrestError(error, "aid_requests"));
  return (data ?? []).map((row) => normalizeAidRequestRow(row as AidRequestJoinedRow));
}

export async function upsertAidBeneficiary(
  row: Partial<AidBeneficiaryRow> & { full_name: string }
): Promise<AidBeneficiaryRow> {
  const c = clientOrThrow();
  const uid = (await c.auth.getUser()).data.user?.id ?? null;
  const payload: Record<string, unknown> = {
    full_name: row.full_name.trim(),
    gender: row.gender ?? "",
    phone: String(row.phone ?? "").trim(),
    address: String(row.address ?? "").trim(),
    group_category: row.group_category ?? "Wengine",
    special_condition: String(row.special_condition ?? "").trim(),
    notes: String(row.notes ?? "").trim(),
    created_by: uid,
  };
  if (row.id) payload.id = row.id;
  const { data, error } = await c.from("aid_beneficiaries").upsert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "aid_beneficiaries.upsert"));
  return data as AidBeneficiaryRow;
}

export async function deleteAidBeneficiary(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("aid_beneficiaries").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "aid_beneficiaries.delete"));
}

export async function upsertAidRequest(
  row: Partial<AidRequestRow> & { beneficiary_id: string }
): Promise<AidRequestRow> {
  const c = clientOrThrow();
  const uid = (await c.auth.getUser()).data.user?.id ?? null;
  const itemsArr = parseItems(row.items);
  const payload: Record<string, unknown> = {
    id: row.id,
    beneficiary_id: row.beneficiary_id,
    aid_type: row.aid_type ?? "other",
    description: String(row.description ?? "").trim(),
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0),
    items: itemsArr,
    urgency_level: row.urgency_level ?? "medium",
    request_date: (row.request_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
    status: row.status ?? "draft",
    reviewed_by: String(row.reviewed_by ?? "").trim(),
    review_notes: String(row.review_notes ?? "").trim(),
    review_date: row.review_date || null,
    approved_by: String(row.approved_by ?? "").trim(),
    approved_signature: String(row.approved_signature ?? "").trim(),
    approval_notes: String(row.approval_notes ?? "").trim(),
    approved_at: row.approved_at ?? null,
    approval_status: row.approval_status ?? "pending",
    completed_at: row.completed_at ?? null,
    created_by: uid,
  };
  if (row.id) payload.id = row.id;
  const { data, error } = await c.from("aid_requests").upsert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "aid_requests.upsert"));
  return data as AidRequestRow;
}

export async function deleteAidRequest(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("aid_requests").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "aid_requests.delete"));
}

export async function upsertAidDisbursement(
  row: Partial<AidDisbursementRow> & { request_id: string }
): Promise<AidDisbursementRow> {
  const c = clientOrThrow();
  const payload: Record<string, unknown> = {
    id: row.id,
    request_id: row.request_id,
    delivered_by: String(row.delivered_by ?? "").trim(),
    delivered_at: row.delivered_at ?? null,
    delivery_method: row.delivery_method ?? "physical_items",
    delivery_reference: String(row.delivery_reference ?? "").trim(),
    delivery_notes: String(row.delivery_notes ?? "").trim(),
    recipient_confirmation: String(row.recipient_confirmation ?? "").trim(),
    amount_delivered: row.amount_delivered ?? null,
    completed_at: row.completed_at ?? null,
  };
  if (row.id) payload.id = row.id;
  const { data, error } = await c.from("aid_disbursements").upsert(payload, { onConflict: "request_id" }).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "aid_disbursements.upsert"));
  return data as AidDisbursementRow;
}

export async function deleteAidDisbursement(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("aid_disbursements").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "aid_disbursements.delete"));
}
