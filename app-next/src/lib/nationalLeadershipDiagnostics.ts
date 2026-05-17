import type { NationalLeadershipProfileRow } from "../services/nationalLeadershipService";

const ENABLED = import.meta.env.DEV;

export function logNationalLeadershipSaveAttempt(
  phase: string,
  row: NationalLeadershipProfileRow,
  extra?: Record<string, unknown>,
): void {
  if (!ENABLED) return;
  console.warn("[national-leadership-save]", phase, {
    role_key: row.role_key,
    full_name: row.full_name?.slice(0, 40),
    has_photo: Boolean(row.profile_photo_url?.trim()),
    has_signature: Boolean(row.signature_url?.trim()),
    biography_len: row.biography?.trim().length ?? 0,
    attachments: Array.isArray(row.attachments_json) ? row.attachments_json.length : "invalid",
    ...extra,
  });
}

export function logNationalLeadershipSaveResult(
  phase: string,
  ok: boolean,
  detail?: Record<string, unknown>,
): void {
  if (!ENABLED) return;
  if (ok) console.warn("[national-leadership-save]", phase, "OK", detail ?? {});
  else console.warn("[national-leadership-save]", phase, "FAIL", detail ?? {});
}
