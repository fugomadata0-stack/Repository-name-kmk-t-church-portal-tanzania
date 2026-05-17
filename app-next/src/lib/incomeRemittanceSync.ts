import { parentNgazi, type NgaziRemittanceKind } from "./incomeDistribution";
import { resolveIncomeLineGeo, type ResolvedIncomeGeo } from "./incomeGeoResolve";
import { getSupabaseOrThrow } from "./supabaseClient";
import type { IncomeManagementRecord } from "../types";
import { listIncomeDistributionSettings, type IncomeDistributionSetting } from "../services/phase1FoundationService";

function roundTz(n: number): number {
  return Math.round(n * 100) / 100;
}

function settingFor(
  settings: IncomeDistributionSetting[],
  level: NgaziRemittanceKind,
  entityId: string | null | undefined
): IncomeDistributionSetting | undefined {
  return (
    settings.find((s) => s.scope_level === level && s.entity_id === entityId) ??
    settings.find((s) => s.scope_level === level && s.entity_id == null)
  );
}

function entityIdForLevel(geo: ResolvedIncomeGeo, level: NgaziRemittanceKind): string | null {
  if (level === "tawi") return geo.tawi_id;
  if (level === "jimbo") return geo.jimbo_id;
  if (level === "dayosisi") return geo.dayosisi_id;
  return null;
}

/**
 * Baada ya kuhifadhi mstari wa mapato: unda/refresh uhamisho wa ngazi
 * Tawi → Jimbo → Dayosisi → KMK(T) (geo IDs zinakamilishwa kiotomatiki).
 */
export async function syncIncomeLineRemittances(line: IncomeManagementRecord): Promise<void> {
  if (!line.id) return;
  const c = getSupabaseOrThrow();
  const settings = await listIncomeDistributionSettings().catch(() => [] as IncomeDistributionSetting[]);
  const geo = await resolveIncomeLineGeo(line);

  await c.from("church_income_remittances").delete().eq("income_line_id", line.id);

  const mode = line.distributionMode ?? "hierarchy_share";
  const total = Math.max(0, line.amount ?? 0);
  const upwardFromOrigin = Math.max(0, line.amountUpward ?? 0);
  if (total <= 0) return;

  const periodStart = line.collectionDate?.slice(0, 10) || null;
  const periodEnd = periodStart;
  const receipt = line.receiptNo?.trim() || null;
  const approval = line.status === "Approved" || line.status === "Posted to Ledger" ? "approved" : "pending";

  type Hop = {
    from_level: string;
    to_level: string;
    from_entity_id: string | null;
    to_entity_id: string | null;
    amount_tz: number;
    transfer_amount_tz: number;
    remaining_amount_tz: number;
  };

  const hops: Hop[] = [];

  if (geo.origin_level === "kmkt") {
    const directAmount = mode === "full_remittance" ? total : upwardFromOrigin;
    if (directAmount > 0) {
      hops.push({
        from_level: "external",
        to_level: "kmkt",
        from_entity_id: null,
        to_entity_id: null,
        amount_tz: directAmount,
        transfer_amount_tz: directAmount,
        remaining_amount_tz: mode === "full_remittance" ? 0 : roundTz(total - directAmount),
      });
    }
  } else if (mode === "full_remittance") {
    const origin = geo.origin_level;
    let from: NgaziRemittanceKind = origin;
    const amount = total;
    while (parentNgazi(from)) {
      const to: NgaziRemittanceKind = parentNgazi(from)!;
      hops.push({
        from_level: from,
        to_level: to,
        from_entity_id: entityIdForLevel(geo, from),
        to_entity_id: entityIdForLevel(geo, to),
        amount_tz: amount,
        transfer_amount_tz: amount,
        remaining_amount_tz: 0,
      });
      from = to;
    }
  } else {
    const origin = geo.origin_level;
    let packet = upwardFromOrigin;
    let from: NgaziRemittanceKind = origin;
    const localRetain = roundTz(total - packet);

    while (packet > 0) {
      const to = parentNgazi(from);
      if (!to) break;

      const fromSetting = settingFor(settings, from, entityIdForLevel(geo, from));
      let transfer: number;
      let remaining: number;

      if (from === origin) {
        transfer = packet;
        remaining = localRetain;
      } else {
        const upPct = fromSetting?.upward_percent ?? 35;
        transfer = roundTz((packet * upPct) / 100);
        remaining = roundTz(packet - transfer);
      }

      hops.push({
        from_level: from,
        to_level: to,
        from_entity_id: entityIdForLevel(geo, from),
        to_entity_id: entityIdForLevel(geo, to),
        amount_tz: packet,
        transfer_amount_tz: transfer,
        remaining_amount_tz: remaining,
      });

      packet = transfer;
      from = to;
    }
  }

  if (hops.length === 0) return;

  const rows = hops.map((h) => ({
    income_line_id: line.id,
    from_level: h.from_level,
    to_level: h.to_level,
    from_entity_id: h.from_entity_id,
    to_entity_id: h.to_entity_id,
    amount_tz: h.amount_tz,
    transfer_amount_tz: h.transfer_amount_tz,
    remaining_amount_tz: h.remaining_amount_tz,
    approval_status: approval,
    receipt_number: receipt,
    period_start: periodStart,
    period_end: periodEnd,
    notes: `Auto-sync · geo: ${geo.origin_level} → KMK(T) · line ${line.incomeCode ?? line.id}`,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await c.from("church_income_remittances").upsert(rows, {
    onConflict: "income_line_id,from_level,to_level",
    ignoreDuplicates: false,
  });
  if (error) {
    const { error: insErr } = await c.from("church_income_remittances").insert(rows);
    if (insErr) console.warn("[incomeRemittanceSync]", insErr.message);
  }
}
