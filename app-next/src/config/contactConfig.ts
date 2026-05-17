/**
 * Mawasiliano rasmi ya msaada — chanzo kimoja kwa portal yote.
 * Tumia exports hizi pekee; usiandike barua pepe/simu moja kwa moja kwenye UI.
 */

export const PORTAL_SUPPORT_EMAIL = "fugomadata0@gmail.com";

/** Nambari ya simu / WhatsApp (format ya ndani Tanzania). */
export const PORTAL_SUPPORT_PHONE = "0624683622";

/** Nambari ya kimataifa kwa wa.me (bila +). */
export const PORTAL_WHATSAPP_E164 = "255624683622";

export const PORTAL_WHATSAPP_URL = `https://wa.me/${PORTAL_WHATSAPP_E164}`;

export const PORTAL_SUPPORT_PHONE_DISPLAY = "0624 683 622";

export const PORTAL_ORGANIZATION_NAME = "KMK(T) — Kanisa la Mennonite la Kiinjili Tanzania";

export const organizationContact = {
  name: PORTAL_ORGANIZATION_NAME,
  email: PORTAL_SUPPORT_EMAIL,
  phone: PORTAL_SUPPORT_PHONE,
  phoneDisplay: PORTAL_SUPPORT_PHONE_DISPLAY,
  whatsapp: PORTAL_SUPPORT_PHONE,
  whatsappUrl: PORTAL_WHATSAPP_URL,
} as const;

/** Kwa ulinganifu na msimbo wa zamani (canonical content). */
export const supportEmail = PORTAL_SUPPORT_EMAIL;
export const supportPhone = PORTAL_SUPPORT_PHONE;
export const whatsappNumber = PORTAL_WHATSAPP_E164;
