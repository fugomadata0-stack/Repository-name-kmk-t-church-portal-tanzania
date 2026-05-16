import { enterpriseStorageUpload, PORTAL_DOCUMENT_FILE_GUARD } from "../lib/enterpriseStorageUpload";
import { STORAGE_BUCKETS } from "../lib/storageBuckets";
import { formatStorageError } from "../lib/supabaseErrors";
import { publicStorageObjectPath } from "../lib/storagePaths";
import { getSupabase } from "../lib/supabase";
import {
  deleteDomainEntity,
  fetchDomainEntities,
  upsertDomainEntity,
} from "./domainModuleService";
import type { DomainEntityRecord } from "../types";

export const SCHOOL_LOG_SUBMODULE_KEY = "Log ya Shule";
const MODULE_KEY = "taasisi";
const BUCKET = STORAGE_BUCKETS.churchFiles;
const PREFIX = "school-logs";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

export async function fetchSchoolLogs(): Promise<DomainEntityRecord[]> {
  return fetchDomainEntities(MODULE_KEY, { submoduleKey: SCHOOL_LOG_SUBMODULE_KEY });
}

export function schoolLogFileUrl(row: DomainEntityRecord): string {
  const ex = row.extra as Record<string, unknown> | undefined;
  return String(ex?.file_url ?? "");
}

export function schoolLogFileName(row: DomainEntityRecord): string {
  const ex = row.extra as Record<string, unknown> | undefined;
  return String(ex?.file_name ?? "");
}

export async function uploadSchoolLogFile(file: File): Promise<{ path: string; publicUrl: string }> {
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(0, 160) || "log";
  const path = `${PREFIX}/${crypto.randomUUID()}_${safe}`;
  const uploaded = await enterpriseStorageUpload({
    bucket: BUCKET,
    file,
    path,
    guard: PORTAL_DOCUMENT_FILE_GUARD,
    upsert: false,
  });
  return { path: uploaded.path, publicUrl: uploaded.publicUrl };
}

export async function removeSchoolLogFileFromStorage(fileUrl: string): Promise<void> {
  const path = publicStorageObjectPath(fileUrl, BUCKET);
  if (!path || !path.startsWith(`${PREFIX}/`)) return;
  const c = clientOrThrow();
  const { error } = await c.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(formatStorageError(error, BUCKET));
}

export async function upsertSchoolLog(row: {
  id?: string;
  title: string;
  category: string;
  details: string;
  event_date: string;
  status: DomainEntityRecord["status"];
  file_url: string;
  file_name: string;
  mime?: string;
}): Promise<DomainEntityRecord> {
  return upsertDomainEntity({
    id: row.id,
    module_key: MODULE_KEY,
    submodule_key: SCHOOL_LOG_SUBMODULE_KEY,
    title: row.title.trim(),
    category: row.category.trim(),
    details: row.details.trim(),
    reference_code: "",
    event_date: row.event_date.trim().slice(0, 10),
    status: row.status,
    extra: {
      file_url: row.file_url,
      file_name: row.file_name,
      mime: row.mime ?? "",
    },
  });
}

export async function deleteSchoolLog(row: DomainEntityRecord): Promise<void> {
  const url = schoolLogFileUrl(row);
  if (url) await removeSchoolLogFileFromStorage(url).catch(() => {});
  await deleteDomainEntity(row.id);
}
