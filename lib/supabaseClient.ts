import { getSupabaseClient } from "../phase3-supabase.js";

export type KmtMutationMeta = {
  created_by?: string;
  updated_by?: string;
  status?: string;
  is_archived?: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
};

export function getEnterpriseSupabaseClient() {
  return getSupabaseClient();
}

export function withAuditColumns<T extends Record<string, unknown>>(
  payload: T,
  meta: KmtMutationMeta = {}
): T & Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    ...payload,
    created_at: (payload.created_at as string) || now,
    updated_at: now,
    created_by: (payload.created_by as string) || meta.created_by || "SYSTEM",
    updated_by: meta.updated_by || meta.created_by || "SYSTEM",
    status: (payload.status as string) || meta.status || "active",
    is_archived: meta.is_archived || false,
    archived_at: meta.archived_at || null,
    archived_by: meta.archived_by || null,
  };
}
