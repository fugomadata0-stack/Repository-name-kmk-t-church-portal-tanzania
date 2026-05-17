/**
 * Mfumo wa rangi wa cheti / CV — hubadilika kiotomatiki kulingana na cheo na ngazi.
 */
export type LeadershipCertificateTier =
  | "national_executive"
  | "national_officer"
  | "dayosisi"
  | "jimbo"
  | "tawi"
  | "department"
  | "fellowship"
  | "choir"
  | "youth"
  | "women"
  | "institution"
  | "default";

export type LeadershipCertificateTheme = {
  tier: LeadershipCertificateTier;
  label: string;
  navy: readonly [number, number, number];
  navyMid: readonly [number, number, number];
  gold: readonly [number, number, number];
  goldSoft: readonly [number, number, number];
  accent: readonly [number, number, number];
  accentSoft: readonly [number, number, number];
  flagGreen: readonly [number, number, number];
  flagGold: readonly [number, number, number];
  flagBlue: readonly [number, number, number];
  flagBlack: readonly [number, number, number];
  paper: readonly [number, number, number];
  ink: readonly [number, number, number];
  /** CSS gradient for React preview */
  headerGradient: string;
  accentGradient: string;
};

const THEMES: Record<LeadershipCertificateTier, LeadershipCertificateTheme> = {
  national_executive: {
    tier: "national_executive",
    label: "Uongozi wa Kitaifa — Utumishi",
    navy: [11, 31, 58],
    navyMid: [18, 60, 105],
    gold: [212, 175, 55],
    goldSoft: [244, 228, 188],
    accent: [255, 215, 0],
    accentSoft: [255, 248, 220],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [0, 122, 204],
    flagBlack: [15, 23, 42],
    paper: [255, 252, 245],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #071832 0%, #0B1F3A 45%, #1a3a6b 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #FFD700, #007ACC)",
  },
  national_officer: {
    tier: "national_officer",
    label: "Afisa wa Kitaifa",
    navy: [15, 40, 95],
    navyMid: [22, 65, 130],
    gold: [200, 168, 50],
    goldSoft: [235, 225, 195],
    accent: [37, 99, 235],
    accentSoft: [219, 234, 254],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [37, 99, 235],
    flagBlack: [15, 23, 42],
    paper: [253, 251, 247],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #0f2866 0%, #1e3a8a 55%, #123C69 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #FFD700, #2563eb)",
  },
  dayosisi: {
    tier: "dayosisi",
    label: "Ngazi ya Dayosisi",
    navy: [11, 28, 72],
    navyMid: [30, 58, 138],
    gold: [212, 175, 55],
    goldSoft: [219, 234, 254],
    accent: [29, 78, 216],
    accentSoft: [191, 219, 254],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [37, 99, 235],
    flagBlack: [15, 23, 42],
    paper: [248, 250, 255],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #0B1C48 0%, #1e3a8a 48%, #1d4ed8 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #D4AF37, #1d4ed8)",
  },
  jimbo: {
    tier: "jimbo",
    label: "Ngazi ya Jimbo",
    navy: [11, 31, 58],
    navyMid: [18, 60, 105],
    gold: [212, 175, 55],
    goldSoft: [219, 234, 254],
    accent: [37, 99, 235],
    accentSoft: [191, 219, 254],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [37, 99, 235],
    flagBlack: [15, 23, 42],
    paper: [248, 250, 255],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #0B1F3A 0%, #123C69 50%, #1e40af 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #D4AF37, #2563eb)",
  },
  tawi: {
    tier: "tawi",
    label: "Ngazi ya Tawi / Kituo",
    navy: [11, 31, 58],
    navyMid: [15, 52, 42],
    gold: [212, 175, 55],
    goldSoft: [220, 252, 231],
    accent: [30, 139, 58],
    accentSoft: [187, 247, 208],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [18, 60, 105],
    flagBlack: [15, 23, 42],
    paper: [250, 253, 251],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #0B1F3A 0%, #0f5132 52%, #14532d 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #D4AF37, #0B1F3A)",
  },
  department: {
    tier: "department",
    label: "Idara / Huduma",
    navy: [49, 46, 129],
    navyMid: [79, 70, 229],
    gold: [212, 175, 55],
    goldSoft: [237, 233, 254],
    accent: [124, 58, 237],
    accentSoft: [221, 214, 254],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [99, 102, 241],
    flagBlack: [30, 27, 75],
    paper: [250, 250, 255],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #312e81 0%, #4c1d95 55%, #6d28d9 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #FFD700, #7c3aed)",
  },
  fellowship: {
    tier: "fellowship",
    label: "Jumuiya",
    navy: [55, 48, 163],
    navyMid: [99, 102, 241],
    gold: [212, 175, 55],
    goldSoft: [238, 242, 255],
    accent: [99, 102, 241],
    accentSoft: [224, 231, 255],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [79, 70, 229],
    flagBlack: [30, 27, 75],
    paper: [248, 250, 255],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #3730a3 0%, #4f46e5 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #FFD700, #6366f1)",
  },
  choir: {
    tier: "choir",
    label: "Kwaya",
    navy: [76, 29, 149],
    navyMid: [109, 40, 217],
    gold: [212, 175, 55],
    goldSoft: [243, 232, 255],
    accent: [168, 85, 247],
    accentSoft: [233, 213, 255],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [139, 92, 246],
    flagBlack: [30, 27, 75],
    paper: [250, 245, 255],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #FFD700, #a855f7)",
  },
  youth: {
    tier: "youth",
    label: "Vijana",
    navy: [154, 52, 18],
    navyMid: [234, 88, 12],
    gold: [251, 191, 36],
    goldSoft: [255, 237, 213],
    accent: [249, 115, 22],
    accentSoft: [254, 215, 170],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [59, 130, 246],
    flagBlack: [30, 41, 59],
    paper: [255, 251, 235],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #9a3412 0%, #ea580c 55%, #f97316 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #FFD700, #f97316)",
  },
  women: {
    tier: "women",
    label: "Huduma ya Wanawake",
    navy: [88, 28, 135],
    navyMid: [134, 25, 143],
    gold: [212, 175, 55],
    goldSoft: [250, 232, 255],
    accent: [192, 38, 211],
    accentSoft: [245, 208, 254],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [168, 85, 247],
    flagBlack: [30, 27, 75],
    paper: [253, 244, 255],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #581c87 0%, #a21caf 55%, #c026d3 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #FFD700, #d946ef)",
  },
  institution: {
    tier: "institution",
    label: "Taasisi",
    navy: [30, 58, 95],
    navyMid: [51, 65, 85],
    gold: [212, 175, 55],
    goldSoft: [241, 245, 249],
    accent: [71, 85, 105],
    accentSoft: [226, 232, 240],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [100, 116, 139],
    flagBlack: [15, 23, 42],
    paper: [248, 250, 252],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #FFD700, #64748b)",
  },
  default: {
    tier: "default",
    label: "Uongozi wa KMK(T)",
    navy: [11, 31, 58],
    navyMid: [18, 60, 105],
    gold: [212, 175, 55],
    goldSoft: [244, 228, 188],
    accent: [5, 120, 85],
    accentSoft: [209, 250, 229],
    flagGreen: [30, 181, 58],
    flagGold: [255, 215, 0],
    flagBlue: [0, 122, 204],
    flagBlack: [15, 23, 42],
    paper: [253, 251, 247],
    ink: [30, 41, 59],
    headerGradient: "linear-gradient(135deg, #071832 0%, #0B1F3A 55%, #123C69 100%)",
    accentGradient: "linear-gradient(90deg, #1EB93A, #FFD700, #007ACC)",
  },
};

function norm(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export type CertificateHierarchyThemeLevel = "tawi" | "jimbo" | "dayosisi" | "national";

/** Tambua kategoria ya cheti kutoka role_key, cheo, na ngazi. */
export function resolveLeadershipCertificateTheme(input: {
  roleKey?: string | null;
  cheo?: string | null;
  leadershipLevel?: string | null;
  requestedRole?: string | null;
  hierarchyLevel?: CertificateHierarchyThemeLevel | null;
}): LeadershipCertificateTheme {
  const hl = input.hierarchyLevel;
  if (hl === "national") return THEMES.national_executive;
  if (hl === "dayosisi") return THEMES.dayosisi;
  if (hl === "jimbo") return THEMES.jimbo;
  if (hl === "tawi") return THEMES.tawi;

  const roleKey = norm(input.roleKey ?? "");
  const cheo = norm(input.cheo ?? "");
  const level = norm(input.leadershipLevel ?? "");
  const req = norm(input.requestedRole ?? "");
  const blob = `${roleKey} ${cheo} ${level} ${req}`;

  if (roleKey === "askofu_mkuu" || /askofu\s+mkuu|archbishop|presiding/.test(blob)) {
    return THEMES.national_executive;
  }
  if (
    roleKey === "katibu_mkuu" ||
    roleKey === "mhasibu" ||
    roleKey === "naibu_katibu" ||
    /katibu\s+mkuu|general\s+secretary|accountant|mhasibu/.test(blob)
  ) {
    return THEMES.national_officer;
  }
  if (/vijana|youth|kwaya\s+ya\s+vijana/.test(blob)) return THEMES.youth;
  if (/wanawake|women|mama/.test(blob)) return THEMES.women;
  if (/kwaya|choir/.test(blob)) return THEMES.choir;
  if (/jumuiya|fellowship/.test(blob)) return THEMES.fellowship;
  if (/idara|department|huduma/.test(blob) && !/dayosisi/.test(blob)) return THEMES.department;
  if (/taasisi|institution|shule/.test(blob)) return THEMES.institution;
  if (/dayosisi|diocese/.test(blob)) return THEMES.dayosisi;
  if (/jimbo|conference|regional/.test(blob)) return THEMES.jimbo;
  if (/tawi|branch|kituo|vituo/.test(blob)) return THEMES.tawi;
  if (/national|kitaifa|kmk/.test(blob)) return THEMES.national_officer;
  return THEMES.default;
}

export function themeToPdfCertPalette(theme: LeadershipCertificateTheme) {
  return {
    navy: theme.navy,
    navyMid: theme.navyMid,
    gold: theme.gold,
    goldSoft: theme.goldSoft,
    emerald: theme.accent,
    flagGreen: theme.flagGreen,
    goldVibrant: theme.flagGold,
    flagBlue: theme.flagBlue,
    flagBlack: theme.flagBlack,
    cream: theme.paper,
    paper: theme.paper,
    ink: theme.ink,
  };
}
