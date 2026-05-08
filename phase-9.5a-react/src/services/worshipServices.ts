import { createClient } from "@supabase/supabase-js";
import type { AttendanceItems, OfferingItems, WorshipServiceRecord } from "../types";

const FALLBACK_RECORDS: WorshipServiceRecord[] = [
  { id: 1, tarehe: "2026-04-21", dayosisi: "Kaskazini", jimbo: "Nkuyu", tawi: "Nkuyu A", ainaYaIbada: "Jumapili Asubuhi", ibada1: 170, ibada2: 151, jumlaMahudhurio: 321, jumlaMapato: 1430000, salioJipya: 5220000, mhubiri: "Mch. Daudi", approvalStatus: "Pastor Approved", createdBy: "Secretary", lastUpdated: "2026-04-21 11:30" },
  { id: 2, tarehe: "2026-04-20", dayosisi: "Kati", jimbo: "Mjini", tawi: "Tawi Mjini", ainaYaIbada: "Kesha", ibada1: 120, ibada2: 98, jumlaMahudhurio: 218, jumlaMapato: 990000, salioJipya: 6100000, mhubiri: "Mch. Eliya", approvalStatus: "Treasurer Verified", createdBy: "Branch Leader", lastUpdated: "2026-04-20 23:10" },
  { id: 3, tarehe: "2026-04-19", dayosisi: "Kaskazini", jimbo: "Magharibi", tawi: "Tawi B", ainaYaIbada: "Youth Service", ibada1: 140, ibada2: 90, jumlaMahudhurio: 230, jumlaMapato: 1180000, salioJipya: 4900000, mhubiri: "Mch. Paulo", approvalStatus: "Draft", createdBy: "Secretary", lastUpdated: "2026-04-19 18:00" },
  { id: 4, tarehe: "2026-04-18", dayosisi: "Kati", jimbo: "Pwani", tawi: "Tawi Pwani", ainaYaIbada: "Ibada ya Familia", ibada1: 115, ibada2: 102, jumlaMahudhurio: 217, jumlaMapato: 850000, salioJipya: 4700000, mhubiri: "Mch. Tito", approvalStatus: "Secretary Reviewed", createdBy: "Secretary", lastUpdated: "2026-04-18 15:44" },
  { id: 5, tarehe: "2026-04-17", dayosisi: "Kusini", jimbo: "Mlimani", tawi: "Tawi Mlimani", ainaYaIbada: "Prayer Service", ibada1: 88, ibada2: 73, jumlaMahudhurio: 161, jumlaMapato: 620000, salioJipya: 4310000, mhubiri: "Mch. Petro", approvalStatus: "Locked", createdBy: "Pastor", lastUpdated: "2026-04-17 20:05" },
  { id: 6, tarehe: "2026-04-16", dayosisi: "Kaskazini", jimbo: "Nkuyu", tawi: "Tawi C", ainaYaIbada: "Jumapili Jioni", ibada1: 132, ibada2: 101, jumlaMahudhurio: 233, jumlaMapato: 1045000, salioJipya: 4500000, mhubiri: "Mch. Daudi", approvalStatus: "Submitted", createdBy: "Secretary", lastUpdated: "2026-04-16 21:12" },
  { id: 7, tarehe: "2026-04-15", dayosisi: "Kati", jimbo: "Mjini", tawi: "Tawi East", ainaYaIbada: "Women Service", ibada1: 99, ibada2: 84, jumlaMahudhurio: 183, jumlaMapato: 760000, salioJipya: 4000000, mhubiri: "Mch. Ruth", approvalStatus: "Bishop Reviewed", createdBy: "Bishop", lastUpdated: "2026-04-15 14:33" },
  { id: 8, tarehe: "2026-04-14", dayosisi: "Kusini", jimbo: "Mto", tawi: "Tawi Mto", ainaYaIbada: "Mafundisho", ibada1: 111, ibada2: 89, jumlaMahudhurio: 200, jumlaMapato: 905000, salioJipya: 3880000, mhubiri: "Mch. Marko", approvalStatus: "Pastor Approved", createdBy: "Secretary", lastUpdated: "2026-04-14 17:41" },
];

const STORAGE_KEY = "kmt.worship.records.v1";
const SUPABASE_TABLE = "worship_service_records";
type WorshipRecordRow = {
  id: number;
  tarehe: string;
  dayosisi: string;
  jimbo: string;
  tawi: string;
  aina_ya_ibada: string;
  ibada_1: number;
  ibada_2: number;
  jumla_mahudhurio: number;
  jumla_mapato: number;
  salio_jipya: number;
  mhubiri: string;
  approval_status: string;
  created_by: string;
  last_updated: string;
};

type SupabaseLikeClient = {
  from: (table: string) => {
    select: (query?: string) => Promise<{ data: WorshipRecordRow[] | null; error: { message: string } | null }>;
    insert: (values: Record<string, unknown> | Record<string, unknown>[]) => Promise<{ data: unknown; error: { message: string } | null }>;
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: number) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    delete: () => {
      eq: (column: string, value: number) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
};

function rowToRecord(row: WorshipRecordRow): WorshipServiceRecord {
  return {
    id: row.id,
    tarehe: row.tarehe,
    dayosisi: row.dayosisi,
    jimbo: row.jimbo,
    tawi: row.tawi,
    ainaYaIbada: row.aina_ya_ibada,
    ibada1: row.ibada_1,
    ibada2: row.ibada_2,
    jumlaMahudhurio: row.jumla_mahudhurio,
    jumlaMapato: row.jumla_mapato,
    salioJipya: row.salio_jipya,
    mhubiri: row.mhubiri,
    approvalStatus: row.approval_status,
    createdBy: row.created_by,
    lastUpdated: row.last_updated,
  };
}

function recordToRow(record: Omit<WorshipServiceRecord, "id"> | WorshipServiceRecord): Record<string, unknown> {
  return {
    ...(typeof (record as WorshipServiceRecord).id === "number" ? { id: (record as WorshipServiceRecord).id } : {}),
    tarehe: record.tarehe,
    dayosisi: record.dayosisi,
    jimbo: record.jimbo,
    tawi: record.tawi,
    aina_ya_ibada: record.ainaYaIbada,
    ibada_1: record.ibada1,
    ibada_2: record.ibada2,
    jumla_mahudhurio: record.jumlaMahudhurio,
    jumla_mapato: record.jumlaMapato,
    salio_jipya: record.salioJipya,
    mhubiri: record.mhubiri,
    approval_status: record.approvalStatus,
    created_by: record.createdBy,
    last_updated: record.lastUpdated,
  };
}

let cachedSupabaseClient: SupabaseLikeClient | null | undefined;

function getSupabaseClient(): SupabaseLikeClient | null {
  if (cachedSupabaseClient !== undefined) return cachedSupabaseClient;

  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (envUrl && envAnonKey) {
    cachedSupabaseClient = createClient(envUrl, envAnonKey) as unknown as SupabaseLikeClient;
    return cachedSupabaseClient;
  }

  const g = globalThis as unknown as {
    KMT_SUPABASE_CONFIG?: { enabled?: boolean; url?: string; anonKey?: string };
    supabase?: { createClient: (url: string, key: string) => SupabaseLikeClient };
  };
  const cfg = g.KMT_SUPABASE_CONFIG;
  const canUse = !!cfg?.enabled && !!cfg.url && !!cfg.anonKey && !!g.supabase?.createClient;
  if (!canUse) {
    cachedSupabaseClient = null;
    return cachedSupabaseClient;
  }
  cachedSupabaseClient = g.supabase!.createClient(cfg!.url!, cfg!.anonKey!);
  return cachedSupabaseClient;
}

function readLocalRecords(): WorshipServiceRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return FALLBACK_RECORDS;
  try {
    const parsed = JSON.parse(raw) as WorshipServiceRecord[];
    return Array.isArray(parsed) && parsed.length ? parsed : FALLBACK_RECORDS;
  } catch {
    return FALLBACK_RECORDS;
  }
}

function writeLocalRecords(records: WorshipServiceRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export const getWorshipDataSource = async (): Promise<"supabase" | "local"> => {
  const supabase = getSupabaseClient();
  if (!supabase) return "local";
  const { error } = await supabase.from(SUPABASE_TABLE).select("id");
  return error ? "local" : "supabase";
};

export const getWorshipRecords = async (): Promise<WorshipServiceRecord[]> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from(SUPABASE_TABLE).select("*");
    if (!error && data) return data.map(rowToRecord);
  }
  return readLocalRecords();
};

export const createWorshipRecord = async (record: Omit<WorshipServiceRecord, "id">): Promise<WorshipServiceRecord> => {
  const created: WorshipServiceRecord = { id: Date.now(), ...record };
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from(SUPABASE_TABLE).insert(recordToRow(created));
    if (!error) return created;
  }
  const current = readLocalRecords();
  writeLocalRecords([created, ...current]);
  return created;
};

export const updateWorshipRecord = async (record: WorshipServiceRecord): Promise<WorshipServiceRecord> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from(SUPABASE_TABLE).update(recordToRow(record)).eq("id", record.id);
    if (!error) return record;
  }
  const next = readLocalRecords().map((r) => (r.id === record.id ? record : r));
  writeLocalRecords(next);
  return record;
};

export const deleteWorshipRecord = async (id: number): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from(SUPABASE_TABLE).delete().eq("id", id);
    if (!error) return true;
  }
  const next = readLocalRecords().filter((r) => r.id !== id);
  writeLocalRecords(next);
  return true;
};

export const duplicateWorshipRecord = async (record: WorshipServiceRecord): Promise<WorshipServiceRecord> => ({
  ...record,
  id: Date.now(),
  approvalStatus: "Draft",
});

export const calculateAttendanceTotals = (a: AttendanceItems) => {
  const wageniWote = a.wageniMe + a.wageniKe;
  const total = a.wakubwa + a.watoto + wageniWote;
  return { wageniWote, total };
};

export const calculateOfferingTotals = (o: OfferingItems) => o.sadaka + o.zaka + o.matoleo;
export const calculateNewBalance = (o: OfferingItems) => o.salioLilipita + calculateOfferingTotals(o) - o.matumizi;

export const validateRecord = (a: AttendanceItems, o: OfferingItems) => {
  const errors: string[] = [];
  if ([...Object.values(a), ...Object.values(o)].some((x) => x < 0)) errors.push("Negative values haziruhusiwi.");
  const categoryVsChannel = calculateOfferingTotals(o) - (o.fedhaTaslimu + o.fedhaSimuBank);
  if (categoryVsChannel !== 0) errors.push("Offering mismatch kati ya categories na channels.");
  if (calculateNewBalance(o) < 0) errors.push("Salio jipya ni negative.");
  return { valid: errors.length === 0, errors };
};

export const generateWhatsAppSummary = (record: WorshipServiceRecord) => `━━━━━━━━━━━━━━━━━━
KANISA LA MENNONITE LA KIINJILI TANZANIA
TAARIFA YA IBADA YA LEO
Tawi: ${record.tawi}
Tarehe: ${record.tarehe}
Aina ya Ibada: ${record.ainaYaIbada}

👥 Jumla ya Mahudhurio: ${record.jumlaMahudhurio}
💰 Jumla ya Mapato: TSh ${record.jumlaMapato.toLocaleString()}
📌 Salio Jipya: TSh ${record.salioJipya.toLocaleString()}
Mhubiri: ${record.mhubiri}

Bwana Yesu Asifiwe 🙏
━━━━━━━━━━━━━━━━━━`;
