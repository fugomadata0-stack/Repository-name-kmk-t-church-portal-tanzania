/**
 * Meza zinazotumiwa na portal (probe ya ufikiaji / RLS).
 */
export const PORTAL_TABLE_NAMES = [
  "dayosisi",
  "majimbo",
  "matawi",
  "leaders",
  "members",
  "families",
  "member_families",
  "choirs",
  "departments",
  "fellowships",
  "institutions",
  "publications",
  "events",
  "documents",
  "auth_user_profiles",
  "data_submissions",
  "finance_transactions",
  "payment_transactions",
  "payment_settings",
  "attendance_records",
  "attendance_items",
  "ministries",
  "media_items",
  "notifications",
  "admin_actions",
  "audit_logs",
  "activity_logs",
  "online_users",
  "website_visitors",
  "validation_runs",
  "workflow_notifications",
  "role_permissions_matrix",
];

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 * @returns {Promise<{ ok: number; warn: number; rows: { table: string; status: string; detail: string }[] }>}
 */
export async function runPortalTableProbes(client, safeAsync) {
  const rows = [];
  let ok = 0;
  let warn = 0;
  if (!client || typeof safeAsync !== "function") {
    return { ok: 0, warn: 1, rows: [{ table: "(init)", status: "WARN", detail: "Missing client or safeAsync" }] };
  }
  for (const table of PORTAL_TABLE_NAMES) {
    const res = await safeAsync(`probe_${table}`, async () => client.from(table).select("*").limit(1), null);
    if (!res || res.error) {
      warn += 1;
      rows.push({
        table,
        status: "WARN",
        detail: res?.error?.message || "Haijapatikana au RLS imezuia",
      });
    } else {
      ok += 1;
      rows.push({ table, status: "OK", detail: "Read probe passed" });
    }
  }
  return { ok, warn, rows };
}
