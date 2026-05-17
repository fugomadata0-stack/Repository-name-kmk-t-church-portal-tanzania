import { STORAGE_BUCKETS } from "../lib/storageBuckets";
import {
  computeProjectsAnalyticsFromRows,
  parseProjectsAnalyticsRpc,
  type ChurchProjectsAnalytics,
} from "../lib/churchProjectsAnalytics";
import { buildUploadMetadata, enterpriseStorageUpload } from "../lib/enterpriseStorageUpload";
import { parseMoneyTz } from "../lib/money";
import { getSupabaseOrThrow, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import type { Phase1Scope } from "./phase1FoundationService";
import {
  listInstitutionProjects,
  upsertInstitutionProject,
  type ChurchInstitutionProject,
  type InstitutionProjectType,
} from "./phase1FoundationService";

export type ProjectDocumentMeta = {
  id: string;
  fileName: string;
  publicUrl: string;
  filePath: string;
  uploadedAt: string;
  uploadedBy?: string;
};

export type ChurchInstitutionProjectExpense = {
  id: string;
  project_id: string;
  expense_date: string;
  category: string | null;
  description: string | null;
  amount_tz: number;
  receipt_url: string | null;
  created_at: string;
};

export type ChurchProjectsBundle = {
  projects: ChurchInstitutionProject[];
  analytics: ChurchProjectsAnalytics;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function parseProjectDocuments(raw: unknown): ProjectDocumentMeta[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        id: String(o.id ?? crypto.randomUUID()),
        fileName: String(o.fileName ?? o.file_name ?? "document"),
        publicUrl: String(o.publicUrl ?? o.public_url ?? ""),
        filePath: String(o.filePath ?? o.file_path ?? ""),
        uploadedAt: String(o.uploadedAt ?? o.uploaded_at ?? new Date().toISOString()),
        uploadedBy: o.uploadedBy ? String(o.uploadedBy) : undefined,
      };
    });
}

export async function fetchChurchProjectsBundle(scope: Phase1Scope = "kmkt", entityId?: string | null): Promise<ChurchProjectsBundle> {
  const projects = await listInstitutionProjects();
  let filtered = projects;
  if (scope !== "kmkt" && entityId) {
    if (scope === "dayosisi") filtered = projects.filter((p) => p.dayosisi_id === entityId);
    else if (scope === "jimbo") filtered = projects.filter((p) => p.jimbo_id === entityId);
    else if (scope === "tawi") filtered = projects.filter((p) => p.tawi_id === entityId);
  }

  const { data } = await getSupabaseOrThrow().rpc("portal_church_projects_analytics", {
    p_scope: scope,
    p_entity_id: entityId ?? null,
  });
  const analytics = parseProjectsAnalyticsRpc(data) ?? computeProjectsAnalyticsFromRows(filtered);
  return { projects: filtered, analytics };
}

export async function saveInstitutionProject(
  row: Partial<ChurchInstitutionProject> & { name: string; project_type: InstitutionProjectType }
): Promise<ChurchInstitutionProject> {
  const income = num(row.budget_income_tz);
  const expense = num(row.budget_expense_tz);
  return upsertInstitutionProject({
    ...row,
    budget_income_tz: income,
    budget_expense_tz: expense,
    balance_tz: income - expense,
  });
}

export async function listProjectExpenses(projectId: string): Promise<ChurchInstitutionProjectExpense[]> {
  const { data, error } = await getSupabaseOrThrow()
    .from("church_institution_project_expenses")
    .select("*")
    .eq("project_id", projectId)
    .order("expense_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ChurchInstitutionProjectExpense[];
}

async function syncProjectExpenseTotals(projectId: string): Promise<void> {
  const expenses = await listProjectExpenses(projectId);
  const total = expenses.reduce((s, e) => s + num(e.amount_tz), 0);
  const { data: proj } = await getSupabaseOrThrow()
    .from("church_institution_projects")
    .select("budget_income_tz")
    .eq("id", projectId)
    .single();
  const income = num(proj?.budget_income_tz);
  await getSupabaseOrThrow()
    .from("church_institution_projects")
    .update({
      budget_expense_tz: total,
      balance_tz: income - total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}

export async function upsertProjectExpense(row: {
  id?: string;
  project_id: string;
  expense_date: string;
  category?: string | null;
  description?: string | null;
  amount_tz: number;
  receipt_url?: string | null;
}): Promise<ChurchInstitutionProjectExpense> {
  const payload = {
    project_id: row.project_id,
    expense_date: row.expense_date.slice(0, 10),
    category: row.category?.trim() || null,
    description: row.description?.trim() || null,
    amount_tz: Math.max(0, parseMoneyTz(row.amount_tz)),
    receipt_url: row.receipt_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const c = getSupabaseOrThrow();
  if (row.id) {
    const { data, error } = await c.from("church_institution_project_expenses").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(error.message);
    await syncProjectExpenseTotals(row.project_id);
    return data as ChurchInstitutionProjectExpense;
  }
  const { data, error } = await c.from("church_institution_project_expenses").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  await syncProjectExpenseTotals(row.project_id);
  return data as ChurchInstitutionProjectExpense;
}

export async function deleteProjectExpense(id: string, projectId: string): Promise<void> {
  const { error } = await getSupabaseOrThrow().from("church_institution_project_expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await syncProjectExpenseTotals(projectId);
}

export async function uploadProjectDocument(
  projectId: string,
  file: File,
  uploadedBy: string,
  onProgress?: (pct: number) => void
): Promise<ChurchInstitutionProject> {
  const result = await enterpriseStorageUpload({
    bucket: STORAGE_BUCKETS.churchDocuments,
    file,
    pathPrefix: `institution-projects/${projectId}`,
    guard: {
      allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx", ".xlsx"],
      maxBytes: 8 * 1024 * 1024,
      labelSw: "waraka wa mradi",
    },
    onProgress: (p) => onProgress?.(p.percent),
  });
  const meta = buildUploadMetadata(result, file, { uploadedBy });
  const docEntry: ProjectDocumentMeta = {
    id: crypto.randomUUID(),
    fileName: meta.fileName,
    publicUrl: meta.publicUrl,
    filePath: meta.filePath,
    uploadedAt: meta.uploadedAt,
    uploadedBy,
  };

  const c = getSupabaseOrThrow();
  const { data: existing, error: loadErr } = await c
    .from("church_institution_projects")
    .select("documents_json")
    .eq("id", projectId)
    .single();
  if (loadErr) throw new Error(loadErr.message);

  const docs = parseProjectDocuments(existing?.documents_json);
  docs.unshift(docEntry);

  const { data, error } = await c
    .from("church_institution_projects")
    .update({ documents_json: docs, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ChurchInstitutionProject;
}

export function subscribeChurchProjectsRealtime(onChange: () => void): () => void {
  if (!isSupabaseRealtimeEnabled()) return () => undefined;
  const c = getSupabaseOrThrow();
  const ch = c
    .channel("church-projects-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "church_institution_projects" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "church_institution_project_expenses" }, () =>
      onChange()
    )
    .subscribe();
  return () => {
    void c.removeChannel(ch);
  };
}

export const PROJECT_TYPE_OPTIONS: { value: InstitutionProjectType; label: string }[] = [
  { value: "bible_college", label: "Chuo cha Biblia" },
  { value: "school", label: "Shule" },
  { value: "hospital", label: "Hospitali" },
  { value: "clinic", label: "Kliniki / Clinic" },
  { value: "hospital_clinic", label: "Hospitali & Kliniki (jumla)" },
  { value: "mission_center", label: "Kituo cha Uinjilisti" },
  { value: "admin_center", label: "Kituo cha Utawala" },
  { value: "training_center", label: "Kituo cha Mafunzo" },
  { value: "other", label: "Nyingine" },
];
