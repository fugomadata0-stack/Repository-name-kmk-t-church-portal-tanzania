import { getSafeSupabase } from "./phase-integration-core.js";
import { normalizePayloadByFieldMap } from "./utils/input-normalization.js";

const leadershipState = {
  leaders: [
    { id: 1, first_name: "Sospiter", middle_name: "Masamaki", last_name: "Changuru", full_name: "MCH. SOSPITER MASAMAKI CHANGURU", gender: "Mwanaume", dob: "1980-01-01", age: 46, marital_status: "Married", phone: "0784775746", whatsapp: "0784775746", email: "changurukmkt@gmail.com", home_address: "Musoma", current_address: "Musoma", education_level: "Bachelor", theology_training: "Leadership Training", leadership_level: "Ngazi Kuu", role_name: "Muhasibu wa Kanisa", category: "National Executive", type: "Default Role", leader_type: "NGAZI_KUU", dayosisi: "-", jimbo: "-", branch: "KMK(T) HQ", service_start_date: "2024-01-01", years_of_service: 2, appointment_date: "2024-01-01", term_duration: "5 years", end_of_term: "2029-01-01", profile_photo: "placeholder", signature: "on-file", short_bio: "-", vision_statement: "-", emergency_contact: "-", nida: "restricted", confidential_notes: "-", visibility: "Internal Office", status: "active", approval_status: "approved", is_archived: false },
    { id: 2, full_name: "Lameck Nicodemus Manji", first_name: "Lameck", middle_name: "Nicodemus", last_name: "Manji", gender: "Mwanaume", dob: "1975-01-01", age: 51, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Askofu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mara", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 3, full_name: "Paulo Petro Chemere", first_name: "Paulo", middle_name: "Petro", last_name: "Chemere", gender: "Mwanaume", dob: "1977-01-01", age: 49, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Askofu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mwanza", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 4, full_name: "Simoni Masare Mtatiro", first_name: "Simoni", middle_name: "Masare", last_name: "Mtatiro", gender: "Mwanaume", dob: "1974-01-01", age: 52, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Askofu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Bunda", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 5, full_name: "Godwill Paslotus Maregesi", first_name: "Godwill", middle_name: "Paslotus", last_name: "Maregesi", gender: "Mwanaume", dob: "1979-01-01", age: 47, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Askofu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dodoma", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 6, full_name: "Yeremia Mawawa Magomba", first_name: "Yeremia", middle_name: "Mawawa", last_name: "Magomba", gender: "Mwanaume", dob: "1976-01-01", age: 50, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Askofu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dar es Salaam", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 7, full_name: "Samsoni Makuri Wairaro", first_name: "Samsoni", middle_name: "Makuri", last_name: "Wairaro", gender: "Mwanaume", dob: "1978-01-01", age: 48, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Askofu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Kigoma", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 8, full_name: "Makamu Dodoma", first_name: "Vacant", middle_name: "", last_name: "", gender: "Mwanaume", dob: "2000-01-01", age: 26, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Makamu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dodoma", jimbo: "-", branch: "-", service_start_date: "2026-01-01", years_of_service: 0, visibility: "Internal Office", status: "vacant" },
    { id: 9, full_name: "Katibu Kigoma", first_name: "To", middle_name: "Be", last_name: "Updated", gender: "Mwanaume", dob: "2000-01-01", age: 26, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Kigoma", jimbo: "-", branch: "-", service_start_date: "2026-01-01", years_of_service: 0, visibility: "Internal Office", status: "pending_verification" },
    { id: 10, full_name: "Mch. Boaz Maingu Nyeura", first_name: "Boaz", middle_name: "Maingu", last_name: "Nyeura", gender: "Mwanaume", dob: "1979-01-01", age: 47, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Makamu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mara", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 11, full_name: "Mch. Lameck Barnabas Musema", first_name: "Lameck", middle_name: "Barnabas", last_name: "Musema", gender: "Mwanaume", dob: "1981-01-01", age: 45, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mara", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 12, full_name: "Emmanuel Mutani Yebete", first_name: "Emmanuel", middle_name: "Mutani", last_name: "Yebete", gender: "Mwanaume", dob: "1984-01-01", age: 42, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Naibu Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mara", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 13, full_name: "Makunja Jastus Magoro", first_name: "Makunja", middle_name: "Jastus", last_name: "Magoro", gender: "Mwanaume", dob: "1982-01-01", age: 44, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Muhasibu/Mhazini", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mara", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 14, full_name: "Alex Semba Ekokoro", first_name: "Alex", middle_name: "Semba", last_name: "Ekokoro", gender: "Mwanaume", dob: "1983-01-01", age: 43, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Makamu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mwanza", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 15, full_name: "Mathias Meja Masami", first_name: "Mathias", middle_name: "Meja", last_name: "Masami", gender: "Mwanaume", dob: "1980-01-01", age: 46, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mwanza", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 16, full_name: "Stanslaus Chacha Maguri", first_name: "Stanslaus", middle_name: "Chacha", last_name: "Maguri", gender: "Mwanaume", dob: "1982-01-01", age: 44, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Naibu Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mwanza", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 17, full_name: "Sadock Manyama", first_name: "Sadock", middle_name: "", last_name: "Manyama", gender: "Mwanaume", dob: "1981-01-01", age: 45, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Muhasibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Mwanza", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 18, full_name: "Ladhameni Bulenga Maendeka", first_name: "Ladhameni", middle_name: "Bulenga", last_name: "Maendeka", gender: "Mwanaume", dob: "1980-01-01", age: 46, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Makamu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Bunda", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 19, full_name: "Arstaliko Lazaro", first_name: "Arstaliko", middle_name: "", last_name: "Lazaro", gender: "Mwanaume", dob: "1985-01-01", age: 41, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Bunda", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 20, full_name: "Jumapili Mauka", first_name: "Jumapili", middle_name: "", last_name: "Mauka", gender: "Mwanaume", dob: "1986-01-01", age: 40, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Naibu Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Bunda", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 21, full_name: "Sospiter Masamaki Changuru", first_name: "Sospiter", middle_name: "Masamaki", last_name: "Changuru", gender: "Mwanaume", dob: "1980-01-01", age: 46, phone: "0784775746", whatsapp: "0784775746", email: "changurukmkt@gmail.com", leadership_level: "Dayosisi", role_name: "Muhasibu/Mhazini", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Bunda", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 22, full_name: "Abiudi Michael Matara", first_name: "Abiudi", middle_name: "Michael", last_name: "Matara", gender: "Mwanaume", dob: "1983-01-01", age: 43, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dodoma", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 23, full_name: "To Be Updated", first_name: "To", middle_name: "Be", last_name: "Updated", gender: "Mwanaume", dob: "2000-01-01", age: 26, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Naibu Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dodoma", jimbo: "-", branch: "-", service_start_date: "2026-01-01", years_of_service: 0, visibility: "Internal Office", status: "pending_verification" },
    { id: 24, full_name: "To Be Updated", first_name: "To", middle_name: "Be", last_name: "Updated", gender: "Mwanaume", dob: "2000-01-01", age: 26, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Muhasibu/Mhazini", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dodoma", jimbo: "-", branch: "-", service_start_date: "2026-01-01", years_of_service: 0, visibility: "Internal Office", status: "pending_verification" },
    { id: 25, full_name: "Yuda Bwire Chikumbiro", first_name: "Yuda", middle_name: "Bwire", last_name: "Chikumbiro", gender: "Mwanaume", dob: "1980-01-01", age: 46, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Makamu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dar es Salaam", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 26, full_name: "Maregesi Stephano Ndaro", first_name: "Maregesi", middle_name: "Stephano", last_name: "Ndaro", gender: "Mwanaume", dob: "1982-01-01", age: 44, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dar es Salaam", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 27, full_name: "Mtipa Nashoni Mswaga", first_name: "Mtipa", middle_name: "Nashoni", last_name: "Mswaga", gender: "Mwanaume", dob: "1983-01-01", age: 43, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Naibu Katibu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dar es Salaam", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 28, full_name: "Maarifa Benjamini Wafurungu", first_name: "Maarifa", middle_name: "Benjamini", last_name: "Wafurungu", gender: "Mwanaume", dob: "1981-01-01", age: 45, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Muhasibu/Mhazini", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Dar es Salaam", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Internal Office", status: "active" },
    { id: 29, full_name: "Mch. Jackson Makiriro", first_name: "Jackson", middle_name: "", last_name: "Makiriro", gender: "Mwanaume", dob: "1982-01-01", age: 44, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Makamu", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Kigoma", jimbo: "-", branch: "-", service_start_date: "2025-01-01", years_of_service: 1, visibility: "Public", status: "active" },
    { id: 30, full_name: "To Be Updated", first_name: "To", middle_name: "Be", last_name: "Updated", gender: "Mwanaume", dob: "2000-01-01", age: 26, phone: "-", whatsapp: "-", email: "-", leadership_level: "Dayosisi", role_name: "Muhasibu/Mhazini", category: "Dayosisi Executive", type: "Default Role", dayosisi: "Kigoma", jimbo: "-", branch: "-", service_start_date: "2026-01-01", years_of_service: 0, visibility: "Internal Office", status: "pending_verification" },
  ],
  history: [
    { id: 1, kiongozi: "Askofu Mkuu Elias Mrema", cheo: "Askofu Mkuu", eneo: "Taifa", kuanza: "2020-01-10", kumaliza: "-", status: "active", notes: "-" },
    { id: 2, kiongozi: "Mch. Daniel Msangi", cheo: "Mchungaji", eneo: "Tawi la Amani", kuanza: "2010-05-10", kumaliza: "2024-12-31", status: "retired", notes: "Retired with honor" },
  ],
  documents: [
    { id: 1, kiongozi: "Askofu Mkuu Elias Mrema", aina: "Appointment", file: "appointment-letter.pdf", by: "super_admin", date: "2026-04-01", visibility: "private" },
    { id: 2, kiongozi: "Askofu Rehema Mtei", aina: "ID", file: "bishop-id.pdf", by: "admin", date: "2026-03-21", visibility: "restricted" },
  ],
  meta: {
    positions: [{ id: 1, name: "Askofu Mkuu", status: "active" }],
    categories: [{ id: 1, name: "National Executive", status: "active" }],
    types: [{ id: 1, name: "Default Role", status: "active" }],
    custom_fields: [{ id: 1, name: "Office Code", status: "active" }],
  },
  transfers: [
    { id: 1, leader_name: "MCH. SOSPITER MASAMAKI CHANGURU", from_dayosisi: "Bunda", to_dayosisi: "Ngazi Kuu", from_jimbo: "-", to_jimbo: "-", from_tawi: "-", to_tawi: "KMK(T) HQ", reason: "Executive Assignment", effective_date: "2024-01-01", approval_status: "approved", status: "active" },
  ],
  vacancies: [
    { id: 1, ngazi: "Dayosisi", eneo: "Dayosisi ya Dodoma", nafasi: "Makamu Mwenyekiti", tarehe_kuwa_wazi: "2026-01-01", sababu: "Not assigned", priority: "High", assigned_recruiter: "CHIEF ADMIN", status: "Open" },
  ],
  mode: "mock",
};

export function getLeaders() { return [...leadershipState.leaders]; }
export function setLeaders(rows) { leadershipState.leaders = rows; }
export function getHistory() { return [...leadershipState.history]; }
export function setHistory(rows) { leadershipState.history = rows; }
export function getDocs() { return [...leadershipState.documents]; }
export function getTransfers() { return [...leadershipState.transfers]; }
export function getVacancies() { return [...leadershipState.vacancies]; }
export function setDocs(rows) { leadershipState.documents = rows; }
export function getLeadershipMode() { return leadershipState.mode; }
export function getMetaItems(kind) { return [...(leadershipState.meta[kind] || [])]; }

function usingSupabase() {
  return !!getSafeSupabase();
}

const leadershipSupabaseTables = [
  "leaders",
  "national_leaders",
  "diocese_leaders",
  "bishops",
  "pastors",
  "evangelists",
  "elders",
  "deacons",
  "local_leaders",
];

async function safeSelectTable(supabase, table) {
  const { data, error } = await supabase.from(table).select("*").order("id", { ascending: false });
  if (error) return [];
  return (data || []).map((r) => ({ ...r, source_table: table }));
}

export async function loadLeadershipData() {
  if (!usingSupabase()) {
    leadershipState.mode = "mock";
    return;
  }
  leadershipState.mode = "supabase";
  const supabase = getSafeSupabase();
  const [leaderRowsList, historyRes, docsRes] = await Promise.all([
    Promise.all(leadershipSupabaseTables.map((table) => safeSelectTable(supabase, table))),
    supabase.from("leadership_history").select("*").order("id", { ascending: false }),
    supabase.from("leader_documents").select("*").order("id", { ascending: false }),
  ]);
  const mergedRows = leaderRowsList.flat();
  if (mergedRows.length) leadershipState.leaders = mergedRows.map((r) => mapLeaderFromDb(r));
  if (!historyRes.error) leadershipState.history = (historyRes.data || []).map((r) => mapHistoryFromDb(r));
  if (!docsRes.error) leadershipState.documents = (docsRes.data || []).map((r) => mapDocFromDb(r));
}

function mapLeaderFromDb(r) {
  return {
    id: r.id,
    first_name: r.first_name,
    middle_name: r.middle_name,
    last_name: r.last_name,
    full_name: r.full_name || r.jina,
    gender: r.gender || r.jinsia,
    dob: r.dob || r.tarehe_kuzaliwa,
    age: r.age,
    marital_status: r.marital_status,
    phone: r.phone || r.simu,
    whatsapp: r.whatsapp,
    email: r.email,
    home_address: r.home_address,
    current_address: r.current_address || r.anwani,
    education_level: r.education_level || r.elimu,
    theology_training: r.theology_training,
    leadership_level: r.leadership_level || r.ngazi,
    role_name: r.role_name || r.cheo,
    leader_type: r.leader_type || "DAYOSISI",
    category: r.category,
    type: r.type,
    dayosisi: r.dayosisi,
    jimbo: r.jimbo,
    branch: r.branch || r.tawi,
    service_start_date: r.service_start_date || r.tarehe_kuanza,
    years_of_service: r.years_of_service || r.uzoefu,
    appointment_date: r.appointment_date,
    term_duration: r.term_duration,
    end_of_term: r.end_of_term || r.tarehe_kumaliza,
    profile_photo: r.profile_photo || r.picha,
    signature: r.signature,
    short_bio: r.short_bio || r.wasifu,
    vision_statement: r.vision_statement,
    emergency_contact: r.emergency_contact,
    nida: r.nida,
    confidential_notes: r.confidential_notes || r.notes,
    visibility: r.visibility || "Internal Office",
    status: r.status,
    approval_status: r.approval_status || "pending",
    is_archived: !!r.is_archived,
    source_table: r.source_table || "leaders",
  };
}

function mapLeaderToDb(payload) {
  return {
    first_name: payload.first_name,
    middle_name: payload.middle_name,
    last_name: payload.last_name,
    full_name: payload.full_name,
    gender: payload.gender,
    dob: payload.dob,
    age: payload.age,
    marital_status: payload.marital_status,
    phone: payload.phone,
    whatsapp: payload.whatsapp,
    dayosisi: payload.dayosisi,
    jimbo: payload.jimbo,
    branch: payload.branch,
    email: payload.email,
    home_address: payload.home_address,
    current_address: payload.current_address,
    education_level: payload.education_level,
    theology_training: payload.theology_training,
    leadership_level: payload.leadership_level,
    role_name: payload.role_name,
    leader_type: payload.leader_type || "DAYOSISI",
    category: payload.category,
    type: payload.type,
    service_start_date: payload.service_start_date,
    years_of_service: payload.years_of_service,
    appointment_date: payload.appointment_date,
    term_duration: payload.term_duration,
    end_of_term: payload.end_of_term || null,
    profile_photo: payload.profile_photo,
    signature: payload.signature,
    short_bio: payload.short_bio,
    vision_statement: payload.vision_statement,
    emergency_contact: payload.emergency_contact,
    nida: payload.nida,
    confidential_notes: payload.confidential_notes,
    visibility: payload.visibility,
    status: payload.status,
    approval_status: payload.approval_status || "pending",
    is_archived: !!payload.is_archived,
    archived_at: payload.archived_at || null,
    archived_by: payload.archived_by || null,
  };
}

function resolveLeaderTable(payload = {}) {
  const t = String(payload.leader_type || "").toUpperCase();
  if (t === "NGAZI_KUU") return "national_leaders";
  if (t === "DAYOSISI") return "diocese_leaders";
  if (t === "ASKOFU") return "bishops";
  if (t === "MCHUNGAJI") return "pastors";
  if (t === "MWINJILISTI") return "evangelists";
  if (t === "MZEE") return "elders";
  if (t === "SHEMASI") return "deacons";
  if (t === "KIONGOZI_TAWI") return "local_leaders";
  return "leaders";
}

function mapHistoryFromDb(r) {
  return { id: r.id, kiongozi: r.kiongozi, cheo: r.cheo, eneo: r.eneo, kuanza: r.kuanza, kumaliza: r.kumaliza, status: r.status, notes: r.notes };
}
function mapHistoryToDb(p) {
  return { kiongozi: p.kiongozi, cheo: p.cheo, eneo: p.eneo, kuanza: p.kuanza, kumaliza: p.kumaliza, status: p.status, notes: p.notes };
}
function mapDocFromDb(r) {
  return { id: r.id, kiongozi: r.kiongozi, aina: r.aina, file: r.file_name, by: r.uploaded_by, date: r.uploaded_date, visibility: r.visibility };
}
function mapDocToDb(p) {
  return { kiongozi: p.kiongozi, aina: p.aina, file_name: p.file, uploaded_by: p.by, uploaded_date: p.date, visibility: p.visibility };
}

export async function saveLeader(payload, editingId = null) {
  const normalized = normalizePayloadByFieldMap(payload, {
    email: { preserveCase: true },
    short_bio: { preserveCase: true },
    vision_statement: { preserveCase: true },
    confidential_notes: { preserveCase: true },
  });
  const ready = {
    ...normalized,
    approval_status: normalized.approval_status || "pending",
    status: normalized.status || "draft",
    is_archived: !!normalized.is_archived,
  };
  if (!usingSupabase()) {
    if (editingId) {
      leadershipState.leaders = leadershipState.leaders.map((r) => (r.id === editingId ? { ...r, ...ready, updated_at: new Date().toISOString() } : r));
    } else {
      leadershipState.leaders.unshift({ id: Date.now(), ...ready, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    return;
  }
  const supabase = getSafeSupabase();
  const body = mapLeaderToDb(ready);
  const sourceTable = ready.source_table || resolveLeaderTable(ready);
  if (editingId) {
    const { error } = await supabase.from(sourceTable).update(body).eq("id", editingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from(sourceTable).insert(body);
    if (error) throw error;
  }
  await loadLeadershipData();
}

export async function removeLeader(id) {
  if (!usingSupabase()) {
    leadershipState.leaders = leadershipState.leaders.map((r) => (r.id === id ? { ...r, is_archived: true, status: "archived", archived_at: new Date().toISOString() } : r));
    return;
  }
  const supabase = getSafeSupabase();
  const row = leadershipState.leaders.find((r) => r.id === id);
  const sourceTable = row?.source_table || "leaders";
  const { error } = await supabase.from(sourceTable).update({ is_archived: true, status: "archived", archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await loadLeadershipData();
}

export async function clearLeaders() {
  if (!usingSupabase()) {
    leadershipState.leaders = leadershipState.leaders.map((r) => ({ ...r, is_archived: true, status: "archived" }));
    return;
  }
  const supabase = getSafeSupabase();
  const { error } = await supabase.from("leaders").update({ is_archived: true, status: "archived", archived_at: new Date().toISOString() }).neq("id", -1);
  if (error) throw error;
  await loadLeadershipData();
}

export async function submitLeader(id, actor = "SYSTEM") {
  const row = leadershipState.leaders.find((r) => r.id === id);
  if (!row) return;
  await saveLeader({ ...row, status: "submitted", approval_status: "submitted", submitted_by: actor, submitted_at: new Date().toISOString() }, id);
}

export async function approveLeader(id, actor = "SYSTEM") {
  const row = leadershipState.leaders.find((r) => r.id === id);
  if (!row) return;
  await saveLeader({ ...row, status: "approved", approval_status: "approved", approved_by: actor, approved_at: new Date().toISOString() }, id);
}

export async function rejectLeader(id, actor = "SYSTEM") {
  const row = leadershipState.leaders.find((r) => r.id === id);
  if (!row) return;
  await saveLeader({ ...row, status: "rejected", approval_status: "rejected", rejected_by: actor, rejected_at: new Date().toISOString() }, id);
}

export async function requestLeaderCorrection(id, actor = "SYSTEM") {
  const row = leadershipState.leaders.find((r) => r.id === id);
  if (!row) return;
  await saveLeader({ ...row, status: "needs_correction", approval_status: "needs_correction", reviewed_by: actor }, id);
}

export async function restoreLeader(id, actor = "SYSTEM") {
  const row = leadershipState.leaders.find((r) => r.id === id);
  if (!row) return;
  await saveLeader({ ...row, is_archived: false, status: "draft", approval_status: "pending", archived_at: null, archived_by: null, updated_by: actor }, id);
}

export async function saveHistoryItem(payload) {
  if (!usingSupabase()) {
    leadershipState.history.unshift({ id: Date.now(), ...payload });
    return;
  }
  const supabase = getSafeSupabase();
  const { error } = await supabase.from("leadership_history").insert(mapHistoryToDb(payload));
  if (error) throw error;
  await loadLeadershipData();
}

export async function removeHistoryItem(id) {
  if (!usingSupabase()) {
    leadershipState.history = leadershipState.history.filter((r) => r.id !== id);
    return;
  }
  const supabase = getSafeSupabase();
  const { error } = await supabase.from("leadership_history").delete().eq("id", id);
  if (error) throw error;
  await loadLeadershipData();
}

export async function clearHistory() {
  if (!usingSupabase()) {
    leadershipState.history = [];
    return;
  }
  const supabase = getSafeSupabase();
  const { error } = await supabase.from("leadership_history").delete().neq("id", -1);
  if (error) throw error;
  await loadLeadershipData();
}

export async function saveDocumentItem(payload) {
  if (!usingSupabase()) {
    leadershipState.documents.unshift({ id: Date.now(), ...payload });
    return;
  }
  const supabase = getSafeSupabase();
  const { error } = await supabase.from("leader_documents").insert(mapDocToDb(payload));
  if (error) throw error;
  await loadLeadershipData();
}

export async function removeDocumentItem(id) {
  if (!usingSupabase()) {
    leadershipState.documents = leadershipState.documents.filter((r) => r.id !== id);
    return;
  }
  const supabase = getSafeSupabase();
  const { error } = await supabase.from("leader_documents").delete().eq("id", id);
  if (error) throw error;
  await loadLeadershipData();
}

export async function clearDocuments() {
  if (!usingSupabase()) {
    leadershipState.documents = [];
    return;
  }
  const supabase = getSafeSupabase();
  const { error } = await supabase.from("leader_documents").delete().neq("id", -1);
  if (error) throw error;
  await loadLeadershipData();
}

export async function saveMetaItem(kind, payload, editingId = null) {
  const key = leadershipState.meta[kind] ? kind : null;
  if (!key) throw new Error("Invalid meta type");
  if (editingId) {
    leadershipState.meta[key] = leadershipState.meta[key].map((r) => (r.id === editingId ? { ...r, ...payload } : r));
    return;
  }
  leadershipState.meta[key].unshift({ id: Date.now(), ...payload });
}

export async function removeMetaItem(kind, id) {
  const key = leadershipState.meta[kind] ? kind : null;
  if (!key) throw new Error("Invalid meta type");
  leadershipState.meta[key] = leadershipState.meta[key].filter((r) => r.id !== id);
}

export function getFilterOptions() {
  const leaders = leadershipState.leaders;
  const uniq = (arr) => [...new Set(arr.filter((v) => String(v || "").trim()))];
  return {
    roles: uniq(leaders.map((l) => l.role_name)),
    dayosisi: uniq(leaders.map((l) => l.dayosisi)),
    jimbo: uniq(leaders.map((l) => l.jimbo)),
    tawi: uniq(leaders.map((l) => l.branch)),
    status: uniq(leaders.map((l) => l.status)),
    ngazi: uniq(leaders.map((l) => l.leadership_level)),
  };
}

export function logLeadershipActivity(action, description) {
  const raw = localStorage.getItem("kmt_leadership_activity_logs");
  const arr = raw ? JSON.parse(raw) : [];
  arr.unshift({ id: Date.now(), action, description, created_at: new Date().toISOString() });
  localStorage.setItem("kmt_leadership_activity_logs", JSON.stringify(arr.slice(0, 800)));
}

export async function logLeadershipActivityDb({ actorRole, action, description, payload = {} }) {
  if (!usingSupabase()) return;
  const supabase = getSafeSupabase();
  await supabase.from("activity_logs").insert({
    actor_role: actorRole || "unknown",
    module: "leadership",
    action,
    description,
    payload,
  });
}

export async function uploadLeaderAsset(file, folder = "documents") {
  if (!usingSupabase()) {
    return { url: `mock://${folder}/${file.name}` };
  }
  const supabase = getSafeSupabase();
  const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const path = `${folder}/${safeName}`;
  const { error } = await supabase.storage.from("leadership-assets").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("leadership-assets").getPublicUrl(path);
  return { url: data.publicUrl };
}

export function canManageByRole(role, action) {
  const rules = {
    chief_admin: ["view", "add", "edit", "delete", "clear", "export", "print", "upload", "approve", "reject", "submit", "archive", "restore"],
    super_admin: ["view", "add", "edit", "delete", "clear", "export", "print", "upload", "approve", "reject", "submit", "archive", "restore"],
    national_admin: ["view", "add", "edit", "export", "print", "upload", "approve", "reject", "submit", "archive", "restore"],
    dayosisi_admin: ["view", "add", "edit", "export", "print", "upload", "submit", "archive", "restore"],
    jimbo_admin: ["view", "add", "edit", "export", "print", "submit", "archive"],
    tawi_admin: ["view", "add", "edit", "export", "print", "submit"],
    viewer: ["view", "print"],
    admin: ["view", "add", "edit", "delete", "clear", "export", "print", "upload", "approve", "reject", "submit", "archive", "restore"],
    askofu_mkuu: ["view", "edit", "export", "print", "upload", "approve"],
    askofu_dayosisi: ["view", "add", "edit", "export", "print", "upload"],
    mchungaji: ["view", "print"],
    member: ["view"],
  };
  return (rules[role] || rules.member).includes(action);
}
