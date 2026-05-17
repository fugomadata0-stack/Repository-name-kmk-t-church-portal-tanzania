import type { LeadershipCvEducationKind } from "../../types";
import type { LeadershipEducationCatalogRow } from "../../services/leadershipCredentialsEngineService";
import type { LeadershipCvEducationRow } from "../../types";

const KIND_BY_KEY: Record<string, LeadershipCvEducationKind> = {
  certificate: "certificate",
  diploma: "diploma",
  advanced_diploma: "diploma",
  degree: "degree",
  masters: "masters",
  phd: "masters",
  professor: "masters",
  theology: "theology",
  bible_college: "theology",
  seminary: "theology",
  professional: "seminar",
};

export function catalogKeyToCvEducationKind(optionKey: string): LeadershipCvEducationKind {
  return KIND_BY_KEY[optionKey] ?? "other";
}

export function educationRowsFromCatalogKeys(
  leaderId: string,
  catalog: LeadershipEducationCatalogRow[],
  selectedKeys: string[],
): LeadershipCvEducationRow[] {
  const academic = catalog.filter((c) => c.category === "academic");
  const rows: LeadershipCvEducationRow[] = [];
  selectedKeys.forEach((key, i) => {
    const row = academic.find((c) => c.option_key === key);
    if (!row) return;
    rows.push({
      id: `new-${key}`,
      leader_id: leaderId,
      education_kind: catalogKeyToCvEducationKind(key),
      institution: "",
      qualification: row.label_sw,
      year: null,
      specialization: row.label_en,
      sort_order: i,
    });
  });
  return rows;
}

export function selectedKeysFromEducationRows(
  rows: LeadershipCvEducationRow[],
  catalog: LeadershipEducationCatalogRow[],
): string[] {
  const academic = catalog.filter((c) => c.category === "academic");
  const keys = new Set<string>();
  for (const row of rows) {
    const q = row.qualification.trim().toLowerCase();
    const match = academic.find(
      (c) =>
        c.label_sw.toLowerCase() === q ||
        c.label_en.toLowerCase() === q ||
        c.option_key === row.education_kind,
    );
    if (match) keys.add(match.option_key);
  }
  return [...keys];
}
