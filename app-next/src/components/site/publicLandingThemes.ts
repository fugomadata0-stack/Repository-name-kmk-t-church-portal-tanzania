/** Mandhari za rangi — kila block la ukurasa wa umma lina palette yake. */
export type LandingSurfaceTheme = {
  id: string;
  label: string;
  border: string;
  bg: string;
  glow: string;
  icon: string;
  badge: string;
  itemBorder: string;
  itemBg: string;
  heading: string;
};

export const MODULE_SURFACE_THEMES: readonly LandingSurfaceTheme[] = [
  { id: "amber", label: "Dhahabu", border: "border-amber-400/45", bg: "from-amber-500/20 via-amber-950/40 to-[#0a1628]", glow: "shadow-amber-500/25", icon: "from-amber-400 to-amber-700", badge: "bg-amber-500/20 text-amber-100", itemBorder: "border-amber-400/30", itemBg: "bg-amber-500/10", heading: "text-amber-100" },
  { id: "sky", label: "Samawi", border: "border-sky-400/45", bg: "from-sky-500/20 via-sky-950/40 to-[#0a1628]", glow: "shadow-sky-500/25", icon: "from-sky-400 to-indigo-700", badge: "bg-sky-500/20 text-sky-100", itemBorder: "border-sky-400/30", itemBg: "bg-sky-500/10", heading: "text-sky-100" },
  { id: "emerald", label: "Zamaradi", border: "border-emerald-400/45", bg: "from-emerald-500/20 via-emerald-950/40 to-[#0a1628]", glow: "shadow-emerald-500/25", icon: "from-emerald-400 to-teal-800", badge: "bg-emerald-500/20 text-emerald-100", itemBorder: "border-emerald-400/30", itemBg: "bg-emerald-500/10", heading: "text-emerald-100" },
  { id: "violet", label: "Zambarau", border: "border-violet-400/45", bg: "from-violet-500/20 via-violet-950/40 to-[#0a1628]", glow: "shadow-violet-500/25", icon: "from-violet-400 to-purple-800", badge: "bg-violet-500/20 text-violet-100", itemBorder: "border-violet-400/30", itemBg: "bg-violet-500/10", heading: "text-violet-100" },
  { id: "rose", label: "Waridi", border: "border-rose-400/45", bg: "from-rose-500/20 via-rose-950/40 to-[#0a1628]", glow: "shadow-rose-500/25", icon: "from-rose-400 to-pink-900", badge: "bg-rose-500/20 text-rose-100", itemBorder: "border-rose-400/30", itemBg: "bg-rose-500/10", heading: "text-rose-100" },
  { id: "cyan", label: "Samawi mwanga", border: "border-cyan-400/45", bg: "from-cyan-500/20 via-cyan-950/40 to-[#0a1628]", glow: "shadow-cyan-500/25", icon: "from-cyan-400 to-blue-900", badge: "bg-cyan-500/20 text-cyan-100", itemBorder: "border-cyan-400/30", itemBg: "bg-cyan-500/10", heading: "text-cyan-100" },
  { id: "orange", label: "Chungwa", border: "border-orange-400/45", bg: "from-orange-500/20 via-orange-950/40 to-[#0a1628]", glow: "shadow-orange-500/25", icon: "from-orange-400 to-amber-900", badge: "bg-orange-500/20 text-orange-100", itemBorder: "border-orange-400/30", itemBg: "bg-orange-500/10", heading: "text-orange-100" },
  { id: "fuchsia", label: "Fuchsia", border: "border-fuchsia-400/45", bg: "from-fuchsia-500/20 via-fuchsia-950/40 to-[#0a1628]", glow: "shadow-fuchsia-500/25", icon: "from-fuchsia-400 to-purple-900", badge: "bg-fuchsia-500/20 text-fuchsia-100", itemBorder: "border-fuchsia-400/30", itemBg: "bg-fuchsia-500/10", heading: "text-fuchsia-100" },
  { id: "lime", label: "Kijani", border: "border-lime-400/45", bg: "from-lime-500/20 via-lime-950/40 to-[#0a1628]", glow: "shadow-lime-500/25", icon: "from-lime-400 to-green-900", badge: "bg-lime-500/20 text-lime-100", itemBorder: "border-lime-400/30", itemBg: "bg-lime-500/10", heading: "text-lime-100" },
  { id: "red", label: "Nyekundu", border: "border-red-400/45", bg: "from-red-500/20 via-red-950/40 to-[#0a1628]", glow: "shadow-red-500/25", icon: "from-red-400 to-rose-950", badge: "bg-red-500/20 text-red-100", itemBorder: "border-red-400/30", itemBg: "bg-red-500/10", heading: "text-red-100" },
  { id: "teal", label: "Teal", border: "border-teal-400/45", bg: "from-teal-500/20 via-teal-950/40 to-[#0a1628]", glow: "shadow-teal-500/25", icon: "from-teal-400 to-cyan-950", badge: "bg-teal-500/20 text-teal-100", itemBorder: "border-teal-400/30", itemBg: "bg-teal-500/10", heading: "text-teal-100" },
  { id: "indigo", label: "Indigo", border: "border-indigo-400/45", bg: "from-indigo-500/20 via-indigo-950/40 to-[#0a1628]", glow: "shadow-indigo-500/25", icon: "from-indigo-400 to-slate-900", badge: "bg-indigo-500/20 text-indigo-100", itemBorder: "border-indigo-400/30", itemBg: "bg-indigo-500/10", heading: "text-indigo-100" },
  { id: "yellow", label: "Njano", border: "border-yellow-400/45", bg: "from-yellow-500/20 via-yellow-950/40 to-[#0a1628]", glow: "shadow-yellow-500/25", icon: "from-yellow-400 to-amber-950", badge: "bg-yellow-500/20 text-yellow-100", itemBorder: "border-yellow-400/30", itemBg: "bg-yellow-500/10", heading: "text-yellow-100" },
  { id: "stone", label: "Jiwe", border: "border-stone-400/45", bg: "from-stone-400/20 via-stone-950/40 to-[#0a1628]", glow: "shadow-stone-500/20", icon: "from-stone-300 to-stone-800", badge: "bg-stone-500/20 text-stone-100", itemBorder: "border-stone-400/30", itemBg: "bg-stone-500/10", heading: "text-stone-100" },
] as const;

export const CONTENT_PANEL_THEMES = {
  news: MODULE_SURFACE_THEMES[1],
  events: MODULE_SURFACE_THEMES[2],
  documents: MODULE_SURFACE_THEMES[0],
  media: MODULE_SURFACE_THEMES[4],
  security: MODULE_SURFACE_THEMES[11],
} as const satisfies Record<string, LandingSurfaceTheme>;
