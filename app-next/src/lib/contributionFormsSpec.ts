import type { PortalExcelFormBundle } from "./excelModuleFormSpecs";

const ID = { key: "id", label: "ID (acha tupu kwa mpya)" };

export const CONTRIBUTION_FORMS_COLUMNS: { key: string; label: string }[] = [
  ID,
  { key: "contributionTypeCode", label: "Msimbo Aina (MCH001)" },
  { key: "sourceName", label: "Jina la Chanzo" },
  { key: "incomeCode", label: "Income Code" },
  { key: "mainCategory", label: "Kundi Kuu" },
  { key: "collectionDate", label: "Tarehe ya Ukusanyaji" },
  { key: "amount", label: "Kiasi (TZS)" },
  { key: "receiptNo", label: "Nambari ya Risiti" },
  { key: "churchLevel", label: "Ngazi (tawi/jimbo/dayosisi/kmkt)" },
  { key: "dayosisi_id", label: "Dayosisi (UUID au jina)" },
  { key: "jimbo_id", label: "Jimbo (UUID au jina)" },
  { key: "tawi_id", label: "Tawi (UUID au jina)" },
  { key: "collectorReceiver", label: "Mkusanyaji / Mpokeaji" },
  { key: "remarks", label: "Maelezo" },
];

export const CONTRIBUTION_FORMS_INSTRUCTION_ROWS: (string | number)[][] = [
  ["Fomu rasmi za michango KMK(T) — Tawi → Jimbo → Dayosisi → KMK(T)."],
  ["Msimbo Aina: MCH001–MCH047 (angalia orodha kwenye portal)."],
  ["Income Code na Jina la Chanzo ni lazima. Risiti lazima iwe ya kipekee ikiwa imetajwa."],
  ["Kiasi: nambari tu (mf. 150000). Jumla ya safu zinapaswa kulingana na risiti."],
  ["Usibadilishe majina ya safu ya kwanza kwenye jalada «Data»."],
];

export function buildContributionFormsExcelBundle(): PortalExcelFormBundle {
  return {
    templateBasename: "KMKT_Contribution_Forms",
    specTitle: "Blanki la Fomu za Michango — KMK(T)",
    specSubtitle: "Pakia safu kwa safu; mfumo utathibitisha na kuzuia marudio.",
    columns: CONTRIBUTION_FORMS_COLUMNS,
    instructionRows: CONTRIBUTION_FORMS_INSTRUCTION_ROWS,
  };
}

export const CONTRIBUTION_EXCEL_MAX_BYTES = 5 * 1024 * 1024;
export const CONTRIBUTION_CSV_MAX_BYTES = 2 * 1024 * 1024;
