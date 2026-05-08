export type FinanceSourceType = "predefined" | "custom";

export interface FinanceSourcePreset {
  group: string;
  name: string;
  code: string;
  category: string;
  frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual" | "One-time";
  restrictedFund: "Yes" | "No";
  description: string;
  defaultStatus: "Active" | "Pending";
}

export const FINANCE_SOURCE_PRESETS: FinanceSourcePreset[] = [
  {
    group: "MICHANGO YA KIROHO",
    name: "Zaka",
    code: "ZAKA001",
    category: "Michango ya Kiroho",
    frequency: "Weekly",
    restrictedFund: "No",
    description: "Sadaka ya zaka ya waumini.",
    defaultStatus: "Active",
  },
  {
    group: "MICHANGO YA KIROHO",
    name: "Sadaka ya Ibada",
    code: "SADAKA001",
    category: "Michango ya Kiroho",
    frequency: "Weekly",
    restrictedFund: "No",
    description: "Sadaka ya ibada za jumapili na mikutano.",
    defaultStatus: "Active",
  },
  {
    group: "MAKUNDI / IDARA",
    name: "Mchango wa Idara ya Vijana",
    code: "IDARA-YOUTH001",
    category: "Makundi / Idara",
    frequency: "Monthly",
    restrictedFund: "No",
    description: "Mchango wa shughuli za vijana.",
    defaultStatus: "Active",
  },
  {
    group: "MAKUNDI / IDARA",
    name: "Mchango wa Idara ya Wanawake",
    code: "IDARA-WOMEN001",
    category: "Makundi / Idara",
    frequency: "Monthly",
    restrictedFund: "No",
    description: "Mchango wa huduma za wanawake.",
    defaultStatus: "Active",
  },
  {
    group: "MAENDELEO",
    name: "Ujenzi wa Kanisa",
    code: "DEV-CHBUILD001",
    category: "Maendeleo",
    frequency: "Monthly",
    restrictedFund: "Yes",
    description: "Mchango wa mradi wa ujenzi wa kanisa.",
    defaultStatus: "Pending",
  },
  {
    group: "HUDUMA NA JAMII",
    name: "Mchango wa Huduma za Jamii",
    code: "SOCIAL001",
    category: "Huduma na Jamii",
    frequency: "Monthly",
    restrictedFund: "Yes",
    description: "Mfuko wa misaada na huduma za jamii.",
    defaultStatus: "Pending",
  },
  {
    group: "HARAMBEE / SPECIAL",
    name: "Harambee Maalum",
    code: "SPECIAL001",
    category: "Harambee / Special",
    frequency: "One-time",
    restrictedFund: "Yes",
    description: "Mchango wa tukio maalum wa kanisa.",
    defaultStatus: "Pending",
  },
];
