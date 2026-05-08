import { publicObjectUploadOptions } from "../lib/storageUpload";
import { formatStorageError } from "../lib/supabaseErrors";
import { publicStorageObjectPath } from "../lib/storagePaths";
import { getSupabase } from "../lib/supabaseClient";
import {
  deleteDomainEntity,
  fetchDomainEntities,
  upsertDomainEntity,
} from "./domainModuleService";
import type { DomainEntityRecord } from "../types";

export const SCHOOL_LOG_SUBMODULE_KEY = "Log ya Shule";
const MODULE_KEY = "taasisi";
const BUCKET = "church-files" as const;
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
  const c = clientOrThrow();
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(0, 160) || "log";
  const path = `${PREFIX}/${crypto.randomUUID()}_${safe}`;
  const { error } = await c.storage.from(BUCKET).upload(path, file, publicObjectUploadOptions(file, { upsert: false }));
  if (error) throw new Error(formatStorageError(error, BUCKET));
  const { data } = c.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
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
