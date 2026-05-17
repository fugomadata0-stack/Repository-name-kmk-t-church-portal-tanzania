/**
 * KMK(T) Ultra Premium Leadership Certificate Design System
 * University / Seminary / Bishop-level institutional standards.
 */

/** Brand palette — DO NOT drift from spec without design review. */
export const KMK_PREMIUM = {
  navy: [11, 31, 58] as const, // #0B1F3A
  royal: [18, 60, 105] as const, // #123C69
  gold: [212, 175, 55] as const, // #D4AF37
  goldLight: [244, 228, 188] as const,
  goldPale: [252, 248, 238] as const,
  white: [255, 255, 255] as const,
  paper: [255, 252, 248] as const,
  ink: [30, 41, 59] as const,
  inkMuted: [100, 116, 139] as const,
} as const;

export const KMK_PREMIUM_HEX = {
  navy: "#0B1F3A",
  royal: "#123C69",
  gold: "#D4AF37",
  white: "#FFFFFF",
} as const;

/** A4 print-perfect zones (mm) — fixed to prevent layout shift. */
export const PREMIUM_A4 = {
  width: 210,
  height: 297,
  margin: 12,
  frameInset: 7,
  headerMaxH: 78,
  footerReserve: 52,
  centerTop: 82,
  sideRailW: 2.8,
  logoSize: 26,
  qrSize: 24,
  portraitW: 40,
  portraitH: 48,
  nameMaxPt: 22,
  titleMaxPt: 11,
  bodyMaxPt: 10,
} as const;

export type PremiumTypography = {
  orgSize: number;
  certTitleSwSize: number;
  certTitleEnSize: number;
  nameSize: number;
  cheoSize: number;
  levelSize: number;
  bodySize: number;
  footerSize: number;
};

export function resolvePremiumTypography(kind: string): PremiumTypography {
  const bishop = kind === "executive_bishop_certificate";
  return {
    orgSize: bishop ? 7.4 : 7,
    certTitleSwSize: bishop ? 17 : 15,
    certTitleEnSize: bishop ? 11 : 10,
    nameSize: bishop ? 24 : 20,
    cheoSize: bishop ? 12 : 11,
    levelSize: bishop ? 9.5 : 9,
    bodySize: bishop ? 10.5 : 10,
    footerSize: 7,
  };
}

/** CSS tokens for React HTML preview (mirrors PDF). */
export const PREMIUM_PREVIEW_CSS = {
  headerGradient: `linear-gradient(165deg, ${KMK_PREMIUM_HEX.navy} 0%, ${KMK_PREMIUM_HEX.royal} 52%, #1a4a8a 100%)`,
  goldBorder: `3px double ${KMK_PREMIUM_HEX.gold}`,
  paperBg: KMK_PREMIUM_HEX.white,
  nameColor: KMK_PREMIUM_HEX.navy,
  accentColor: KMK_PREMIUM_HEX.gold,
} as const;
