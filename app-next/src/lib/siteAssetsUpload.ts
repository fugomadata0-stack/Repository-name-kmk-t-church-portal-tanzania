import { formatStorageError } from "./supabaseErrors";
import { getSupabase } from "./supabaseClient";
import { publicObjectUploadOptions } from "./storageUpload";

function safeFileName(name: string): string {
  return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "") || "faili";
}

/**
 * Pakia faili kwenye bucket `site-assets` na urejeshe URL ya umma.
 * `pathPrefix` mfano: hero, cross, gallery, about/logo
 */
export async function uploadSitePublicAsset(pathPrefix: string, file: File): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error("Weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY kwenye .env.local.");
  const path = `${pathPrefix.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await client.storage.from("site-assets").upload(path, file, publicObjectUploadOptions(file));
  if (error) throw new Error(formatStorageError(error, "site-assets"));
  const { data } = client.storage.from("site-assets").getPublicUrl(path);
  return data.publicUrl;
}
