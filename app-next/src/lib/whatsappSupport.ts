import { PORTAL_ORGANIZATION_NAME, PORTAL_WHATSAPP_URL } from "../config/contactConfig";

export type WhatsAppSupportContext =
  | "general_help"
  | "login_help"
  | "login_failed"
  | "account_recovery"
  | "approval_support"
  | "password_reset_failed";

const MESSAGES: Record<WhatsAppSupportContext, string> = {
  general_help: `Habari KMK(T) Support, naomba msaada kuhusu akaunti yangu kwenye mfumo wa ${PORTAL_ORGANIZATION_NAME}.`,
  login_help: "Habari KMK(T) Support, naomba msaada kuingia kwenye portal.",
  login_failed:
    "Habari KMK(T) Support, nimejaribu kuingia mara kadhaa bila mafanikio. Naomba msaada wa kurejesha ufikiaji wa akaunti yangu.",
  account_recovery:
    "Habari KMK(T) Support, naomba msaada wa kurejesha akaunti yangu (nenosiri / ufikiaji) kwenye KMK(T) Portal.",
  approval_support:
    "Habari KMK(T) Support, akaunti yangu inasubiri uidhinishaji. Naomba msaada wa kuendelea na usajili.",
  password_reset_failed:
    "Habari KMK(T) Support, ujumbe wa kuweka upya nenosiri haujafika. Naomba msaada wa kurejesha nenosiri langu.",
};

export function buildWhatsAppSupportUrl(
  context: WhatsAppSupportContext = "general_help",
  extra?: string,
): string {
  const base = MESSAGES[context];
  const text = extra?.trim() ? `${base}\n\n${extra.trim()}` : base;
  return `${PORTAL_WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}

/** Fungua WhatsApp; rejea `false` ikiwa popup imezuiwa. */
export function openWhatsAppSupport(
  context: WhatsAppSupportContext = "general_help",
  extra?: string,
): boolean {
  const url = buildWhatsAppSupportUrl(context, extra);
  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) return true;
  } catch {
    /* fallback */
  }
  window.location.href = url;
  return true;
}

/** Simu ya moja kwa moja (fallback). */
export function buildTelSupportUrl(): string {
  return "tel:+255624683622";
}
