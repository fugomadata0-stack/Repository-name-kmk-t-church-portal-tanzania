import type { DayosisiRecord, JimboRecord, TawiRecord } from "../types";
import { exportTableToPdf } from "./exportHelpers";

/** Chuja vitengo vilivyo inactive/archived kwenye ripoti za PDF. */
export type HierarchyReportPdfOptions = { activeOnly?: boolean };

function isActiveHierarchyStatus(status: string): boolean {
  const s = String(status).toLowerCase();
  return s !== "inactive" && s !== "archived" && s !== "suspended";
}

function dayosisiNameById(rows: DayosisiRecord[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of rows) m.set(d.id, d.jina);
  return m;
}

function jimboNameById(majimbo: JimboRecord[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const j of majimbo) m.set(j.id, j.jina);
  return m;
}

function jimboCountByDayosisi(majimbo: JimboRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const j of majimbo) {
    const id = (j.dayosisi_id ?? "").trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** PDF: muhtasari wa dayosisi + uongozi + idadi ya majimbo kwenye DB. */
export async function exportDioceseExecutivePdf(
  dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  opts?: HierarchyReportPdfOptions,
): Promise<void> {
  const activeOnly = Boolean(opts?.activeOnly);
  const dsRows = activeOnly ? dayosisi.filter((d) => isActiveHierarchyStatus(d.status)) : [...dayosisi];
  const jbForCounts = activeOnly ? majimbo.filter((j) => isActiveHierarchyStatus(j.status)) : majimbo;
  const counts = jimboCountByDayosisi(jbForCounts);
  const jimboCol = activeOnly ? "Majimbo (active)" : "Majimbo (DB)";
  const headers = [
    "Msimbo",
    "Dayosisi",
    "Askofu",
    "Makamu mwenyekiti",
    "Katibu",
    "Naibu katibu",
    "Mhasibu",
    "Mkoa",
    "Ofisi",
    "Simu",
    "Barua pepe",
    jimboCol,
  ];
  const rows = dsRows
    .sort((a, b) => String(a.code).localeCompare(String(b.code), "sw"))
    .map((d) => [
      d.code,
      d.jina,
      d.askofu,
      d.makamu_mwenyekiti ?? "",
      d.katibu ?? "",
      d.naibu_katibu ?? "",
      d.mhasibu ?? "",
      d.mkoa,
      d.makao ?? "",
      d.simu,
      d.email,
      counts.get(d.id) ?? 0,
    ]);

  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = activeOnly ? "_active" : "";
  const title = activeOnly
    ? "MUHTASARI WA UONGOZI WA DAYOSISI — EXECUTIVE (ACTIVE)"
    : "MUHTASARI WA UONGOZI WA DAYOSISI — EXECUTIVE";

  await exportTableToPdf(
    title,
    `ripoti_dayosisi_executive${suffix}_${stamp}`,
    headers,
    rows,
    {
      orientation: "landscape",
      showSignatureLine: true,
      description: activeOnly
        ? "Ripoti inachuja dayosisi zenye hali active na idadi ya majimbo yenye hali active (church_jimbo) kwa kila dayosisi."
        : "Ripoti inatumia data ya jedwali la dayosisi na idadi ya majimbo yaliyosajiliwa (church_jimbo) kwa kila dayosisi.",
    },
  );
}

/** PDF: orodha ya majimbo yote (na jina la dayosisi). */
export async function exportJimboSummaryPdf(
  dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  opts?: HierarchyReportPdfOptions,
): Promise<void> {
  const activeOnly = Boolean(opts?.activeOnly);
  const names = dayosisiNameById(dayosisi);
  const jbRows = activeOnly ? majimbo.filter((j) => isActiveHierarchyStatus(j.status)) : [...majimbo];
  const headers = ["Dayosisi", "Jimbo", "Mkuu wa jimbo", "Mkoa", "Simu", "Hali"];
  const rows = jbRows
    .sort((a, b) => {
      const da = names.get((a.dayosisi_id ?? "").trim()) || String(a.dayosisi ?? "");
      const db = names.get((b.dayosisi_id ?? "").trim()) || String(b.dayosisi ?? "");
      const c = da.localeCompare(db, "sw");
      return c !== 0 ? c : String(a.jina).localeCompare(String(b.jina), "sw");
    })
    .map((j) => [
      names.get((j.dayosisi_id ?? "").trim()) || j.dayosisi || "—",
      j.jina,
      j.mkuu,
      j.mkoa,
      j.simu,
      j.status,
    ]);

  const stamp = new Date().toISOString().slice(0, 10);
  const title = activeOnly ? "ORODHA YA MAJIMBO — ACTIVE PEKEE" : "ORODHA KAMILI YA MAJIMBO — RIPOTI YA JIMBO";

  await exportTableToPdf(
    title,
    `ripoti_majimbo_${activeOnly ? "active" : "kamili"}_${stamp}`,
    headers,
    rows,
    {
      orientation: "landscape",
      showSignatureLine: true,
      description: activeOnly
        ? "Ripoti inachuja majimbo yenye hali active tu (church_jimbo)."
        : "Ripoti inatumia majimbo yaliyo kwenye church_jimbo (pamoja na hali).",
    },
  );
}

/** PDF: orodha ya matawi/vituo (church_tawi) pamoja na dayosisi na jimbo. */
export async function exportTawiSummaryPdf(
  _dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  matawi: TawiRecord[],
  opts?: HierarchyReportPdfOptions,
): Promise<void> {
  const activeOnly = Boolean(opts?.activeOnly);
  const jbNames = jimboNameById(majimbo);

  function jimboLabel(t: TawiRecord): string {
    const byName = String(t.jimbo ?? "").trim();
    if (byName) return byName;
    const jid = (t.jimbo_id ?? "").trim();
    return jid ? jbNames.get(jid) ?? "—" : "—";
  }

  const twRows = activeOnly ? matawi.filter((t) => isActiveHierarchyStatus(t.status)) : [...matawi];
  const headers = [
    "Dayosisi",
    "Jimbo",
    "Branch code",
    "Tawi / kituo",
    "Aina",
    "Mkoa",
    "Wilaya",
    "Uhakiki",
    "Kiongozi",
    "Simu",
    "Hali",
  ];
  const rows = twRows
    .sort((a, b) => {
      const da = String(a.dayosisi ?? "").trim();
      const db = String(b.dayosisi ?? "").trim();
      const c0 = da.localeCompare(db, "sw");
      if (c0 !== 0) return c0;
      const ja = jimboLabel(a);
      const jb = jimboLabel(b);
      const c1 = ja.localeCompare(jb, "sw");
      return c1 !== 0 ? c1 : String(a.jina).localeCompare(String(b.jina), "sw");
    })
    .map((t) => [
      String(t.dayosisi ?? "").trim() || "—",
      jimboLabel(t),
      String(t.branch_code ?? "").trim() || "—",
      t.jina,
      t.aina,
      String(t.mkoa ?? "").trim() || "—",
      String(t.wilaya ?? "").trim() || "—",
      String(t.verification_status ?? "unverified"),
      t.kiongozi,
      t.simu,
      t.status,
    ]);

  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = activeOnly ? "_active" : "";
  const title = activeOnly
    ? "ORODHA YA MATAWI NA VITUO — ACTIVE PEKEE"
    : "ORODHA KAMILI YA MATAWI NA VITUO — RIPOTI YA TAWI";

  await exportTableToPdf(
    title,
    `ripoti_matawi_vituo${suffix}_${stamp}`,
    headers,
    rows,
    {
      orientation: "landscape",
      showSignatureLine: true,
      description: activeOnly
        ? "Ripoti inachuja matawi/vituo yenye hali active tu (church_tawi); jina la jimbo linaweza kutokana na kiunga au jina lililohifadhiwa."
        : "Ripoti inatumia matawi/vituo yaliyo kwenye church_tawi (pamoja na hali); jina la jimbo linaweza kutokana na kiunga au jina lililohifadhiwa.",
    },
  );
}
