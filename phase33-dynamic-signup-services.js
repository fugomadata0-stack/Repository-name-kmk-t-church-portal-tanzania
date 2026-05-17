import { getSafeSupabase, safeAsync, recordIntegrationError } from "./phase-integration-core.js";

const LS_KEY = "kmt_phase33_signup_requests_v1";
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const stamp = () => `REQ-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

export const publicRoles = [
  "Diocese Data Officer",
  "Jimbo Data Officer",
  "Branch Data Officer",
  "Department Officer",
  "Fellowship Officer",
  "Choir Officer",
  "Institution Officer",
  "Events Officer",
  "Publications/Media Officer",
  "Viewer / Mtazamaji",
];

const referenceData = {
  dioceses: ["Dayosisi ya Dar es Salaam", "Dayosisi ya Mwanza", "Dayosisi ya Arusha"],
  jimboByDiocese: {
    "Dayosisi ya Dar es Salaam": ["Jimbo la Kati", "Jimbo la Pwani"],
    "Dayosisi ya Mwanza": ["Jimbo la Ilemela", "Jimbo la Nyamagana"],
    "Dayosisi ya Arusha": ["Jimbo la Meru", "Jimbo la Karatu"],
  },
  branchByJimbo: {
    "Jimbo la Kati": ["Tawi la Amani", "Parokia ya Neema"],
    "Jimbo la Pwani": ["Tawi la Tumaini"],
    "Jimbo la Ilemela": ["Kituo cha Nuru"],
    "Jimbo la Nyamagana": ["Tawi la Upendo"],
    "Jimbo la Meru": ["Parokia ya Baraka"],
    "Jimbo la Karatu": ["Tawi la Mlima Sion"],
  },
  departments: ["Elimu ya Kikristo", "Maendeleo", "Uinjilisti", "Huduma kwa Jamii", "Fedha Msingi"],
  choirs: ["Kwaya ya Vijana", "Kwaya Kuu", "Kwaya ya Sifa"],
  fellowships: ["JVKMKT", "JWKMK", "Other"],
  institutions: {
    "Chuo cha Biblia": ["Chuo cha Biblia KMK(T) Kanda ya Kati"],
    "Shule ya Awali na Msingi": ["Shule ya KMK(T) Tumaini"],
    "Day Care": [],
    "Hospital / Health Facility": ["KMK(T) Mission Clinic"],
    "Kituo cha Malezi Mtoto na Kijana": [],
    Other: [],
  },
};

const state = { requests: [] };

function persist() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.requests));
}

function hydrate() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = JSON.parse(raw || "[]");
    if (Array.isArray(arr)) state.requests = arr;
  } catch (_) {}
}

function useSupabase() {
  return !!getSafeSupabase();
}

function toDb(r) {
  return {
    id: r.id,
    full_name: r.fullName,
    gender: r.gender,
    phone: r.phone,
    email: r.email,
    requested_role: r.requestedRole,
    request_reason: r.requestReason,
    previous_responsibility: r.previousResponsibility || "",
    requested_scope: r.requestedScope || "",
    unit_name: r.unitName || "",
    dynamic_payload:
      r.dynamicPayload && typeof r.dynamicPayload === "object" && !Array.isArray(r.dynamicPayload)
        ? r.dynamicPayload
        : {},
    status: r.status,
    verification_flag: r.verificationFlag || "",
    submitted_at: r.submittedAt || now(),
  };
}

function fromDb(r) {
  return {
    id: r.id,
    fullName: r.full_name,
    gender: r.gender,
    phone: r.phone,
    email: r.email,
    requestedRole: r.requested_role,
    requestReason: r.request_reason,
    previousResponsibility: r.previous_responsibility || "",
    requestedScope: r.requested_scope || "",
    unitName: r.unit_name || "",
    dynamicPayload: r.dynamic_payload || {},
    status: r.status || "Pending Approval",
    verificationFlag: r.verification_flag || "",
    submittedAt: r.submitted_at || now(),
  };
}

export function getReferenceData() {
  return referenceData;
}

/** Herufi maalum zinazoruhusiwa (kulingana na mahitaji ya mfumo) */
const PASSWORD_SPECIAL_RE = /[@#$!]/;

/**
 * Uchambuzi kamili wa nenosiri la usajili.
 * @returns {{ valid: boolean, checks: object, errors: string[], digitCount: number }}
 */
export function analyzePasswordStrength(p) {
  const s = String(p || "");
  const digitCount = (s.match(/\d/g) || []).length;
  const checks = {
    length: s.length >= 8,
    firstUpper: /^[A-Z]/.test(s),
    hasLower: /[a-z]/.test(s),
    hasSpecial: PASSWORD_SPECIAL_RE.test(s),
    fourDigits: digitCount >= 4,
  };
  const errors = [];
  if (!checks.length) errors.push("Urefu wa chini ni herufi 8.");
  if (!checks.firstUpper) errors.push("Herufi ya kwanza lazima iwe kubwa (A–Z).");
  if (!checks.hasLower) errors.push("Lazima kuwe na herufi ndogo.");
  if (!checks.hasSpecial) errors.push("Lazima kuwe na angalau herufi maalum moja katika: @ # $ !");
  if (!checks.fourDigits) errors.push("Lazima kuwe na angalau nambari nne (4).");
  return {
    valid: Object.values(checks).every(Boolean),
    checks,
    errors,
    digitCount,
  };
}

export function validatePassword(p) {
  return analyzePasswordStrength(p).valid;
}

/**
 * Uthibitishaji upande wa Supabase (RPC `phase33_password_valid`), akishindwa anatumia uthibitishaji wa ndani.
 * Nenosiri halihifadhiwi kwenye jedwali — hutumika tu kwa ombi la RPC kwa HTTPS.
 */
export async function validatePasswordRemote(p) {
  if (!validatePassword(p)) return false;
  const s = getSafeSupabase();
  if (!s) return true;
  try {
    const { data, error } = await s.rpc("phase33_password_valid", { p });
    if (error) {
      recordIntegrationError("phase33_password_rpc", error);
      return true;
    }
    if (typeof data === "boolean") return data;
    return true;
  } catch (e) {
    recordIntegrationError("phase33_password_rpc", e);
    return true;
  }
}

export function validatePhone(phone) {
  return /^\+?[0-9]{9,15}$/.test(String(phone || "").replace(/\s+/g, ""));
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

export function detectDuplicate(email, phone) {
  const e = String(email || "").toLowerCase();
  const p = String(phone || "");
  return state.requests.find((r) => String(r.email).toLowerCase() === e || String(r.phone) === p);
}

export function detectDuplicatePending(email, role) {
  const e = String(email || "").toLowerCase();
  return state.requests.find(
    (r) =>
      String(r.email).toLowerCase() === e &&
      r.requestedRole === role &&
      ["Submitted", "Pending Approval", "Under Review", "Needs Correction"].includes(r.status)
  );
}

export async function saveSignupRequest(payload) {
  const row = {
    id: stamp(),
    ...payload,
    status: "Pending Approval",
    submittedAt: now(),
  };
  state.requests.unshift(row);
  persist();
  const s = getSafeSupabase();
  if (s) await safeAsync("phase33_insert_request", () => s.from("phase33_signup_requests").insert(toDb(row)), null);
  return row;
}

export async function syncRequestsFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return false;
  const res = await safeAsync(
    "phase33_sync_requests",
    () => s.from("phase33_signup_requests").select("*").order("submitted_at", { ascending: false }),
    null
  );
  const rows = Array.isArray(res?.data) ? res.data : [];
  if (!rows.length) return false;
  state.requests = rows.map(fromDb);
  persist();
  return true;
}

export function getSignupRequests() {
  return [...state.requests];
}

export async function updateRequestStatus(id, status, extra = {}) {
  const row = state.requests.find((x) => x.id === id);
  if (!row) return;
  row.status = status;
  Object.assign(row, extra);
  persist();
  const s = getSafeSupabase();
  if (s) await safeAsync("phase33_update_status", () => s.from("phase33_signup_requests").update({ status, dynamic_payload: row.dynamicPayload }).eq("id", id), null);
}

export function seedIfEmpty() {
  if (state.requests.length) return;
  state.requests.push({
    id: "REQ-DEMO-1",
    fullName: "Neema Chuwa",
    gender: "Female",
    phone: "+255700123456",
    email: "neema.demo@kmkt.or.tz",
    requestedRole: "Diocese Data Officer",
    requestReason: "Ninaongoza ukusanyaji wa takwimu za dayosisi.",
    previousResponsibility: "Mratibu wa data wa jimbo",
    requestedScope: "Dayosisi",
    unitName: "Dayosisi ya Dar es Salaam",
    dynamicPayload: { diocese: "Dayosisi ya Dar es Salaam", positionTitle: "Data Officer" },
    status: "Pending Approval",
    verificationFlag: "",
    submittedAt: now(),
  });
  persist();
}

hydrate();
