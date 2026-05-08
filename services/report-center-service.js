import { reportTypes } from "../constants/workflow.constants.js";
import { asArray, getSafeSupabase, safeAsync } from "../phase-integration-core.js";

const now = () => new Date().toISOString();

export function getReportTypes() {
  return [...reportTypes];
}

export function buildReportQuery(filters = {}) {
  return {
    from: filters.from || "",
    to: filters.to || "",
    role: filters.role || "",
    level: filters.level || "",
    dayosisi: filters.dayosisi || "",
    jimbo: filters.jimbo || "",
    tawi: filters.tawi || "",
    status: filters.status || "",
    search: filters.search || "",
  };
}

export function buildReportMetadata(user = "SYSTEM") {
  return {
    generated_by: user,
    generated_at: now(),
    system: "KANISA LA MENNONITE LA KIINJILI TANZANIA - KMK(T) NATIONAL CHURCH PORTAL",
    signature_placeholder: true,
  };
}

export function exportReportPlaceholder(format, reportType, filters = {}) {
  return {
    ok: true,
    format,
    reportType,
    query: buildReportQuery(filters),
    metadata: buildReportMetadata(filters.generated_by || "SYSTEM"),
  };
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function applySearchFilter(rows, search) {
  const needle = normalize(search);
  if (!needle) return rows;
  return rows.filter((row) => Object.values(row || {}).map((v) => normalize(v)).join(" ").includes(needle));
}

export async function resolveReportRows({ tableName, filters = {}, fallbackRows = [] }) {
  const fallbackFiltered = applySearchFilter(asArray(fallbackRows), filters.search);
  const supabase = getSafeSupabase();
  if (!supabase || !tableName) {
    return { rows: fallbackFiltered, source: "fallback_local" };
  }

  const result = await safeAsync(
    `report_center_${tableName}`,
    async () => {
      let query = supabase.from(tableName).select("*");
      if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00`);
      if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      return query.order("id", { ascending: false }).limit(500);
    },
    null
  );

  if (!result || result.error) return { rows: fallbackFiltered, source: "fallback_local" };
  const rows = applySearchFilter(asArray(result.data), filters.search);
  if (rows.length) return { rows, source: "supabase" };
  return { rows: fallbackFiltered, source: "fallback_local" };
}
