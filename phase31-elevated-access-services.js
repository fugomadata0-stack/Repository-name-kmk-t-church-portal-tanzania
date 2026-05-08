import { approvalRoutingDefaults, requestCategories } from "./phase31-elevated-access-hooks.js";
import { getSession } from "./phase3-services.js";
import { getSafeSupabase, safeAsync, asArray } from "./phase-integration-core.js";

const STORAGE_FALLBACK = "kmt_elevated_access_module_v1";
const LETTER_BUCKET = "elevated-access-letters";
const LETTER_MAX_BYTES = 5 * 1024 * 1024;
const LETTER_LOCAL_MAX = 450 * 1024;
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const stamp = () => `EAR-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
const today = () => new Date().toISOString().slice(0, 10);

function sanitizeFilename(name) {
  return String(name || "document").replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

function readFileDataUrlCapped(file, maxChars) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (url.length > maxChars) reject(new Error("Faili ni kubwa sana kwa hifadhi ya ndani (~450KB ya base64). Tumia PDF dogo auunganishe Supabase Storage."));
      else resolve(url);
    };
    reader.onerror = () => reject(new Error("Kushindwa kusoma faili."));
    reader.readAsDataURL(file);
  });
}

/** Pakia barua: Supabase Storage (stpath:...) au localStorage (localref:...) */
export async function prepareSupportingLetter(file) {
  if (!file || !file.size) return { supportingLetter: "", supportingLetterName: "" };
  if (file.size > LETTER_MAX_BYTES) throw new Error("Kikomo cha faili ni 5MB.");
  if (!state.currentUser) throw new Error("Session haijatayarishwa.");

  const s = getSafeSupabase();
  const safeName = sanitizeFilename(file.name);
  if (s) {
    const { data: userData, error: userErr } = await s.auth.getUser();
    if (userErr || !userData?.user?.id) {
      throw new Error("Ingia kwa Supabase Auth ili kupakia barua (session ya JWT inahitajika).");
    }
    const uid = userData.user.id;
    const objectPath = `letters/${uid}/${Date.now()}_${safeName}`;
    const { error } = await s.storage.from(LETTER_BUCKET).upload(objectPath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (error) throw new Error(error.message || "Upload ya Storage imeshindwa.");
    return {
      supportingLetter: `stpath:${objectPath}`,
      supportingLetterName: file.name,
    };
  }

  const key = `kmt_ear_att_${Date.now()}_${Math.floor(Math.random() * 999)}`;
  const dataUrl = await readFileDataUrlCapped(file, LETTER_LOCAL_MAX);
  try {
    localStorage.setItem(key, dataUrl);
  } catch (e) {
    throw new Error("Hifadhi ya ndani imejaa; jaribu faili ndogo au weka Supabase.");
  }
  return {
    supportingLetter: `localref:${key}|${file.name}`,
    supportingLetterName: file.name,
  };
}

/** URL ya muda kwa kuona/kupakua (signed URL au data URL) */
export async function resolveSupportingLetterLink(stored) {
  if (!stored) return "";
  if (String(stored).startsWith("http://") || String(stored).startsWith("https://")) return stored;
  if (String(stored).startsWith("stpath:")) {
    const objectPath = String(stored).slice("stpath:".length);
    const s = getSafeSupabase();
    if (!s) return "";
    const { data, error } = await s.storage.from(LETTER_BUCKET).createSignedUrl(objectPath, 60 * 60);
    if (error || !data?.signedUrl) return "";
    return data.signedUrl;
  }
  if (String(stored).startsWith("localref:")) {
    const body = String(stored).slice("localref:".length);
    const key = body.split("|")[0];
    return localStorage.getItem(key) || "";
  }
  return "";
}

const state = {
  storageKey: null,
  currentUser: null,
  custom: {
    categories: [],
    types: [],
    permissions: [],
    justificationFields: [],
  },
  approvalRoutes: [...approvalRoutingDefaults],
  requests: [],
  elevatedAccess: [],
  notifications: [],
  auditLogs: [],
};

function useSupabase() {
  return !!getSafeSupabase();
}

function storageKey() {
  return state.storageKey || STORAGE_FALLBACK;
}

function persistLocal() {
  try {
    const persistRequests = canReviewElevatedQueue()
      ? state.requests
      : state.requests.filter((r) => r.email === state.currentUser?.email);
    const persistAccess = canReviewElevatedQueue()
      ? state.elevatedAccess
      : state.elevatedAccess.filter(
          (r) => r.ownerUserKey === state.currentUser?.ownerUserKey || r.applicantName === state.currentUser?.full_name
        );
    const payload = {
      requests: persistRequests,
      elevatedAccess: persistAccess,
      approvalRoutes: state.approvalRoutes,
      custom: state.custom,
      notifications: state.notifications.slice(0, 80),
      auditLogs: state.auditLogs.slice(0, 200),
    };
    localStorage.setItem(storageKey(), JSON.stringify(payload));
  } catch (_) {
    // ignore quota / privacy mode
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (Array.isArray(data.requests)) state.requests = data.requests;
    if (Array.isArray(data.elevatedAccess)) state.elevatedAccess = data.elevatedAccess;
    if (Array.isArray(data.approvalRoutes)) state.approvalRoutes = data.approvalRoutes;
    if (data.custom) {
      state.custom = {
        categories: Array.isArray(data.custom.categories) ? data.custom.categories : [],
        types: Array.isArray(data.custom.types) ? data.custom.types : [],
        permissions: Array.isArray(data.custom.permissions) ? data.custom.permissions : [],
        justificationFields: Array.isArray(data.custom.justificationFields) ? data.custom.justificationFields : [],
      };
    }
    if (Array.isArray(data.notifications)) state.notifications = data.notifications;
    if (Array.isArray(data.auditLogs)) state.auditLogs = data.auditLogs;
    return true;
  } catch (_) {
    return false;
  }
}

function buildCurrentUser(session) {
  const scope = [session.dayosisi, session.jimbo, session.tawi].filter(Boolean).join(" / ");
  return {
    id: session.userId,
    ownerUserKey: String(session.userId ?? session.email ?? "unknown"),
    full_name: session.name || "Mtumiaji",
    email: session.email || "",
    phone: session.phone || "",
    current_roles: [session.currentRole || session.role].filter(Boolean),
    current_scope: scope || "Scope: badilishwa baada ya sync na profile ya server",
    approved: session.role !== "member",
  };
}

export function assertElevatedAccessPage() {
  const session = getSession();
  if (!session) {
    window.location.href = "auth-login.html";
    return null;
  }
  if (session.expiresAt && Date.now() > session.expiresAt) {
    localStorage.removeItem("kmt_session");
    window.location.href = "session-expired.html";
    return null;
  }
  if (session.firstLogin) {
    window.location.href = "auth-change-password.html";
    return null;
  }
  if (session.role === "member") {
    window.location.href = "unauthorized.html";
    return null;
  }
  return session;
}

export function canReviewElevatedQueue() {
  const s = getSession();
  if (!s) return false;
  return ["chief_admin", "super_admin", "national_admin", "admin"].includes(s.role);
}

export async function initElevatedAccessData(session) {
  state.currentUser = buildCurrentUser(session);
  state.storageKey = `kmt_elevated_access_v1_${state.currentUser.email || "anon"}`;
  loadLocal();
  if (!state.requests.length) {
    state.requests.push({
      id: stamp(),
      ownerUserKey: state.currentUser.ownerUserKey,
      applicantName: state.currentUser.full_name,
      email: state.currentUser.email,
      phone: state.currentUser.phone,
      currentRoles: state.currentUser.current_roles.join(", "),
      currentScope: state.currentUser.current_scope,
      requestedRolePermission: "Finance Access",
      requestCategory: "Permission Layers",
      requestedLevel: "Dayosisi",
      requestedUnit: "Dayosisi ya Kagera",
      justification: "Maombi ya mfano ya mfumo (demo) — futa au sasisha baada ya deployment.",
      startDate: "",
      endDate: "",
      notes: "Seed ya kwanza kwa mtumiaji aliyeingia.",
      supportingLetter: "",
      status: "Inasubiri",
      submittedDate: today(),
      reviewedBy: "-",
      expiryDate: "",
      requestType: "Permission Layers",
      temporary: false,
      timeline: [{ status: "Imewasilishwa", at: now(), by: state.currentUser.full_name }],
      archived: false,
    });
    persistLocal();
  }
  await pullFromSupabase(session);
}

function toDbRequest(r) {
  return {
    id: r.id,
    owner_user_key: r.ownerUserKey,
    applicant_name: r.applicantName,
    email: r.email,
    phone: r.phone || "",
    current_roles: r.currentRoles,
    current_scope: r.currentScope,
    request_category: r.requestCategory,
    requested_role_permission: r.requestedRolePermission,
    requested_level: r.requestedLevel,
    requested_unit: r.requestedUnit || "",
    justification: r.justification || "",
    start_date: r.startDate || null,
    end_date: r.endDate || null,
    notes: r.notes || "",
    supporting_letter: r.supportingLetter || "",
    supporting_letter_name: r.supportingLetterName || null,
    status_sw: r.status,
    submitted_at: r.submittedDate && r.submittedDate !== "-" ? `${r.submittedDate}T12:00:00Z` : null,
    reviewed_by: r.reviewedBy === "-" ? null : r.reviewedBy,
    timeline: r.timeline || [],
    archived: !!r.archived,
    updated_at: new Date().toISOString(),
  };
}

function fromDbRequest(d) {
  const sub = d.submitted_at ? String(d.submitted_at).slice(0, 10) : "-";
  return {
    id: d.id,
    ownerUserKey: d.owner_user_key,
    applicantName: d.applicant_name,
    email: d.email,
    phone: d.phone || "",
    currentRoles: d.current_roles || "",
    currentScope: d.current_scope || "",
    requestCategory: d.request_category,
    requestedRolePermission: d.requested_role_permission,
    requestedLevel: d.requested_level,
    requestedUnit: d.requested_unit || "",
    justification: d.justification || "",
    startDate: d.start_date ? String(d.start_date).slice(0, 10) : "",
    endDate: d.end_date ? String(d.end_date).slice(0, 10) : "",
    notes: d.notes || "",
    supportingLetter: d.supporting_letter || "",
    supportingLetterName: d.supporting_letter_name || "",
    status: d.status_sw,
    submittedDate: sub,
    reviewedBy: d.reviewed_by || "-",
    expiryDate: d.end_date ? String(d.end_date).slice(0, 10) : "",
    requestType: d.request_category,
    temporary: Boolean(d.start_date || d.end_date),
    timeline: asArray(d.timeline),
    archived: !!d.archived,
  };
}

function toDbAssignment(a) {
  return {
    id: a.id,
    request_id: a.requestId,
    owner_user_key: a.ownerUserKey || null,
    applicant_name: a.applicantName,
    role_permission: a.rolePermission,
    level: a.level,
    unit: a.unit,
    start_date: a.startDate || null,
    expiry_date: a.expiryDate || null,
    active: a.active,
  };
}

function fromDbAssignment(d) {
  return {
    id: d.id,
    requestId: d.request_id,
    ownerUserKey: d.owner_user_key,
    applicantName: d.applicant_name,
    rolePermission: d.role_permission,
    level: d.level,
    unit: d.unit,
    startDate: d.start_date ? String(d.start_date).slice(0, 10) : "",
    expiryDate: d.expiry_date ? String(d.expiry_date).slice(0, 10) : "",
    active: !!d.active,
    badge: d.role_permission,
  };
}

async function pullFromSupabase(session) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  const admin = canReviewElevatedQueue();
  const result = await safeAsync(
    "phase31_pull_elevated",
    async () => {
      let qb = s.from("elevated_access_requests").select("*");
      if (!admin) qb = qb.eq("email", session.email);
      const { data, error } = await qb.order("updated_at", { ascending: false }).limit(400);
      if (error) throw error;
      return data;
    },
    null
  );
  if (!result?.length) return;
  const mapped = asArray(result).map(fromDbRequest);
  const byId = new Map(state.requests.map((r) => [r.id, r]));
  mapped.forEach((r) => byId.set(r.id, r));
  state.requests = Array.from(byId.values()).sort((a, b) => String(b.submittedDate).localeCompare(String(a.submittedDate)));

  const assigns = await safeAsync(
    "phase31_pull_assignments",
    async () => {
      let qb = s.from("elevated_access_assignments").select("*");
      if (!admin) qb = qb.eq("owner_user_key", String(session.userId));
      const { data, error } = await qb.order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
    null
  );
  if (assigns?.length) {
    state.elevatedAccess = asArray(assigns).map(fromDbAssignment);
  }
  persistLocal();
}

async function pushRequestToSupabase(row) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  await safeAsync("phase31_upsert_request", () => s.from("elevated_access_requests").upsert(toDbRequest(row), { onConflict: "id" }), null);
}

async function pushAssignmentToSupabase(row) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  await safeAsync("phase31_insert_assignment", () => s.from("elevated_access_assignments").upsert(toDbAssignment(row), { onConflict: "id" }), null);
}

function addAudit(action, actor, details) {
  state.auditLogs.unshift({ id: stamp(), action, actor, details, at: now() });
}

function addNotification(title, channel = "In-app", status = "new") {
  state.notifications.unshift({ id: stamp(), title, channel, status, at: now() });
  if (useSupabase()) {
    getSafeSupabase()
      .from("workflow_notifications")
      .insert({ title, notification_type: "ElevatedAccess", channel, status })
      .then(() => {})
      .catch(() => {});
  }
}

export function getCurrentUser() {
  return state.currentUser;
}

export function getRequestCatalog() {
  return {
    categories: requestCategories,
    custom: state.custom,
  };
}

export function addCustomCategory(name) {
  if (!name) return;
  state.custom.categories.push(name);
  persistLocal();
}

export function addCustomType(name) {
  if (!name) return;
  state.custom.types.push(name);
  persistLocal();
}

export function addPermissionLayer(name) {
  if (!name) return;
  state.custom.permissions.push(name);
  persistLocal();
}

export function addCustomJustificationField(name) {
  if (!name) return;
  state.custom.justificationFields.push(name);
  persistLocal();
}

export function getApprovalRoutes() {
  return [...state.approvalRoutes];
}

export function addApprovalStage(requestType, approverRole, moduleRoute) {
  state.approvalRoutes.push({
    requestType: requestType || "Custom Request",
    route: `${approverRole || "Approver"}${moduleRoute ? ` (${moduleRoute})` : ""}`,
  });
  persistLocal();
}

function baseRowFromPayload(payload, status, submittedDate) {
  const u = state.currentUser;
  return {
    id: stamp(),
    ownerUserKey: u.ownerUserKey,
    applicantName: payload.applicantName || u.full_name,
    email: payload.email || u.email,
    phone: payload.phone || u.phone,
    currentRoles: payload.currentRoles || u.current_roles.join(", "),
    currentScope: payload.currentScope || u.current_scope,
    requestedRolePermission: payload.requestedRolePermission,
    requestCategory: payload.requestCategory,
    requestedLevel: payload.requestedLevel,
    requestedUnit: payload.requestedUnit || "",
    justification: payload.justification || "",
    startDate: payload.startDate || "",
    endDate: payload.endDate || "",
    notes: payload.notes || "",
    supportingLetter: payload.supportingLetter || "",
    supportingLetterName: payload.supportingLetterName || "",
    status,
    submittedDate,
    reviewedBy: "-",
    expiryDate: payload.endDate || "",
    requestType: payload.requestCategory || "Other",
    temporary: Boolean(payload.startDate || payload.endDate),
    timeline: [],
    archived: false,
  };
}

export async function saveDraft(payload) {
  const row = baseRowFromPayload(payload, "Rasimu", "-");
  row.timeline = [{ status: "Rasimu", at: now(), by: state.currentUser.full_name }];
  state.requests.unshift(row);
  addAudit("Draft saved", state.currentUser.full_name, row.id);
  addNotification(`Draft saved: ${row.id}`);
  persistLocal();
  await pushRequestToSupabase(row);
  return row;
}

export async function submitRequest(payload) {
  const row = baseRowFromPayload(payload, "Inasubiri", today());
  row.timeline = [
    { status: "Imewasilishwa", at: now(), by: state.currentUser.full_name },
    { status: "Inasubiri", at: now(), by: "System Router" },
  ];
  state.requests.unshift(row);
  addAudit("Request submitted", state.currentUser.full_name, row.id);
  addNotification(`Request submitted: ${row.id}`);
  persistLocal();
  await pushRequestToSupabase(row);
  return row;
}

export async function resubmitRequest(requestId, payload) {
  const row = state.requests.find((x) => x.id === requestId);
  if (!row || row.email !== state.currentUser.email) return null;
  if (row.status !== "Inahitaji Marekebisho") return null;
  Object.assign(row, {
    requestedRolePermission: payload.requestedRolePermission,
    requestCategory: payload.requestCategory,
    requestedLevel: payload.requestedLevel,
    requestedUnit: payload.requestedUnit || "",
    justification: payload.justification || row.justification,
    startDate: payload.startDate || "",
    endDate: payload.endDate || "",
    notes: payload.notes || row.notes,
    supportingLetter: payload.supportingLetter || row.supportingLetter,
    supportingLetterName: payload.supportingLetterName || row.supportingLetterName || "",
    status: "Inasubiri",
    submittedDate: today(),
    reviewedBy: "-",
    expiryDate: payload.endDate || "",
    temporary: Boolean(payload.startDate || payload.endDate),
  });
  row.timeline.unshift({ status: "Imewasilishwa Tena", at: now(), by: state.currentUser.full_name });
  addAudit("Resubmitted", state.currentUser.full_name, requestId);
  addNotification(`Request resubmitted: ${requestId}`);
  persistLocal();
  await pushRequestToSupabase(row);
  return row;
}

function applyApprovedAccess(request, reviewer) {
  const access = {
    id: stamp(),
    requestId: request.id,
    ownerUserKey: request.ownerUserKey,
    applicantName: request.applicantName,
    rolePermission: request.requestedRolePermission,
    level: request.requestedLevel,
    unit: request.requestedUnit || "-",
    startDate: request.startDate || today(),
    expiryDate: request.endDate || "",
    active: true,
    badge: request.requestedRolePermission,
  };
  state.elevatedAccess = state.elevatedAccess.filter((x) => !(x.requestId === request.id && x.rolePermission === request.requestedRolePermission));
  state.elevatedAccess.unshift(access);
  request.status = "Imekamilika";
  request.reviewedBy = reviewer;
  request.timeline.unshift({ status: "Imekamilika", at: now(), by: "Automation Engine" });
  addAudit("Permission assigned", "Automation Engine", `${request.id} -> ${request.requestedRolePermission}`);
  addNotification(`Role/permission updated: ${request.requestedRolePermission}`);
  pushAssignmentToSupabase(access);
}

export async function updateRequestStatus(requestId, status, reviewer = "Super Admin", comment = "") {
  const row = state.requests.find((x) => x.id === requestId);
  if (!row) return null;
  row.status = status;
  row.reviewedBy = reviewer;
  row.timeline.unshift({ status, at: now(), by: reviewer });
  if (comment) row.notes = `${row.notes || ""} | ${comment}`.trim();

  addAudit(`Request ${status}`, reviewer, requestId);
  addNotification(`Request ${requestId}: ${status}`);

  if (status === "Imeidhinishwa") {
    applyApprovedAccess(row, reviewer);
  }
  if (status === "Imehifadhiwa") {
    row.archived = true;
  }
  persistLocal();
  await pushRequestToSupabase(row);
  return row;
}

export function runExpiryCheck() {
  const todayValue = new Date(today()).getTime();
  const expired = [];
  state.elevatedAccess.forEach((row) => {
    if (!row.expiryDate || !row.active) return;
    const exp = new Date(row.expiryDate).getTime();
    if (Number.isNaN(exp)) return;
    if (exp <= todayValue) {
      row.active = false;
      expired.push(row);
      addAudit("Temporary access expired", "Scheduler", row.requestId);
      addNotification(`Temporary access expired: ${row.rolePermission}`);
    }
  });
  if (expired.length) {
    persistLocal();
    const s = getSafeSupabase();
    if (s) {
      expired.forEach((row) => {
        safeAsync("phase31_expire_assignment", () => s.from("elevated_access_assignments").update({ active: false }).eq("id", row.id), null);
      });
    }
  }
}

export function getRequestsByOwner() {
  return state.requests.filter((x) => x.email === state.currentUser.email);
}

export function getAdminReviewQueue() {
  return state.requests.filter((x) =>
    ["Imewasilishwa", "Inasubiri", "Inakaguliwa", "Inahitaji Marekebisho"].includes(x.status)
  );
}

export function getApprovedAccess() {
  const all = [...state.elevatedAccess];
  if (canReviewElevatedQueue()) return all;
  return all.filter(
    (x) => x.ownerUserKey === state.currentUser.ownerUserKey || x.applicantName === state.currentUser.full_name
  );
}

export function getRequestById(id) {
  return state.requests.find((x) => x.id === id) || null;
}

export function getProfileSummary() {
  const mine = getRequestsByOwner();
  return {
    currentRoles: state.currentUser.current_roles,
    permissionLayers: state.currentUser.current_roles,
    temporaryAccesses: state.elevatedAccess.filter(
      (x) => x.applicantName === state.currentUser.full_name && x.expiryDate && x.active
    ),
    pending: mine.filter((x) => ["Inasubiri", "Inakaguliwa", "Inahitaji Marekebisho"].includes(x.status)),
    previous: mine.filter((x) => ["Imekamilika", "Imekataliwa", "Imehifadhiwa"].includes(x.status)),
    history: mine.flatMap((x) => (x.timeline || []).map((t) => ({ requestId: x.id, ...t }))),
  };
}

export function getNotifications() {
  return [...state.notifications];
}

export function getAuditLogs() {
  return [...state.auditLogs];
}
