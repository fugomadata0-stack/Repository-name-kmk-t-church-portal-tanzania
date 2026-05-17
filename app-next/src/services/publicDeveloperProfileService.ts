import { getSupabase } from "../lib/supabaseClient";

export type PublicDeveloperProfile = {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  po_box: string;
  photo_url: string | null;
  bio: string;
};

function normalizeRow(raw: Record<string, unknown> | null): PublicDeveloperProfile | null {
  if (!raw) return null;
  return {
    full_name: String(raw.full_name ?? "").trim(),
    email: String(raw.email ?? "").trim(),
    phone: String(raw.phone ?? "").trim(),
    address: String(raw.address ?? "").trim(),
    po_box: String(raw.po_box ?? "").trim(),
    photo_url: raw.photo_url == null ? null : String(raw.photo_url).trim() || null,
    bio: String(raw.bio ?? "").trim(),
  };
}

/** Wasifu wa kiufundi kwa ukurasa wa umma — RPC portal_public_developer_profile. */
export async function fetchPublicDeveloperProfileOptional(): Promise<PublicDeveloperProfile | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.rpc("portal_public_developer_profile");
  if (error) return null;
  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | null);
  return normalizeRow(row ?? null);
}
