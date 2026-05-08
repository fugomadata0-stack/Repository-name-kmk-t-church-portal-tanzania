import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import type { AttendanceMemberRecord, AttendanceSessionRecord, Status } from "../types";

function uiStatus(raw: string | null | undefined): Status {
  const s = String(raw ?? "active").toLowerCase();
  if (s === "inactive") return "Inactive";
  if (s === "pending") return "Pending";
  if (s === "archived") return "Archived";
  return "Active";
}

function dbStatus(raw: Status | undefined): string {
  const s = String(raw ?? "Active").toLowerCase();
  if (s.includes("inactive")) return "inactive";
  if (s.includes("pending")) return "pending";
  if (s.includes("archived")) return "archived";
  return "active";
}

function mapSession(row: Record<string, unknown>): AttendanceSessionRecord {
  return {
    id: String(row.id ?? ""),
    attendance_date: String(row.attendance_date ?? ""),
    service_name: String(row.service_name ?? ""),
    attendance_type: String(row.attendance_type ?? ""),
    dayosisi_id: row.dayosisi_id ? String(row.dayosisi_id) : null,
    jimbo_id: row.jimbo_id ? String(row.jimbo_id) : null,
    tawi_id: row.tawi_id ? String(row.tawi_id) : null,
    idara_name: row.idara_name ? String(row.idara_name) : null,
    huduma_name: row.huduma_name ? String(row.huduma_name) : null,
    jumuiya_name: row.jumuiya_name ? String(row.jumuiya_name) : null,
    total_men: Number(row.total_men ?? 0),
    total_women: Number(row.total_women ?? 0),
    total_youth: Number(row.total_youth ?? 0),
    total_children: Number(row.total_children ?? 0),
    visitors: Number(row.visitors ?? 0),
    total_attendance: Number(row.total_attendance ?? 0),
    recorded_by: row.recorded_by ? String(row.recorded_by) : null,
    notes: row.notes ? String(row.notes) : null,
    status: uiStatus(row.status as string),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function mapMember(row: Record<string, unknown>): AttendanceMemberRecord {
  return {
    id: String(row.id ?? ""),
    session_id: String(row.session_id ?? ""),
    member_id: String(row.member_id ?? ""),
    member_name: String(row.member_name ?? ""),
    attendance_status: String(row.attendance_status ?? "absent") as "present" | "absent",
    qr_code: row.qr_code ? String(row.qr_code) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at ?? ""),
  };
}

export async function fetchAttendanceSessions(): Promise<AttendanceSessionRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c.from("attendance_sessions").select("*").order("attendance_date", { ascending: false }).limit(500);
  if (error) throw new Error(formatPostgrestError(error, "attendance_sessions.list"));
  return (data ?? []).map((r) => mapSession(r as Record<string, unknown>));
}

export async function fetchAttendanceRecords(sessionId: string): Promise<AttendanceMemberRecord[]> {
  const c = getSupabase();
  if (!c || !sessionId) return [];
  const { data, error } = await c.from("attendance_records").select("*").eq("session_id", sessionId).order("created_at", { ascending: false });
  if (error) throw new Error(formatPostgrestError(error, "attendance_records.list"));
  return (data ?? []).map((r) => mapMember(r as Record<string, unknown>));
}

export async function upsertAttendanceSession(row: Partial<AttendanceSessionRecord> & { service_name: string; attendance_date: string }): Promise<AttendanceSessionRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const men = Number(row.total_men ?? 0);
  const women = Number(row.total_women ?? 0);
  const youth = Number(row.total_youth ?? 0);
  const children = Number(row.total_children ?? 0);
  const visitors = Number(row.visitors ?? 0);
  const total = men + women + youth + children + visitors;
  const payload = {
    attendance_date: row.attendance_date,
    service_name: row.service_name.trim(),
    attendance_type: row.attendance_type?.trim() || "Ibada ya Jumapili",
    dayosisi_id: row.dayosisi_id ?? null,
    jimbo_id: row.jimbo_id ?? null,
    tawi_id: row.tawi_id ?? null,
    idara_name: row.idara_name?.trim() || null,
    huduma_name: row.huduma_name?.trim() || null,
    jumuiya_name: row.jumuiya_name?.trim() || null,
    total_men: men,
    total_women: women,
    total_youth: youth,
    total_children: children,
    visitors,
    total_attendance: total,
    recorded_by: row.recorded_by?.trim() || null,
    notes: row.notes?.trim() || null,
    status: dbStatus(row.status),
    updated_at: new Date().toISOString(),
  };
  if (row.id) {
    const { data, error } = await c.from("attendance_sessions").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "attendance_sessions.update"));
    return mapSession(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("attendance_sessions").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "attendance_sessions.insert"));
  return mapSession(data as Record<string, unknown>);
}

export async function replaceAttendanceRecords(sessionId: string, rows: Array<Partial<AttendanceMemberRecord> & { member_id: string; member_name: string; attendance_status: "present" | "absent" }>): Promise<void> {
  const c = getSupabase();
  if (!c || !sessionId) return;
  const { error: delErr } = await c.from("attendance_records").delete().eq("session_id", sessionId);
  if (delErr) throw new Error(formatPostgrestError(delErr, "attendance_records.clear"));
  if (rows.length === 0) return;
  const payload = rows.map((r) => ({
    session_id: sessionId,
    member_id: r.member_id,
    member_name: r.member_name,
    attendance_status: r.attendance_status,
    qr_code: r.qr_code ?? null,
    notes: r.notes ?? null,
  }));
  const { error } = await c.from("attendance_records").insert(payload);
  if (error) throw new Error(formatPostgrestError(error, "attendance_records.insert"));
}

export async function deleteAttendanceSession(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !id) return;
  const { error } = await c.from("attendance_sessions").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "attendance_sessions.delete"));
}
