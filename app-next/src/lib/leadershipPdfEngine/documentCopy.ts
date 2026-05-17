import type { AdvancedLeadershipPdfKind } from "./types";

export type DocumentCopy = {
  certTitleSw: string;
  certTitleEn: string;
  watermarkLine2: string;
  sealText: string;
  bodyTemplate: (ctx: { name: string; cheo: string; hierarchy: string }) => string;
};

const COPIES: Record<AdvancedLeadershipPdfKind, DocumentCopy> = {
  leadership_certificate: {
    certTitleSw: "CHETI RASMI YA UONGOZI",
    certTitleEn: "EXECUTIVE LEADERSHIP CERTIFICATE",
    watermarkLine2: "CHETI RASMI · THIBITISHO KWA QR",
    sealText: "CHETI RASMI",
    bodyTemplate: ({ name, cheo, hierarchy }) =>
      `Hati hii inathibitisha kuwa ${name} ameteuliwa rasmi katika nafasi ya ${cheo}, chini ya muundo wa ${hierarchy}, kwa mujibu wa katiba na taratibu za Kanisa la Mennonite la Kiinjili Tanzania (KMK(T)).`,
  },
  appointment_letter: {
    certTitleSw: "BARUA RASMI YA UTEUZI",
    certTitleEn: "OFFICIAL APPOINTMENT LETTER",
    watermarkLine2: "BARUA YA UTEUZI · KMK(T)",
    sealText: "UTEUZI RASMI",
    bodyTemplate: ({ name, cheo, hierarchy }) =>
      `Kwa mujibu wa mamlaka iliyokabidhiwa, ${name} anaapishwa kuwa ${cheo} katika ${hierarchy}. Barua hii ni halali kuanzia tarehe iliyo hapa chini na inategemea sheria za kanisa.`,
  },
  service_certificate: {
    certTitleSw: "CHETI CHA HUDUMA",
    certTitleEn: "CERTIFICATE OF SERVICE",
    watermarkLine2: "HUDUMA · KMK(T)",
    sealText: "HUDUMA RASMI",
    bodyTemplate: ({ name, cheo, hierarchy }) =>
      `Hati hii inashuhudia huduma ya ${name} kama ${cheo} katika ${hierarchy}, kwa uadilifu na uaminifu katika kazi za Kanisa la Mennonite la Kiinjili Tanzania (KMK(T)).`,
  },
  leadership_cv: {
    certTitleSw: "WASIFU RASMI WA KIONGOZI",
    certTitleEn: "EXECUTIVE LEADERSHIP CV",
    watermarkLine2: "WASIFU · DATA LIVE",
    sealText: "WASIFU RASMI",
    bodyTemplate: ({ name, cheo }) =>
      `Wasifu huu wa kitaalamu una muhtasari wa ${name}, ${cheo}, pamoja na taarifa za uongozi, elimu na huduma.`,
  },
  promotion_certificate: {
    certTitleSw: "CHETI CHA KUPANDISHWA CHEO",
    certTitleEn: "PROMOTION CERTIFICATE",
    watermarkLine2: "KUPANDISHWA · KMK(T)",
    sealText: "KUPANDISHWA",
    bodyTemplate: ({ name, cheo, hierarchy }) =>
      `Kwa kusherehekea uaminifu na ufanisi wa huduma, ${name} amepandishwa cheo hadi ${cheo} katika ${hierarchy}, kwa mujibu wa taratibu za KMK(T).`,
  },
  recognition_certificate: {
    certTitleSw: "CHETI CHA KUTAMBULIWA",
    certTitleEn: "CERTIFICATE OF RECOGNITION",
    watermarkLine2: "KUTAMBULIWA · KMK(T)",
    sealText: "KUTAMBULIWA",
    bodyTemplate: ({ name, cheo, hierarchy }) =>
      `Kanisa la Mennonite la Kiinjili Tanzania (KMK(T)) linatambua na kushukuru ${name} kwa mchango wake kama ${cheo} katika ${hierarchy}, katika huduma ya Mungu na jamii.`,
  },
  executive_bishop_certificate: {
    certTitleSw: "CHETI CHA ASKOFU MKUU",
    certTitleEn: "EXECUTIVE BISHOP CERTIFICATE",
    watermarkLine2: "ASKOFU MKUU · KMK(T)",
    sealText: "MUHURI WA ASKOFU",
    bodyTemplate: ({ name, cheo, hierarchy }) =>
      `Kwa mamlaka ya Kanisa la Mennonite la Kiinjili Tanzania (KMK(T)), hati hii ya kiwango cha Askofu inathibitisha uteuzi na uongozi wa ${name} kama ${cheo}, katika ${hierarchy}, kwa mujibu wa imani, katiba na desturi za kanisa.`,
  },
};

export function getDocumentCopy(kind: AdvancedLeadershipPdfKind): DocumentCopy {
  return COPIES[kind] ?? COPIES.leadership_certificate;
}
