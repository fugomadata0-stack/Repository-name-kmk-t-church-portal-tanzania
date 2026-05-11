import type { DomainEntityRecord } from "../types";
import { exportTableToPdf } from "./exportHelpers";

export const KMKT_PORTAL_PUBLIC_URL = "https://v0-church-portal-tanzania.vercel.app";

export type RegistrationLevel =
  | "kmkt"
  | "dayosisi"
  | "jimbo"
  | "tawi"
  | "jumuiya"
  | "idara"
  | "huduma"
  | "taasisi"
  | "kiongozi"
  | "muumini"
  | "familia";

export const REGISTRATION_LEVEL_LABELS: Record<RegistrationLevel, string> = {
  kmkt: "KMK(T) Ngazi Kuu",
  dayosisi: "Dayosisi",
  jimbo: "Jimbo",
  tawi: "Tawi / Kituo",
  jumuiya: "Jumuiya",
  idara: "Idara",
  huduma: "Huduma",
  taasisi: "Taasisi",
  kiongozi: "Kiongozi",
  muumini: "Muumini",
  familia: "Familia",
};

const REQUIRED_REGISTRATION_KEYS = [
  "title",
  "reference_code",
  "category",
  "details",
  "event_date",
  "status",
  "parent_level",
  "mkoa",
  "wilaya",
  "kata_mtaa",
  "contact_person",
  "phone",
  "email",
  "website",
  "address",
  "gps_coordinates",
  "leader_name",
  "secretary_name",
  "treasurer_name",
  "category_tags",
];

export function registrationLevelFromSubmodule(submodule: string): RegistrationLevel {
  const s = submodule.toLowerCase();
  if (s.includes("ngazi")) return "kmkt";
  if (s.includes("dayosisi")) return "dayosisi";
  if (s.includes("majimbo") || s.includes("jimbo")) return "jimbo";
  if (s.includes("matawi") || s.includes("tawi") || s.includes("vituo")) return "tawi";
  if (s.includes("jumuiya")) return "jumuiya";
  if (s.includes("idara")) return "idara";
  if (s.includes("huduma")) return "huduma";
  if (s.includes("taasisi")) return "taasisi";
  return "kmkt";
}

function cleanPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part.slice(0, 4).toUpperCase())
    .join("-");
}

export function generateRegistrationCode(input: {
  level: RegistrationLevel;
  name: string;
  parentName?: string;
  date?: string;
}): string {
  const prefix: Record<RegistrationLevel, string> = {
    kmkt: "KMKT",
    dayosisi: "DYS",
    jimbo: "JMB",
    tawi: "TWI",
    jumuiya: "JMY",
    idara: "IDR",
    huduma: "HDM",
    taasisi: "TSS",
    kiongozi: "VNG",
    muumini: "WMM",
    familia: "FAM",
  };
  const year = String(input.date || new Date().toISOString()).slice(0, 4);
  const parent = cleanPart(input.parentName || "").slice(0, 10);
  const name = cleanPart(input.name || "MPYA").slice(0, 18);
  return [prefix[input.level], year, parent, name].filter(Boolean).join("-");
}

export function buildHierarchySummary(input: {
  level: RegistrationLevel;
  name: string;
  parentName?: string;
  mkoa?: string;
  wilaya?: string;
  kata?: string;
}): string {
  const parts = [
    "KMK(T)",
    input.parentName?.trim(),
    `${REGISTRATION_LEVEL_LABELS[input.level]}: ${input.name || "-"}`,
    input.mkoa ? `Mkoa: ${input.mkoa}` : "",
    input.wilaya ? `Wilaya: ${input.wilaya}` : "",
    input.kata ? `Kata/Mtaa: ${input.kata}` : "",
  ].filter(Boolean);
  return parts.join(" -> ");
}

export function calculateRegistrationCompleteness(fields: Record<string, unknown>): number {
  const filled = REQUIRED_REGISTRATION_KEYS.filter((key) => String(fields[key] ?? "").trim().length > 0).length;
  return Math.round((filled / REQUIRED_REGISTRATION_KEYS.length) * 100);
}

export function parseTags(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function parseAttachmentUrls(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export function buildRegistrationPdfTitle(level: RegistrationLevel): string {
  if (level === "dayosisi") return "TAARIFA RASMI YA DAYOSISI";
  if (level === "jimbo") return "RIPOTI YA JIMBO";
  if (level === "tawi") return "TAARIFA YA TAWI";
  if (level === "jumuiya") return "TAARIFA YA JUMUIYA";
  if (level === "idara") return "TAARIFA YA IDARA";
  if (level === "huduma") return "TAARIFA YA HUDUMA";
  if (level === "taasisi") return "RIPOTI YA TAASISI";
  if (level === "kiongozi") return "WASIFU WA KIONGOZI";
  if (level === "muumini") return "RIPOTI YA WAUMINI";
  if (level === "familia") return "TAARIFA YA FAMILIA";
  return "TAARIFA RASMI YA KMK(T) NGAZI KUU";
}

export async function exportEnterpriseRegistrationProfilePdf(
  record: DomainEntityRecord,
  context: { level: RegistrationLevel; submodule: string }
): Promise<void> {
  const extra = record.extra ?? {};
  const rows: (string | number)[][] = [
    ["Ngazi", REGISTRATION_LEVEL_LABELS[context.level]],
    ["Jina rasmi", String(extra.official_name || record.title || "-")],
    ["Short code", String(extra.short_code || record.reference_code || "-")],
    ["Logo/Photo", [extra.logo_url, extra.photo_url].filter(Boolean).join(" | ") || "-"],
    ["Signature", String(extra.signature_url || "-")],
    ["Parent hierarchy", String(extra.hierarchy_summary || extra.parent_level || "-")],
    ["Kiongozi mkuu", String(extra.leader_name || extra.contact_person || "-")],
    ["Assistant leaders", String(extra.assistant_leaders || "-")],
    ["Katibu", String(extra.secretary_name || "-")],
    ["Mweka Hazina", String(extra.treasurer_name || "-")],
    ["Mkoa/Wilaya", [extra.mkoa, extra.wilaya].filter(Boolean).join(" / ") || "-"],
    ["Kata/Kijiji/Mtaa", [extra.kata_mtaa, extra.kijiji_mtaa].filter(Boolean).join(" / ") || "-"],
    ["Mawasiliano", [extra.phone, extra.email, extra.website].filter(Boolean).join(" | ") || "-"],
    ["GPS/Anwani", [extra.gps_coordinates, extra.address].filter(Boolean).join(" | ") || "-"],
    ["Tarehe ya kuanzishwa", record.event_date || String(extra.established_date || "-")],
    ["Status", record.status || "-"],
    ["Profile completeness", `${String(extra.profile_completeness ?? "") || "-"}%`],
    ["Tags", Array.isArray(extra.category_tags) ? extra.category_tags.join(", ") : String(extra.category_tags || "-")],
    ["Attachments", Array.isArray(extra.attachment_urls) ? extra.attachment_urls.join("\n") : "-"],
    ["Maelezo", record.details || "-"],
    ["Notes", String(extra.notes || "-")],
  ];

  await exportTableToPdf(
    `${buildRegistrationPdfTitle(context.level)} - ${record.title}`,
    `KMKT_${context.level}_${record.reference_code || record.id}`,
    ["Kipengele", "Maelezo"],
    rows,
    {
      orientation: "portrait",
      subtitle: `${context.submodule} · QR: ${KMKT_PORTAL_PUBLIC_URL}`,
      description:
        "Wasifu huu ni rekodi rasmi ya usajili wa KMK(T), ikijumuisha muhtasari wa hierarchy, uongozi, mawasiliano, mahali, viambatisho na ubora wa ukamilifu wa taarifa.",
      showSignatureLine: true,
    }
  );
}
