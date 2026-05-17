/** Menyu ya juu — viungo vya haraka vya kiwango cha juu (RBAC kwenye AppLayout). */
export type ExecutiveMenuItem = {
  id: string;
  label: string;
  icon: string;
  moduleKey: string;
  submodule?: string;
  children?: { label: string; submodule: string }[];
};

export const EXECUTIVE_TOP_MENU: ExecutiveMenuItem[] = [
  { id: "dashboard", label: "Dashibodi", icon: "📊", moduleKey: "dashboard" },
  {
    id: "matawi",
    label: "Matawi",
    icon: "🌿",
    moduleKey: "muundo",
    submodule: "Matawi / Vituo",
    children: [
      { label: "Injini ya Ngazi", submodule: "Injini ya Ngazi — Executive" },
      { label: "Orodha ya Matawi", submodule: "Orodha ya Matawi / Vituo" },
      { label: "Dashboard ya Tawi", submodule: "Dashboard ya Tawi" },
    ],
  },
  {
    id: "majimbo",
    label: "Majimbo",
    icon: "⛪",
    moduleKey: "muundo",
    submodule: "Majimbo",
    children: [
      { label: "Injini Majimbo", submodule: "Majimbo" },
      { label: "Orodha ya Majimbo", submodule: "Orodha ya Majimbo" },
    ],
  },
  {
    id: "dayosisi",
    label: "Dayosisi",
    icon: "🏛️",
    moduleKey: "muundo",
    submodule: "Dayosisi",
    children: [
      { label: "Injini Dayosisi", submodule: "Dayosisi" },
      { label: "Orodha ya Dayosisi", submodule: "Orodha ya Dayosisi" },
    ],
  },
  { id: "kmkt", label: "KMK(T)", icon: "🇹🇿", moduleKey: "muundo", submodule: "KMK(T)" },
  {
    id: "fedha",
    label: "Fedha",
    icon: "💰",
    moduleKey: "fedha",
    submodule: "Mapato / Income",
    children: [
      { label: "Sadaka", submodule: "Sadaka" },
      { label: "Zaka", submodule: "Zaka" },
      { label: "Michango", submodule: "Michango ya Kawaida" },
      { label: "Matumizi", submodule: "Matumizi / Expenses" },
      { label: "Ripoti za Fedha", submodule: "Financial Reports" },
    ],
  },
  {
    id: "michango",
    label: "Michango",
    icon: "🤲",
    moduleKey: "mapato_income",
    submodule: "Sadaka za Kawaida",
  },
  {
    id: "ripoti",
    label: "Ripoti",
    icon: "📑",
    moduleKey: "analytics",
    submodule: "Ripoti & Chuja",
  },
  {
    id: "barua",
    label: "Barua Pepe",
    icon: "✉️",
    moduleKey: "communications",
    submodule: "Compose",
  },
  { id: "notifications", label: "Arifa", icon: "🔔", moduleKey: "notifications", submodule: "Zote" },
  { id: "analytics", label: "Analytics", icon: "📈", moduleKey: "analytics", submodule: "Dashibodi" },
  { id: "leadership", label: "Viongozi", icon: "👔", moduleKey: "viongozi" },
  {
    id: "export",
    label: "Export",
    icon: "📤",
    moduleKey: "ripoti",
    submodule: "Export Center",
  },
  { id: "settings", label: "Mipangilio", icon: "⚙️", moduleKey: "mipangilio", submodule: "Master Settings Center" },
  { id: "audit", label: "Audit", icon: "🔐", moduleKey: "usalama", submodule: "Audit Logs" },
  { id: "system", label: "Mfumo Mkuu", icon: "🛠️", moduleKey: "super_admin", submodule: "System Health" },
];
