/** Aina rasmi za michango / mapato — KMK(T), ngazi Tawi → Jimbo → Dayosisi → Kitaifa */

export type IncomeDistributionMode = "hierarchy_share" | "full_remittance";

export interface KmktIncomeContributionType {
  sort: number;
  code: string;
  name: string;
  category: string;
  /** hierarchy_share = 35% (au % iliyowekwa) inapanda juu; full_remittance = 100% kama ilivyokusanywa */
  defaultDistribution: IncomeDistributionMode;
  defaultUpwardPercent?: number;
}

/** Asilimia chaguo-msingi ya ngazi (tawi → jimbo → dayosisi → kmkt) kwa aina za hierarchy_share */
export const KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT = 35;

export const KMKT_INCOME_CONTRIBUTION_TYPES: readonly KmktIncomeContributionType[] = [
  { sort: 1, code: "MCH001", name: "Meza ya Bwana", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 2, code: "MCH002", name: "Sadaka", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 3, code: "MCH003", name: "Sadaka Maalum", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 4, code: "MCH004", name: "Zaka", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 5, code: "MCH005", name: "Shukrani / Rizuku", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 6, code: "MCH006", name: "Chango / Harambee", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 7, code: "MCH007", name: "Ukarimu", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 8, code: "MCH008", name: "Matoleo kwa Mama", category: "Makundi / Idara", defaultDistribution: "hierarchy_share" },
  { sort: 9, code: "MCH009", name: "Matoleo Vijana", category: "Makundi / Idara", defaultDistribution: "hierarchy_share" },
  { sort: 10, code: "MCH010", name: "Pasaka / Krismasi", category: "Matukio", defaultDistribution: "hierarchy_share" },
  { sort: 11, code: "MCH011", name: "Mwaka Mpya", category: "Matukio", defaultDistribution: "hierarchy_share" },
  { sort: 12, code: "MCH012", name: "Matoleo ya Kwaya", category: "Makundi / Idara", defaultDistribution: "hierarchy_share" },
  { sort: 13, code: "MCH013", name: "Sadaka ya Mavuno", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 14, code: "MCH014", name: "Sadaka ya Uinjilisti", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 15, code: "MCH015", name: "Sadaka ya Utuume", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 16, code: "MCH016", name: "Sadaka ya Maombi", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 17, code: "MCH017", name: "Sadaka ya Ujenzi", category: "Maendeleo", defaultDistribution: "hierarchy_share" },
  { sort: 18, code: "MCH018", name: "Sadaka ya Watoto", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 19, code: "MCH019", name: "Matoleo ya KE", category: "Makundi / Idara", defaultDistribution: "hierarchy_share" },
  { sort: 20, code: "MCH020", name: "Matoleo ya ME", category: "Makundi / Idara", defaultDistribution: "hierarchy_share" },
  { sort: 21, code: "MCH021", name: "Matoleo ya JV", category: "Makundi / Idara", defaultDistribution: "hierarchy_share" },
  { sort: 22, code: "MCH022", name: "Michango ya Miradi", category: "Maendeleo", defaultDistribution: "full_remittance" },
  { sort: 23, code: "MCH023", name: "Michango ya Elimu", category: "Maendeleo", defaultDistribution: "full_remittance" },
  { sort: 24, code: "MCH024", name: "Michango ya Hospitali", category: "Huduma na Jamii", defaultDistribution: "full_remittance" },
  { sort: 25, code: "MCH025", name: "Michango ya Chuo cha Biblia", category: "Maendeleo", defaultDistribution: "full_remittance" },
  { sort: 26, code: "MCH026", name: "Michango ya Wahisani", category: "Huduma na Jamii", defaultDistribution: "full_remittance" },
  { sort: 27, code: "MCH027", name: "Mapato ya Taasisi za Kanisa", category: "Taasisi", defaultDistribution: "full_remittance" },
  { sort: 28, code: "MCH028", name: "Mapato ya Ukumbi", category: "Taasisi", defaultDistribution: "full_remittance" },
  { sort: 29, code: "MCH029", name: "Mapato ya Guest House", category: "Taasisi", defaultDistribution: "full_remittance" },
  { sort: 30, code: "MCH030", name: "Mapato ya Mashamba", category: "Taasisi", defaultDistribution: "full_remittance" },
  { sort: 31, code: "MCH031", name: "Mapato ya Vitabu na Publications", category: "Taasisi", defaultDistribution: "full_remittance" },
  { sort: 32, code: "MCH032", name: "Donations za Online", category: "Ruzuku na Donations", defaultDistribution: "full_remittance" },
  { sort: 33, code: "MCH033", name: "Mobile Money Collections", category: "Ruzuku na Donations", defaultDistribution: "full_remittance" },
  { sort: 34, code: "MCH034", name: "Conference & Seminar Fees", category: "Matukio", defaultDistribution: "full_remittance" },
  { sort: 35, code: "MCH035", name: "Emergency Fund", category: "Huduma na Jamii", defaultDistribution: "full_remittance" },
  { sort: 36, code: "MCH036", name: "Welfare Contributions", category: "Huduma na Jamii", defaultDistribution: "full_remittance" },
  { sort: 37, code: "MCH037", name: "Mission Support Fund", category: "Huduma na Jamii", defaultDistribution: "full_remittance" },
  { sort: 38, code: "MCH038", name: "Investment Income", category: "Miradi na Uwekezaji", defaultDistribution: "full_remittance" },
  { sort: 39, code: "MCH039", name: "Sadaka ya Wageni", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 40, code: "MCH040", name: "Matoleo ya Wachungaji", category: "Michango ya Kiroho", defaultDistribution: "hierarchy_share" },
  { sort: 41, code: "MCH041", name: "Michango ya Safari za Huduma", category: "Huduma na Jamii", defaultDistribution: "full_remittance" },
  { sort: 42, code: "MCH042", name: "Michango ya Mikutano Mikuu", category: "Matukio", defaultDistribution: "full_remittance" },
  { sort: 43, code: "MCH043", name: "Michango ya Huduma za Mazishi", category: "Huduma na Jamii", defaultDistribution: "full_remittance" },
  { sort: 44, code: "MCH044", name: "Michango ya Ndoa", category: "Matukio", defaultDistribution: "full_remittance" },
  { sort: 45, code: "MCH045", name: "Michango ya Vijana Camps", category: "Matukio", defaultDistribution: "full_remittance" },
  { sort: 46, code: "MCH046", name: "Michango ya Mafunzo ya Biblia", category: "Maendeleo", defaultDistribution: "full_remittance" },
  { sort: 47, code: "MCH047", name: "Other Church Income", category: "Mengineyo", defaultDistribution: "hierarchy_share" },
] as const;

export function distributionModeLabel(mode: IncomeDistributionMode): string {
  return mode === "full_remittance" ? "100% — kamili juu" : "35% — sehemu ya ngazi";
}

export function distributionModeShort(mode: IncomeDistributionMode, percent = KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT): string {
  return mode === "full_remittance" ? "100%" : `${percent}%`;
}
