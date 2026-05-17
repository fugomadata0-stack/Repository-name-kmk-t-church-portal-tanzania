import {
  parseExecutiveKpiDashboardRpc,
  type ExecutiveKpiDashboardPayload,
  type ExecutiveKpiScope,
} from "../lib/executiveKpiDashboard";
import { getSupabaseOrThrow, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";

const REALTIME_TABLES = [
  "church_members",
  "church_income_lines",
  "church_finance_entries",
  "church_income_remittances",
  "church_institution_projects",
  "church_contribution_form_uploads",
  "attendance_sessions",
] as const;

export async function fetchExecutiveKpiDashboard(
  scope: ExecutiveKpiScope = "kmkt",
  entityId?: string | null
): Promise<ExecutiveKpiDashboardPayload> {
  const { data, error } = await getSupabaseOrThrow().rpc("portal_executive_kpi_dashboard", {
    p_scope: scope,
    p_entity_id: entityId ?? null,
  });
  if (error) {
    return {
      ...parseExecutiveKpiDashboardRpc({}),
      error: error.message,
    };
  }
  return parseExecutiveKpiDashboardRpc(data);
}

export function subscribeExecutiveKpiDashboard(
  onChange: () => void,
  debounceMs = 900
): () => void {
  if (!isSupabaseRealtimeEnabled()) return () => undefined;
  const c = getSupabaseOrThrow();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => onChange(), debounceMs);
  };
  const ch = c.channel("executive-kpi-dashboard");
  for (const table of REALTIME_TABLES) {
    ch.on("postgres_changes", { event: "*", schema: "public", table }, schedule);
  }
  ch.subscribe();
  return () => {
    if (timer) clearTimeout(timer);
    void c.removeChannel(ch);
  };
}
