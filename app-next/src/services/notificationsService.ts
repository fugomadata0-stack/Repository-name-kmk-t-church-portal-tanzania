import { formatPostgrestError } from "../lib/supabaseErrors";
import { getCurrentUserId } from "../lib/supabaseAuthSession";
import { getSupabase } from "../lib/supabaseClient";
import type { PortalNotificationPriority, PortalNotificationRow, PortalNotificationType } from "../types";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToNotification(r: Record<string, unknown>, readByMe: boolean): PortalNotificationRow {
  const t = String(r.type ?? "info");
  const type = (
    ["auth", "approval", "finance", "document", "system", "structure", "media", "event", "info", "success", "warning", "error"].includes(t)
      ? t
      : "info"
  ) as PortalNotificationType;
  const p = String(r.priority ?? "info");
  const priority = (["info", "success", "warning", "critical"].includes(p) ? p : "info") as PortalNotificationPriority;
  return {
    id: String(r.id ?? ""),
    module: String(r.module ?? "general"),
    title: String(r.title ?? ""),
    message: String(r.message ?? ""),
    type,
    priority,
    target_role: r.target_role == null ? null : String(r.target_role),
    target_user_id: r.target_user_id == null ? null : String(r.target_user_id),
    read_status: Boolean(r.read_status),
    action_url: r.action_url == null ? null : String(r.action_url),
    created_by: r.created_by == null ? null : String(r.created_by),
    is_global: Boolean(r.is_global),
    is_read_legacy: Boolean(r.is_read),
    read_by_me: readByMe,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

/** Orodha ya taarifa zinazoonekana kwa mtumiaji + hali ya kusoma. */
export async function fetchNotificationsWithReadState(): Promise<PortalNotificationRow[]> {
  const c = clientOrThrow();
  const uid = getCurrentUserId();
  if (!uid) return [];

  const [{ data: notifs, error: e1 }, { data: reads, error: e2 }] = await Promise.all([
    c.from("notifications").select("*").order("created_at", { ascending: false }),
    c.from("notification_reads").select("notification_id").eq("user_id", uid),
  ]);
  if (e1) throw new Error(formatPostgrestError(e1, "notifications"));
  if (e2) throw new Error(formatPostgrestError(e2, "notification_reads"));

  const readSet = new Set((reads ?? []).map((x) => String((x as { notification_id: string }).notification_id)));
  return (notifs ?? []).map((n) => rowToNotification(n as Record<string, unknown>, readSet.has(String((n as { id: string }).id))));
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const rows = await fetchNotificationsWithReadState();
  return rows.filter((r) => !r.read_by_me).length;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const c = clientOrThrow();
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Hujajiunga.");
  const { error } = await c.from("notification_reads").upsert(
    { notification_id: notificationId, user_id: uid },
    { onConflict: "notification_id,user_id" }
  );
  if (error) throw new Error(formatPostgrestError(error, "notification_reads.upsert"));
}

export async function markNotificationUnread(notificationId: string): Promise<void> {
  const c = clientOrThrow();
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Hujajiunga.");
  const { error } = await c.from("notification_reads").delete().eq("notification_id", notificationId).eq("user_id", uid);
  if (error) throw new Error(formatPostgrestError(error, "notification_reads.delete"));
}

export async function markAllNotificationsRead(): Promise<void> {
  const rows = await fetchNotificationsWithReadState();
  const unread = rows.filter((r) => !r.read_by_me);
  if (unread.length === 0) return;
  const c = clientOrThrow();
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Hujajiunga.");
  const payload = unread.map((r) => ({ notification_id: r.id, user_id: uid }));
  const { error } = await c.from("notification_reads").upsert(payload, { onConflict: "notification_id,user_id" });
  if (error) throw new Error(formatPostgrestError(error, "notification_reads.mark_all"));
}

export async function createNotification(input: {
  module?: string;
  title: string;
  message: string;
  type?: PortalNotificationType;
  priority?: PortalNotificationPriority;
  is_global?: boolean;
  target_role?: string | null;
  target_user_id?: string | null;
  action_url?: string | null;
}): Promise<PortalNotificationRow> {
  const c = clientOrThrow();
  const uid = getCurrentUserId();
  const payload = {
    module: input.module?.trim() || "general",
    title: input.title.trim(),
    message: input.message.trim(),
    type: input.type ?? "info",
    priority: input.priority ?? "info",
    is_global: Boolean(input.is_global),
    target_role: input.target_role?.trim() || null,
    target_user_id: input.target_user_id?.trim() || null,
    read_status: false,
    action_url: input.action_url?.trim() || null,
    created_by: uid,
    is_read: false,
  };
  const { data, error } = await c.from("notifications").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "notifications.insert"));
  return rowToNotification(data as Record<string, unknown>, false);
}

export async function updateNotification(
  id: string,
  patch: Partial<{
    module: string;
    title: string;
    message: string;
    type: PortalNotificationType;
    priority: PortalNotificationPriority;
    is_global: boolean;
    target_role: string | null;
    target_user_id: string | null;
    read_status: boolean;
    action_url: string | null;
  }>
): Promise<PortalNotificationRow> {
  const c = clientOrThrow();
  const payload: Record<string, unknown> = { ...patch };
  if (patch.title != null) payload.title = patch.title.trim();
  if (patch.message != null) payload.message = patch.message.trim();
  if (patch.module != null) payload.module = patch.module.trim();
  if (patch.target_role !== undefined) payload.target_role = patch.target_role?.trim() || null;
  if (patch.target_user_id !== undefined) payload.target_user_id = patch.target_user_id?.trim() || null;
  if (patch.action_url !== undefined) payload.action_url = patch.action_url?.trim() || null;
  const { data, error } = await c.from("notifications").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "notifications.update"));
  const uid = getCurrentUserId();
  const { data: rd } = await c.from("notification_reads").select("notification_id").eq("user_id", uid ?? "").eq("notification_id", id).maybeSingle();
  const readByMe = !!rd;
  return rowToNotification(data as Record<string, unknown>, readByMe);
}

export async function deleteNotification(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("notifications").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "notifications.delete"));
}
