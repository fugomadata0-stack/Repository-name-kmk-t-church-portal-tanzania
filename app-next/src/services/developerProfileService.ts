import { formatPostgrestError, formatStorageError } from "../lib/supabaseErrors";
import { publicObjectUploadOptions } from "../lib/storageUpload";
import { publicStorageObjectPath } from "../lib/storagePaths";
import { getSupabase } from "../lib/supabaseClient";
import type { DeveloperProfileRecord } from "../types";

const PHOTO_BUCKET = "developer-photos";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToRecord(r: Record<string, unknown>): DeveloperProfileRecord {
  return {
    id: String(r.id ?? ""),
    full_name: String(r.full_name ?? ""),
    email: String(r.email ?? ""),
    phone: String(r.phone ?? ""),
    address: String(r.address ?? ""),
    po_box: String(r.po_box ?? ""),
    photo_url: r.photo_url == null ? null : String(r.photo_url),
    bio: String(r.bio ?? ""),
    created_at: String(r.created_at ?? ""),
  };
}

const FALLBACK_BIO =
  "Hariri wasifu huu na taarifa halisi za mwasifu wa mfumo (hazijazuliwa kwenye uzalishaji).";

export async function fetchDeveloperProfile(): Promise<DeveloperProfileRecord | null> {
  const c = clientOrThrow();
  const { data, error } = await c.from("developer_profile").select("*").limit(1).maybeSingle();
  if (error) throw new Error(formatPostgrestError(error, "developer_profile"));
  if (!data) return null;
  return rowToRecord(data as Record<string, unknown>);
}

/**
 * Hakikisha kuna safu moja ikiwa jedwali ni tupu — **hakuna** nambari ya simu wala anwani bandia kwenye msimbo;
 * msimamizi anahariri kwenye UI baada ya kuonyesha.
 */
export async function ensureDeveloperProfileSeed(): Promise<DeveloperProfileRecord> {
  const existing = await fetchDeveloperProfile();
  if (existing) return existing;
  const c = clientOrThrow();
  const { data, error } = await c
    .from("developer_profile")
    .insert({
      full_name: "Wasifu wa kiufundi (hariri)",
      email: "",
      phone: "",
      address: "",
      po_box: "",
      bio: FALLBACK_BIO,
    })
    .select("*")
    .single();
  if (error) throw new Error(formatPostgrestError(error, "developer_profile.insert"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function updateDeveloperProfile(
  id: string,
  patch: Partial<
    Pick<DeveloperProfileRecord, "full_name" | "email" | "phone" | "address" | "po_box" | "photo_url" | "bio">
  >
): Promise<DeveloperProfileRecord> {
  const c = clientOrThrow();
  const { data, error } = await c
    .from("developer_profile")
    .update({
      ...patch,
      photo_url: patch.photo_url === undefined ? undefined : patch.photo_url,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(formatPostgrestError(error, "developer_profile.update"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function uploadDeveloperPhoto(file: File, profileId: string): Promise<string> {
  const c = clientOrThrow();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `profile/${profileId}-${Date.now()}.${ext}`;
  const { error } = await c.storage.from(PHOTO_BUCKET).upload(path, file, publicObjectUploadOptions(file));
  if (error) throw new Error(formatStorageError(error, PHOTO_BUCKET));
  const { data } = c.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Pakia mpya, sasisha DB, kisha futa ya zamani — epuka kuondoa faili kabla ya mafanikio. */
export async function replaceDeveloperPhoto(
  file: File,
  profileId: string,
  previousPublicUrl: string | null | undefined
): Promise<DeveloperProfileRecord> {
  const newUrl = await uploadDeveloperPhoto(file, profileId);
  try {
    const row = await updateDeveloperProfile(profileId, { photo_url: newUrl });
    if (previousPublicUrl?.trim()) await removeDeveloperPhotoIfStored(previousPublicUrl).catch(() => {});
    return row;
  } catch (e) {
    await removeDeveloperPhotoIfStored(newUrl).catch(() => {});
    throw e;
  }
}

/** Ondoa picha ya zamani kwenye storage baada ya kubadilisha (si lazima kwa kosa). */
export async function removeDeveloperPhotoIfStored(photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl?.trim()) return;
  const p = publicStorageObjectPath(photoUrl, PHOTO_BUCKET);
  if (!p) return;
  const c = clientOrThrow();
  const { error } = await c.storage.from(PHOTO_BUCKET).remove([p]);
  if (error) throw new Error(formatStorageError(error, PHOTO_BUCKET));
}
