import type { KiongoziRecord } from "../types";

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function blobForMatch(r: KiongoziRecord): string {
  return `${r.leadership_level ?? ""} ${r.ngazi ?? ""} ${r.assigned_entity ?? ""} ${r.cheo ?? ""}`.toLowerCase();
}

/**
 * Je, kiongozi huyu anahesabiwa katika ngazi ya matawi/vituo?
 * Tumia `tawi_id`, jina la tawi lililounganishwa, au alama za cheo/ngazi.
 */
export function matchesMatawiTierLeader(r: KiongoziRecord): boolean {
  const tid = String(r.tawi_id ?? "").trim();
  if (tid && UUID_LIKE.test(tid)) return true;
  const tw = (r.tawi || "").trim();
  if (tw.length > 0 && tw !== "—") return true;
  const b = blobForMatch(r);
  if (/\b(tawi|kituo)\b/.test(b)) return true;
  if (b.includes("parokia") || b.includes("branch") || b.includes("matawi")) return true;
  return false;
}
