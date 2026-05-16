import type { PostgrestError } from "@supabase/supabase-js";
import { formatPostgrestError, isAbortLikeError, isMissingTableError } from "./supabaseErrors";

/** Ondoa undefined ili PostgREST usitume safu zisizo kamili kwa makosa */
export function stripUndefined<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(row)) {
    const key = k as keyof T;
    const v = row[key];
    if (v !== undefined) (out as Record<string, unknown>)[k as string] = v;
  }
  return out;
}

/** Badilisha id kutoka DB (uuid | bigint | nambari) kuwa kamili kwa .eq() */
export function asDbId(id: unknown): string | number {
  if (typeof id === "bigint") return id.toString();
  if (typeof id === "number") return id;
  return String(id ?? "");
}

function throwIfAbortResultError(error: PostgrestError | null): void {
  if (!error) return;
  if (isAbortLikeError(error) || isAbortLikeError(error.message)) {
    throw new DOMException(error.message || "Ombi limesitishwa.", "AbortError");
  }
}

export function unwrapOrThrow<T>(
  result: { data: T | null; error: PostgrestError | null },
  context: string
): T {
  if (result.error) {
    throwIfAbortResultError(result.error);
    throw new Error(formatPostgrestError(result.error, context));
  }
  if (result.data === null || result.data === undefined) {
    throw new Error(`${context}: hakuna data iliyorejeshwa.`);
  }
  return result.data;
}

export function unwrapMaybe<T>(
  result: { data: T | null; error: PostgrestError | null },
  context: string
): T | null {
  if (result.error) {
    if (isMissingTableError(result.error)) {
      if (import.meta.env.DEV) {
        console.warn(`[${context}] Table haipo/schema cache bado; tunarudisha null salama.`);
      }
      return null;
    }
    throwIfAbortResultError(result.error);
    throw new Error(formatPostgrestError(result.error, context));
  }
  return result.data ?? null;
}

export function unwrapList<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  context: string
): T[] {
  if (result.error) {
    if (isMissingTableError(result.error)) {
      if (import.meta.env.DEV) {
        console.warn(`[${context}] Table haipo/schema cache bado; tunarudisha [] salama.`);
      }
      return [];
    }
    throwIfAbortResultError(result.error);
    throw new Error(formatPostgrestError(result.error, context));
  }
  return result.data ?? [];
}

