/** Tarehe za kalenda kwa Asia/Dar_es_Salaam (muundo ISO YYYY-MM-DD). */

export const PORTAL_TZ = "Africa/Dar_es_Salaam";

export function formatYmdInTz(d: Date, timeZone: string = PORTAL_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Leo katika TZ ya portal. */
export function todayIsoInPortalTz(): string {
  return formatYmdInTz(new Date(), PORTAL_TZ);
}

/** Hali ya mstari wa tarehe ni mwezi na mwaka uleule wa leo (TZ). */
export function entryIsoInSameCalendarMonth(entryIsoYmd: string, timeZone: string = PORTAL_TZ): boolean {
  const today = formatYmdInTz(new Date(), timeZone);
  return entryIsoYmd.slice(0, 7) === today.slice(0, 7);
}

export function entryIsoIsToday(entryIsoYmd: string, timeZone: string = PORTAL_TZ): boolean {
  return entryIsoYmd === formatYmdInTz(new Date(), timeZone);
}

/** Mwaka wa kalenda uleule (TZ) — mfano 2026-05 ukilingana na leo 2026. */
export function entryIsoInSameCalendarYear(entryIsoYmd: string, timeZone: string = PORTAL_TZ): boolean {
  if (!entryIsoYmd || entryIsoYmd.length < 4) return false;
  const today = formatYmdInTz(new Date(), timeZone);
  return entryIsoYmd.slice(0, 4) === today.slice(0, 4);
}

/**
 * Wiki ya kalenda (Jumatatu–Jumapili) inayolingana na leo katika TZ.
 * Kwa `Africa/Dar_es_Salaam` tunatumia UTC+3 bila DST (hakuna mabadiliko ya saa).
 */
export function entryIsoInSameCalendarWeek(entryIsoYmd: string, timeZone: string = PORTAL_TZ): boolean {
  if (!entryIsoYmd || entryIsoYmd.length < 10) return false;
  if (timeZone !== PORTAL_TZ) {
    const today = formatYmdInTz(new Date(), timeZone);
    return entryIsoYmd.slice(0, 7) === today.slice(0, 7);
  }

  const ymdToUtcNoonEat = (ymd: string) => {
    const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d, 9, 0, 0));
  };

  const entry = ymdToUtcNoonEat(entryIsoYmd);
  const today = ymdToUtcNoonEat(formatYmdInTz(new Date(), PORTAL_TZ));
  if (!entry || !today) return false;

  const msDay = 86400000;
  const mondayStart = (d: Date) => {
    const dow = (d.getUTCDay() + 6) % 7;
    return new Date(d.getTime() - dow * msDay);
  };

  return mondayStart(entry).getTime() === mondayStart(today).getTime();
}

/** Siku ya mwisho ya mwezi wa `YYYY-MM` (TZ calendar — hesabu ya UTC kwa siku za mwezi). */
export function monthEndIsoPortalTz(yearMonth: string): string {
  const m = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!m) return `${yearMonth}-28`;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!y || !mo || mo < 1 || mo > 12) return `${yearMonth}-28`;
  const last = new Date(Date.UTC(y, mo, 0));
  const d = String(last.getUTCDate()).padStart(2, "0");
  return `${y}-${String(mo).padStart(2, "0")}-${d}`;
}

/** Mwezi uliopita kama `YYYY-MM` kwa TZ ya portal. */
export function previousMonthYyyyMmPortalTz(now: Date = new Date()): string {
  const today = formatYmdInTz(now, PORTAL_TZ);
  let y = Number(today.slice(0, 4));
  let mo = Number(today.slice(5, 7));
  mo -= 1;
  if (mo < 1) {
    mo = 12;
    y -= 1;
  }
  return `${y}-${String(mo).padStart(2, "0")}`;
}

/**
 * Jumatatu na Jumapili (YYYY-MM-DD) za wiki ya kalenda inayohusiana na leo (TZ portal).
 */
export function weekMondaySundayIsoPortalTz(now: Date = new Date()): { mon: string; sun: string } {
  const today = formatYmdInTz(now, PORTAL_TZ);
  const ymdToUtcNoonEat = (ymd: string) => {
    const [y, mo, d] = ymd.slice(0, 10).split("-").map(Number);
    if (!y || !mo || !d) return null;
    return new Date(Date.UTC(y, mo - 1, d, 9, 0, 0));
  };
  const iso = (d: Date) => {
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${day}`;
  };
  const todayDt = ymdToUtcNoonEat(today);
  if (!todayDt) return { mon: today, sun: today };
  const dow = (todayDt.getUTCDay() + 6) % 7;
  const monDt = new Date(todayDt.getTime() - dow * 86400000);
  const sunDt = new Date(monDt.getTime() + 6 * 86400000);
  return { mon: iso(monDt), sun: iso(sunDt) };
}
