/**
 * Orodha rasmi ya dayosisi 6 za KMK(T), uongozi na majimbo — chanzo kimoja cha ukweli wa kensa.
 * Inalingana na migration `20260626240000_kmkt_six_dioceses_canonical_jimbo.sql`.
 * Simu/barua za ofisi kuu Musoma — zinalingana na kmktCanonicalContent (epuka mzunguko wa import).
 */
const KMKT_MARA_DAYOSISI_SIMU = "0755927252";
const KMKT_MARA_DAYOSISI_EMAIL = "mennonitekiinjilikmkt@gmail.com";

export type KmktJimboRolloutStatus = "complete" | "in_progress";

export interface KmktDayosisiLeadership {
  askofu: string;
  makamu_mwenyekiti: string;
  katibu: string;
  naibu_katibu: string;
  mhasibu: string;
}

export interface KmktDayosisiCanon {
  code: string;
  jina: string;
  mkoa: string;
  ofisi: string;
  simu: string;
  email: string;
  leadership: KmktDayosisiLeadership;
  /** Majina kamili kama yalivyo kwenye orodha rasmi */
  majimbo: readonly string[];
  majimbo_rollout: KmktJimboRolloutStatus;
  maelezo?: string;
}

export const KMKT_HEADQUARTERS_JIMBO_NAME = "Jimbo la Musoma Kusini" as const;
export const KMKT_HEADQUARTERS_TAWI_NAME = "Tawi la Makao Makuu — Musoma" as const;

export const KMKT_SIX_DAYOSISI: readonly KmktDayosisiCanon[] = [
  {
    code: "MARA",
    jina: "Dayosisi ya Mara",
    mkoa: "Mara",
    ofisi: "Musoma",
    simu: KMKT_MARA_DAYOSISI_SIMU,
    email: KMKT_MARA_DAYOSISI_EMAIL,
    leadership: {
      askofu: "Lameck Nicodemus Manji",
      makamu_mwenyekiti: "Boaz Maingu Nyeura",
      katibu: "Lameck Barnabas Musema",
      naibu_katibu: "Emmanuel Mutani Yebete",
      mhasibu: "Makunja Jastus Magoro",
    },
    majimbo: [
      "Jimbo la Saragana",
      "Jimbo la Wanyere",
      "Jimbo la Murangi",
      "Jimbo la Mgango",
      "Jimbo la Kwikerege",
      "Jimbo la Mtiro",
      "Jimbo la Kiabakari",
      "Jimbo la Musoma Kusini",
      "Jimbo la Musoma Kaskazini",
      "Jimbo la Busumi",
      "Jimbo la Nyakatende",
    ],
    majimbo_rollout: "complete",
  },
  {
    code: "MWZ",
    jina: "Dayosisi ya Mwanza",
    mkoa: "Mwanza",
    ofisi: "Mwanza",
    simu: "+255700111002",
    email: "mwanza@kmkt.or.tz",
    leadership: {
      askofu: "Paulo Petro Chemere",
      makamu_mwenyekiti: "Alex Semba Ekokoro",
      katibu: "Mathias Meja Masami",
      naibu_katibu: "Stanslaus Chacha Maguri",
      mhasibu: "Sadock Manyama",
    },
    majimbo: [
      "Jimbo la Nkuyu",
      "Jimbo la Mhunze",
      "Jimbo la Itilima",
      "Jimbo la Budalabujiga",
      "Jimbo la Bariadi",
      "Jimbo la Lamadi",
      "Jimbo la Nassa",
      "Jimbo la Busega",
      "Jimbo la Manara",
      "Jimbo la Igoma",
      "Jimbo la Nyagezi",
      "Jimbo la Igombe",
      "Jimbo la Nyasaka",
      "Jimbo la Geita",
      "Jimbo la Kayenze",
      "Jimbo la Kagu",
      "Jimbo la Senga",
      "Jimbo la Misungwi",
      "Jimbo la Katoro",
    ],
    majimbo_rollout: "complete",
  },
  {
    code: "BUNDA",
    jina: "Dayosisi ya Bunda",
    mkoa: "Mara",
    ofisi: "Bunda",
    simu: "",
    email: "",
    leadership: {
      askofu: "Simoni Masare Mtatiro",
      makamu_mwenyekiti: "Ladhameni Bulenga Maendeka",
      katibu: "Arstaliko Lazaro",
      naibu_katibu: "Jumapili Mauka",
      mhasibu: "MCH Sospiter Masamaki Changuru",
    },
    majimbo: [
      "Jimbo la Ukerewe",
      "Jimbo la Kisorya",
      "Jimbo la Kibara",
      "Jimbo la Butimba",
      "Jimbo la Kwiramba",
      "Jimbo la Bunda",
      "Jimbo la Kung'ombe",
      "Jimbo la Mugumu",
    ],
    majimbo_rollout: "complete",
  },
  {
    code: "DODOMA",
    jina: "Dayosisi ya Dodoma",
    mkoa: "Dodoma",
    ofisi: "Dodoma",
    simu: "",
    email: "",
    leadership: {
      askofu: "Godwill Paslotus Maregesi",
      makamu_mwenyekiti: "Hakuna kwa sasa",
      katibu: "Abiudi Michael Matara",
      naibu_katibu: "Bado hajatajwa",
      mhasibu: "Bado hajatajwa",
    },
    majimbo: [],
    majimbo_rollout: "in_progress",
    maelezo: "Majimbo bado yanaendelea kusajiliwa kwenye mfumo.",
  },
  {
    code: "DAR",
    jina: "Dayosisi ya Dar es Salaam",
    mkoa: "Dar es Salaam",
    ofisi: "Dar es Salaam",
    simu: "",
    email: "",
    leadership: {
      askofu: "Yeremia Mawawa Magomba",
      makamu_mwenyekiti: "Yuda Bwire Chikumbiro",
      katibu: "Maregesi Stephano Ndaro",
      naibu_katibu: "Mtipa Nashoni Mswaga",
      mhasibu: "Maarifa Benjamini Wafurungu",
    },
    majimbo: [],
    majimbo_rollout: "in_progress",
    maelezo: "Majimbo bado yanaendelea kusajiliwa kwenye mfumo.",
  },
  {
    code: "KIGOMA",
    jina: "Dayosisi ya Kigoma",
    mkoa: "Kigoma",
    ofisi: "Kigoma",
    simu: "",
    email: "",
    leadership: {
      askofu: "Samsoni Makuri Wairaro",
      makamu_mwenyekiti: "Jackson Makiriro",
      katibu: "Bado hajatajwa",
      naibu_katibu: "Bado hajatajwa",
      mhasibu: "Bado hajatajwa",
    },
    majimbo: [],
    majimbo_rollout: "in_progress",
    maelezo: "Majimbo bado yanaendelea kusajiliwa kwenye mfumo.",
  },
] as const;

/** Muhtasari wa idadi ya majimbo (kama orodha rasmi). */
export const KMKT_DAYOSISI_JIMBO_COUNTS: readonly { code: string; jumla_majimbo: number | null }[] =
  KMKT_SIX_DAYOSISI.map((d) => ({
    code: d.code,
    jumla_majimbo: d.majimbo_rollout === "complete" ? d.majimbo.length : null,
  }));
