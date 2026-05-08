export type AidUiSection = "maombi" | "wanufaika" | "vibali" | "utoaji" | "ripoti";

/** Tafsiri submodule ya menyu ya Misaada → mwonekano wa ndani (hailindi workflow). */
export function parseAidSubmodule(sub?: string): AidUiSection {
  const s = (sub ?? "").toLowerCase();
  if (s.includes("wanufaika")) return "wanufaika";
  if (s.includes("vibali") || s.includes("uhakiki")) return "vibali";
  if (s.includes("utoaji")) return "utoaji";
  if (s.includes("ripoti")) return "ripoti";
  return "maombi";
}
