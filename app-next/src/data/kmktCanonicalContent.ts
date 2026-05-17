/**
 * Chanzo kimoja cha taarifa rasmi za KMK(T) — inalingana na migrations za Supabase.
 */
import type {
  MasterIdentitySettings,
  MasterSettingsRow,
  MasterTemplateSettings,
  MasterThemeSettings,
} from "../services/masterSettingsService";
import {
  KMKT_DAYOSISI_JIMBO_COUNTS,
  KMKT_HEADQUARTERS_JIMBO_NAME,
  KMKT_HEADQUARTERS_TAWI_NAME,
  KMKT_SIX_DAYOSISI,
} from "./kmktSixDayosisiCanonical";
import {
  PORTAL_SUPPORT_EMAIL,
  PORTAL_SUPPORT_PHONE,
  PORTAL_SUPPORT_PHONE_DISPLAY,
} from "../config/contactConfig";

export type { KmktDayosisiCanon, KmktDayosisiLeadership, KmktJimboRolloutStatus } from "./kmktSixDayosisiCanonical";
export {
  KMKT_DAYOSISI_JIMBO_COUNTS,
  KMKT_HEADQUARTERS_JIMBO_NAME,
  KMKT_HEADQUARTERS_TAWI_NAME,
  KMKT_SIX_DAYOSISI,
};

export const DEFAULT_MASTER_WEBSITE_URL = "https://v0-church-portal-tanzania.vercel.app";

export const KMKT_OFFICIAL_NAME = "KANISA LA MENNONITE LA KIINJILI TANZANIA";
export const KMKT_SHORT_NAME = "KMK(T)";
export const KMKT_MOTTO = "Kuwa na umoja katika imani na huduma";
export const KMKT_POSTAL_ADDRESS = "S.L.P 317, MUSOMA — MARA, TANZANIA";
export const KMKT_HEADQUARTERS = "MUSOMA — MARA";
export const KMKT_REGION = "Mara";
export const KMKT_DISTRICT = "Musoma";

export const KMKT_OFFICE_EMAIL = PORTAL_SUPPORT_EMAIL;
export const KMKT_OFFICE_PHONE = PORTAL_SUPPORT_PHONE;
export const KMKT_OFFICE_PHONE_RAW = PORTAL_SUPPORT_PHONE;
export const KMKT_OFFICE_PHONE_DISPLAY = PORTAL_SUPPORT_PHONE_DISPLAY;
export const KMKT_WHATSAPP = PORTAL_SUPPORT_PHONE;

export const KMKT_VISION =
  "Kuwa kanisa linaloongoza kwa Injili, umoja, na huduma endelevu kwa jamii na taifa.";
export const KMKT_MISSION =
  "Kuhubiri Injili, kukuza imani, na kutoa huduma za kiroho na kijamii kupitia muundo wa KMK(T) Tanzania.";
export const KMKT_CORE_VALUES =
  "Imani · Umoja · Huduma · Uadilifu · Uwajibikaji · Upendo";

export const KMKT_ABOUT_HISTORY =
  "Kanisa la Mennonite la Kiinjili Tanzania (KMK(T)) ni taasisi ya Kikristo inayohudumia jamii kupitia ushuhuda wa Injili, uongozi wa kitaifa, na muundo wa dayosisi, jimbo, na makanisa.";
export const KMKT_ABOUT_OBJECTIVES =
  "Kuimarisha ushirika wa imani, kuendesha uongozi wenye uwajibikaji, na kuwezesha huduma za kiroho, elimu, na jamii.";
export const KMKT_LEADERSHIP_MESSAGE =
  "Tunakaribisha waumini, viongozi, na washirika katika huduma ya pamoja ya KMK(T) Tanzania.";
export const KMKT_BIBLE_VERSE = "Mathayo 28:19-20";

const maraCanon = KMKT_SIX_DAYOSISI.find((d) => d.code === "MARA");

/** @deprecated Tumia `KMKT_SIX_DAYOSISI` — orodha kamili ya dayosisi 6. */
export const KMKT_DAYOSISI_CANONICAL = KMKT_SIX_DAYOSISI.map((d) => ({
  code: d.code,
  jina: d.jina,
  askofu: d.leadership.askofu,
  mkoa: d.mkoa,
  ofisi: d.ofisi,
  simu: d.simu,
  email: d.email,
})) as readonly {
  code: string;
  jina: string;
  askofu: string;
  mkoa: string;
  ofisi: string;
  simu: string;
  email: string;
}[];

/** @deprecated Tumia `KMKT_HEADQUARTERS_JIMBO_NAME` + `KMKT_SIX_DAYOSISI`. */
export const KMKT_JIMBO_MUSOMA = {
  jina: KMKT_HEADQUARTERS_JIMBO_NAME,
  mkuu: maraCanon?.leadership.askofu ?? "",
  mkoa: maraCanon?.mkoa ?? "Mara",
  simu: maraCanon?.simu ?? KMKT_OFFICE_PHONE_RAW,
} as const;

/** @deprecated Tumia `KMKT_HEADQUARTERS_TAWI_NAME`. */
export const KMKT_TAWI_MAKAO_MUSOMA = {
  jina: KMKT_HEADQUARTERS_TAWI_NAME,
  kiongozi: "MCH JOHN MUTTANI SEAN",
  simu: "+255783858902",
} as const;

export const KMKT_NATIONAL_LEADERS = [
  {
    role_key: "askofu_mkuu",
    display_title_sw: "ASKOFU MKUU WA KMK(T)",
    display_title_en: "Presiding Bishop",
    full_name: "LAMECK NICODEMUS MANJI",
    phone: "0755927252",
    whatsapp: "0755927252",
    email: "manjikmkt@gmail.com",
    sort_order: 1,
  },
  {
    role_key: "katibu_mkuu",
    display_title_sw: "KATIBU MKUU WA KMK(T)",
    display_title_en: "General Secretary",
    full_name: "MCH JOHN MUTTANI SEAN",
    phone: "+255783858902",
    whatsapp: "+255783858902",
    email: "seankmkt@gmail.com",
    sort_order: 2,
  },
  {
    role_key: "naibu_katibu_mkuu",
    display_title_sw: "NAIBU KATIBU MKUU WA KMK(T)",
    display_title_en: "Deputy General Secretary",
    full_name: "Zakaria Rukonge Bunini",
    phone: "0743979707",
    whatsapp: "0743979707",
    email: "buninikmkt@gmail.com",
    sort_order: 3,
  },
  {
    role_key: "mhasibu_mkuu",
    display_title_sw: "MHASIBU MKUU WA KMK(T)",
    display_title_en: "Chief Accountant / Treasurer",
    full_name: "MCH SOSPITER MASAMAKI CHANGURU",
    phone: "0784775746",
    whatsapp: "0784775746",
    email: "changurukmkt@gmail.com",
    sort_order: 4,
  },
] as const;

const BIO = "Kiongozi rasmi wa kitaifa wa KMK(T).";
const QUOTE = "Huduma na uongozi wa KMK(T) Tanzania.";

export function buildKmktPdfHeaderText(): string {
  return [
    KMKT_OFFICIAL_NAME,
    KMKT_SHORT_NAME,
    KMKT_POSTAL_ADDRESS,
    `SIMU: ${KMKT_OFFICE_PHONE_DISPLAY}`,
    `EMAIL: ${KMKT_OFFICE_EMAIL}`,
    `TOVUTI: ${DEFAULT_MASTER_WEBSITE_URL}`,
  ].join("\n");
}

/** Mipangilio kamili inayolingana na migration `kmkt_canonical_portal_content_bootstrap`. */
export function canonicalMasterSettings(): MasterSettingsRow {
  const identity: MasterIdentitySettings = {
      official_name: KMKT_OFFICIAL_NAME,
      short_name: KMKT_SHORT_NAME,
      motto: KMKT_MOTTO,
      address: KMKT_POSTAL_ADDRESS,
      phone: KMKT_OFFICE_PHONE_DISPLAY,
      email: KMKT_OFFICE_EMAIL,
      website: DEFAULT_MASTER_WEBSITE_URL,
      country: "Tanzania",
      timezone: "Africa/Dar_es_Salaam",
      registration_info: "",
      official_seal_text: KMKT_SHORT_NAME,
      language_primary: "sw",
      language_secondary: "en",
      language_ratio_sw: 70,
      language_ratio_en: 30,
      show_kpi_cards: true,
      default_date_range_days: 30,
      default_hierarchy_filter: "ALL",
      dashboard_refresh_interval_sec: 60,
      system_footer: `${KMKT_SHORT_NAME} Tanzania · ${KMKT_OFFICE_EMAIL}`,
  };
  const theme: MasterThemeSettings = {
      logo_url: "",
      favicon_url: "",
      letterhead_url: "",
      signature_image_url: "",
      seal_image_url: "",
      primary_color: "#0B1F3A",
      secondary_color: "#123C69",
      accent_color: "#D4AF37",
      background_color: "#FFFFFF",
      text_color: "#0F172A",
      pdf_header_text: buildKmktPdfHeaderText(),
      excel_header_text: `${KMKT_OFFICIAL_NAME} (${KMKT_SHORT_NAME})`,
      print_header_text: `${KMKT_OFFICIAL_NAME} — ${KMKT_POSTAL_ADDRESS}`,
  };
  const templates: MasterTemplateSettings = {
      email_welcome: "Karibu {name}, akaunti yako ya KMK(T) iko tayari.",
      email_password_reset: "Bonyeza kiungo hiki kubadili nenosiri lako: {reset_link}",
      email_signup_approval: "Ombi lako la usajili limekubaliwa. Karibu KMK(T).",
      email_finance_receipt: "Tumepokea malipo yako. Kumbukumbu: {receipt_no}",
      email_document_approval: "Nyaraka yako imekaguliwa na kukubaliwa.",
      sms_alert: "Tahadhari KMK(T): {message}",
      notification_message: "Una taarifa mpya kwenye portal ya KMK(T).",
  };
  return { identity, theme, templates };
}

export function canonicalAboutKmktFields() {
  return {
    church_name: KMKT_OFFICIAL_NAME,
    abbreviation: KMKT_SHORT_NAME,
    motto: KMKT_MOTTO,
    mission: KMKT_MISSION,
    vision: KMKT_VISION,
    core_values: KMKT_CORE_VALUES,
    history: KMKT_ABOUT_HISTORY,
    objectives: KMKT_ABOUT_OBJECTIVES,
    headquarters: KMKT_HEADQUARTERS,
    contacts: `Simu: ${KMKT_OFFICE_PHONE_DISPLAY}\nBarua pepe: ${KMKT_OFFICE_EMAIL}\nWhatsApp: ${KMKT_OFFICE_PHONE}`,
    leadership_message: KMKT_LEADERSHIP_MESSAGE,
    bible_verse: KMKT_BIBLE_VERSE,
    status: "active" as const,
    published: true,
  };
}

export const KMKT_NATIONAL_LEADERSHIP_SEED = KMKT_NATIONAL_LEADERS.map((l) => ({
  ...l,
  biography: BIO,
  leadership_quote: QUOTE,
  status: "active",
  is_visible: true,
}));
