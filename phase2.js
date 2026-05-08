const ROLES = [
  "chief_admin",
  "super_admin",
  "admin",
  "national_admin",
  "diocese_user",
  "jimbo_user",
  "branch_user",
  "viewer",
  "askofu_mkuu",
  "askofu_dayosisi",
  "mchungaji",
  "kiongozi_idara",
  "finance_officer",
  "media_admin",
  "member",
];

const permissionsByRole = {
  chief_admin: ["dashboard", "user_access", "reports", "finance", "media", "settings", "super_admin_register"],
  super_admin: ["dashboard", "user_access", "reports", "finance", "media", "settings"],
  admin: ["dashboard", "user_access", "reports", "media"],
  national_admin: ["dashboard", "user_access", "reports", "media"],
  diocese_user: ["dashboard", "reports"],
  jimbo_user: ["dashboard"],
  branch_user: ["dashboard"],
  viewer: ["dashboard"],
  askofu_mkuu: ["dashboard", "reports", "media"],
  askofu_dayosisi: ["dashboard", "reports"],
  mchungaji: ["dashboard", "members"],
  kiongozi_idara: ["dashboard", "department"],
  finance_officer: ["dashboard", "finance"],
  media_admin: ["dashboard", "media"],
  member: ["dashboard"],
};

const sidebarItems = [
  { key: "dashboard", label: "Dashibodi / Dashboard" },
  { key: "user_access", label: "Watumiaji wa Mfumo" },
  { key: "reports", label: "Taarifa / Reports" },
  { key: "finance", label: "Michango / Finance" },
  { key: "media", label: "Mahubiri & Media" },
  { key: "department", label: "Idara na Huduma" },
  { key: "members", label: "Waumini" },
  { key: "settings", label: "Mipangilio / Settings" },
];

const mockUsers = [
  { id: 1, fullName: "Mch. Daniel Msangi", email: "daniel@kmkt.or.tz", phone: "0712345678", role: "super_admin", availableRoles: ["super_admin", "viewer"], dayosisi: "Dar es Salaam", jimbo: "Kati", tawi: "Amani", status: "active", lastLogin: "2026-04-26 17:20" },
  { id: 2, fullName: "Askofu Rehema Mtei", email: "rehema@kmkt.or.tz", phone: "0756781234", role: "askofu_dayosisi", availableRoles: ["askofu_dayosisi", "diocese_user"], dayosisi: "Mwanza", jimbo: "Ziwa", tawi: "Tumaini", status: "active", lastLogin: "2026-04-26 11:45" },
  { id: 3, fullName: "Anna John", email: "anna@kmkt.or.tz", phone: "0765432198", role: "media_admin", availableRoles: ["media_admin"], dayosisi: "Arusha", jimbo: "Kaskazini", tawi: "Neema", status: "inactive", lastLogin: "2026-04-20 08:10" },
  { id: 4, fullName: "Peter Luka", email: "peter@kmkt.or.tz", phone: "0624683622", role: "member", availableRoles: ["member"], dayosisi: "Dar es Salaam", jimbo: "Mashariki", tawi: "Uhuru", status: "active", lastLogin: "2026-04-25 19:33" },
];

const CHIEF_ADMIN = {
  fullName: "ENOCK FUGO",
  email: "fugomadata0@gmail.com",
  phone: "+255700111000",
  initialPassword: "2026",
  role: "chief_admin",
};

const AUTH_KEYS = {
  session: "kmt_session",
  lock: "kmt_auth_lock",
  authAudit: "kmt_auth_audit_logs",
  roleSwitchDraft: "kmt_role_switch_draft",
  superAdminSlots: "kmt_super_admin_slots",
  superAdminRequests: "kmt_super_admin_requests",
  authSettings: "kmt_auth_settings",
};

function getAuthSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(AUTH_KEYS.authSettings) || "{}");
    const sessionTimeoutMin = Math.max(5, Number(data.sessionTimeoutMin || 60));
    const maxFailedAttempts = Math.max(3, Number(data.maxFailedAttempts || 10));
    const lockMinutes = Math.max(1, Number(data.lockMinutes || 1));
    return {
      sessionTimeoutMin,
      maxFailedAttempts,
      lockMinutes,
      superAdminRegistrationEnabled: Boolean(data.superAdminRegistrationEnabled),
      superAdminApprovalMode: data.superAdminApprovalMode || "chief_admin_only",
      releaseSlotNeedsApproval: Boolean(data.releaseSlotNeedsApproval),
    };
  } catch (_) {
    return {
      sessionTimeoutMin: 60,
      maxFailedAttempts: 10,
      lockMinutes: 1,
      superAdminRegistrationEnabled: false,
      superAdminApprovalMode: "chief_admin_only",
      releaseSlotNeedsApproval: false,
    };
  }
}

function getSupabaseClient() {
  if (!window.KMT_SUPABASE_CONFIG?.enabled || !window.supabase?.createClient) return null;
  const { url, anonKey } = window.KMT_SUPABASE_CONFIG;
  if (!url || !anonKey) return null;
  return window.supabase.createClient(url, anonKey);
}

const roleRedirect = {
  chief_admin: "access-control-workflow.html",
  super_admin: "access-control-workflow.html",
  admin: "dashboard.html",
  national_admin: "dashboard.html",
  diocese_user: "dashboard.html",
  jimbo_user: "dashboard.html",
  branch_user: "dashboard.html",
  viewer: "portal.html",
  askofu_mkuu: "dashboard.html",
  askofu_dayosisi: "dashboard.html",
  mchungaji: "dashboard.html",
  kiongozi_idara: "dashboard.html",
  finance_officer: "finance-management.html",
  media_admin: "sermons-media.html",
  member: "dashboard.html",
};

/** ?next=dashboard.html — relative .html tu, hakuna URL za nje */
function getSafeNextPathFromSearch() {
  try {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (!next || typeof next !== "string") return null;
    const trimmed = next.trim();
    if (/^(https?:)?\/\//i.test(trimmed)) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
    if (trimmed.includes("..") || trimmed.includes("\\")) return null;
    const safe = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
    if (!safe || safe.includes("/")) return null;
    if (!/^[a-zA-Z0-9._-]+\.html$/i.test(safe)) return null;
    return safe;
  } catch (_) {
    return null;
  }
}

function getPostLoginRedirect(role) {
  const next = getSafeNextPathFromSearch();
  if (next) return next;
  return roleRedirect[role] || "dashboard.html";
}

function authAudit(action, detail = {}) {
  try {
    const key = AUTH_KEYS.authAudit;
    const logs = JSON.parse(localStorage.getItem(key) || "[]");
    logs.unshift({
      id: Date.now(),
      action,
      at: new Date().toISOString(),
      detail,
    });
    localStorage.setItem(key, JSON.stringify(logs.slice(0, 200)));
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from("auth_activity_logs").insert({
        action,
        detail,
        created_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {});
    }
  } catch (error) {
    // ignore
  }
}

function getAuthLock() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEYS.lock) || "{}");
  } catch (error) {
    return {};
  }
}
function setAuthLock(data) {
  localStorage.setItem(AUTH_KEYS.lock, JSON.stringify(data));
}

function resetIdentifierLock(lock, identifier) {
  const updated = { ...lock };
  delete updated[identifier];
  setAuthLock(updated);
  return updated;
}

function registerFailedAttempt(lock, identifier, settings) {
  const attempts = (lock[identifier]?.attempts || 0) + 1;
  const updated = { ...lock, [identifier]: { attempts } };
  if (attempts >= settings.maxFailedAttempts) {
    updated[identifier].until = Date.now() + 1000 * 60 * settings.lockMinutes;
  }
  setAuthLock(updated);
  const remaining = Math.max(0, settings.maxFailedAttempts - attempts);
  return { attempts, remaining };
}

function scorePassword(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

function labelPassword(score) {
  if (score <= 1) return "Weak";
  if (score === 2) return "Medium";
  if (score === 3) return "Strong";
  return "Very Strong";
}

function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(AUTH_KEYS.session, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(AUTH_KEYS.session);
}

function hasPermission(role, permission) {
  return (permissionsByRole[role] || []).includes(permission);
}

function requireSession() {
  const session = getSession();
  if (!session) {
    window.location.href = "session-expired.html";
    return false;
  }
  if (session.expiresAt && Date.now() > session.expiresAt) {
    clearSession();
    authAudit("session_expired", { user: session.email || "-" });
    window.location.href = "session-expired.html";
    return false;
  }
  return true;
}

function findUserByIdentifier(identifier) {
  const id = String(identifier || "").toLowerCase();
  return mockUsers.find((u) => String(u.email || "").toLowerCase() === id || String(u.phone || "").toLowerCase() === id);
}

function getSuperAdminSlots() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_KEYS.superAdminSlots) || "[]");
    if (Array.isArray(stored) && stored.length === 4) return stored;
  } catch (_) {}
  const seeded = [
    { slot: 1, occupied: true, name: CHIEF_ADMIN.fullName, email: CHIEF_ADMIN.email, status: "Permanent", registeredAt: "2026-01-01" },
    { slot: 2, occupied: false, name: "", email: "", status: "Available", registeredAt: "" },
    { slot: 3, occupied: false, name: "", email: "", status: "Available", registeredAt: "" },
    { slot: 4, occupied: false, name: "", email: "", status: "Available", registeredAt: "" },
  ];
  localStorage.setItem(AUTH_KEYS.superAdminSlots, JSON.stringify(seeded));
  return seeded;
}

function saveSuperAdminSlots(slots) {
  localStorage.setItem(AUTH_KEYS.superAdminSlots, JSON.stringify(slots));
}

function promptRoleSwitch(sessionDraft) {
  const modal = document.getElementById("roleSwitchModal");
  const optionsWrap = document.getElementById("roleSwitchOptions");
  const continueBtn = document.getElementById("roleSwitchContinueBtn");
  if (!modal || !optionsWrap || !continueBtn) return false;
  optionsWrap.innerHTML = (sessionDraft.availableRoles || [])
    .map((r, i) => `<label class="role-option"><input type="radio" name="roleSwitch" value="${r}" ${i === 0 ? "checked" : ""} /> ${r}</label>`)
    .join("");
  modal.classList.add("open");
  continueBtn.onclick = () => {
    const selected = optionsWrap.querySelector("input[name='roleSwitch']:checked");
    const role = selected ? selected.value : sessionDraft.role;
    const session = { ...sessionDraft, role, currentRole: role };
    setSession(session);
    localStorage.removeItem(AUTH_KEYS.roleSwitchDraft);
    authAudit("role_switch", { role });
    window.location.href = getPostLoginRedirect(role);
  };
  return true;
}

function openChiefOnboardingModal(onContinue) {
  const modal = document.getElementById("chiefOnboardingModal");
  const continueBtn = document.getElementById("chiefOnboardingContinueBtn");
  if (!modal || !continueBtn) return false;
  modal.classList.add("open");
  continueBtn.onclick = () => {
    modal.classList.remove("open");
    if (typeof onContinue === "function") onContinue();
  };
  return true;
}

function requirePermission(permission) {
  const session = getSession();
  if (!session || !hasPermission(session.role, permission)) {
    window.location.href = "unauthorized.html";
    return false;
  }
  return true;
}

function requireRoles(allowedRoles = []) {
  const session = getSession();
  if (!session) {
    window.location.href = "session-expired.html";
    return false;
  }
  if (!allowedRoles.includes(session.role)) {
    window.location.href = "unauthorized.html";
    return false;
  }
  return true;
}

async function initLogin() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;
  const statusAlert = document.getElementById("authStatusAlert");
  const submitBtn = document.getElementById("loginSubmitBtn");
  const sessionExpiredBanner = document.getElementById("sessionExpiredBanner");
  if (sessionExpiredBanner && document.referrer.includes("session-expired.html")) sessionExpiredBanner.style.display = "block";

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(loginForm);
    const identifier = String(fd.get("identifier") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    const remember = fd.get("remember") === "on";
    const settings = getAuthSettings();
    const lock = getAuthLock();
    const lockRow = lock[identifier] || {};
    if (lockRow.until && Date.now() >= lockRow.until) {
      resetIdentifierLock(lock, identifier);
    }
    if (lockRow.until && Date.now() < lockRow.until) {
      const sec = Math.ceil((lockRow.until - Date.now()) / 1000);
      if (statusAlert) statusAlert.textContent = `Account imefungwa kwa muda. Jaribu tena baada ya sekunde ${sec}.`;
      authAudit("failed_login_locked", { identifier });
      return;
    }
    if (submitBtn) submitBtn.textContent = "Ingia... Tafadhali subiri";

    let role = "admin";
    let name = "Mock User";
    let email = "user@kmkt.or.tz";
    let firstLogin = false;
    let availableRoles = ["admin"];
    let sessionUserId = Date.now();

    const isChief = identifier === CHIEF_ADMIN.email.toLowerCase() && password === CHIEF_ADMIN.initialPassword;
    const supabase = getSupabaseClient();
    if (supabase && !isChief) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: identifier, password });
      if (error || !data?.user) {
        const { attempts, remaining } = registerFailedAttempt(lock, identifier, settings);
        if (statusAlert) {
          statusAlert.textContent =
            attempts >= settings.maxFailedAttempts
              ? `Akaunti imefungwa kwa dakika ${settings.lockMinutes} kutokana na majaribio mengi mabaya.`
              : `Invalid credentials. Jaribio limekataliwa. Umebakiza majaribio ${remaining}.`;
        }
        if (submitBtn) submitBtn.textContent = "Ingia kwenye Mfumo";
        authAudit("failed_login", { identifier, attempts });
        return;
      }
      const found = findUserByIdentifier(identifier);
      role = found?.role || "member";
      availableRoles = found?.availableRoles || [role];
      name = found?.fullName || data.user.user_metadata?.full_name || "Auth User";
      email = data.user.email || identifier;
      sessionUserId = data.user.id;
      firstLogin = !!data.user.user_metadata?.must_change_password;
    } else if (isChief) {
      role = CHIEF_ADMIN.role;
      name = CHIEF_ADMIN.fullName;
      email = CHIEF_ADMIN.email;
      firstLogin = true;
      availableRoles = [role];
      sessionUserId = 1;
    } else if (!identifier || !password || password.length < 4) {
      const { attempts, remaining } = registerFailedAttempt(lock, identifier, settings);
      if (statusAlert) {
        statusAlert.textContent =
          attempts >= settings.maxFailedAttempts
            ? `Akaunti imefungwa kwa dakika ${settings.lockMinutes} kutokana na majaribio mengi mabaya.`
            : `Invalid credentials. Jaribio limekataliwa. Umebakiza majaribio ${remaining}.`;
      }
      if (submitBtn) submitBtn.textContent = "Ingia kwenye Mfumo";
      authAudit("failed_login", { identifier, attempts });
      return;
    } else {
      const found = findUserByIdentifier(identifier);
      if (found?.status === "inactive") {
        if (statusAlert) statusAlert.textContent = "Akaunti imefungwa kwa muda. Wasiliana na msimamizi.";
        if (submitBtn) submitBtn.textContent = "Ingia kwenye Mfumo";
        authAudit("failed_login_locked", { identifier, reason: "inactive_account" });
        return;
      }
      role = found?.role || "admin";
      availableRoles = found?.availableRoles || [role];
      name = found?.fullName || "Mock User";
      email = found?.email || identifier || "user@kmkt.or.tz";
      sessionUserId = found?.id || Date.now();
      setAuthLock({ ...lock, [identifier]: { attempts: 0 } });
    }

    const timeoutMinutes = remember ? settings.sessionTimeoutMin * 24 : settings.sessionTimeoutMin;
    const foundForSession = findUserByIdentifier(identifier);
    setSession({
      userId: sessionUserId,
      name,
      role,
      email,
      phone: foundForSession?.phone || (isChief ? CHIEF_ADMIN.phone : ""),
      dayosisi: foundForSession?.dayosisi,
      jimbo: foundForSession?.jimbo,
      tawi: foundForSession?.tawi,
      availableRoles,
      currentRole: role,
      firstLogin,
      expiresAt: Date.now() + 1000 * 60 * timeoutMinutes,
    });
    authAudit("login", { identifier, role });
    if (firstLogin) {
      authAudit("chief_admin_first_login", { email });
      if (!openChiefOnboardingModal(() => {
        window.location.href = "auth-change-password.html";
      })) {
        window.location.href = "auth-change-password.html";
      }
      return;
    }
    const sessionDraft = getSession();
    if ((sessionDraft?.availableRoles || []).length > 1) {
      localStorage.setItem(AUTH_KEYS.roleSwitchDraft, JSON.stringify(sessionDraft));
      if (promptRoleSwitch(sessionDraft)) return;
    }
    window.location.href = getPostLoginRedirect(role);
  });

  const draftRaw = localStorage.getItem(AUTH_KEYS.roleSwitchDraft);
  if (draftRaw) {
    try {
      const draft = JSON.parse(draftRaw);
      promptRoleSwitch(draft);
    } catch (_) {
      localStorage.removeItem(AUTH_KEYS.roleSwitchDraft);
    }
  }
}

function initRegister() {
  const registerForm = document.getElementById("registerForm");
  if (!registerForm) return;
  const passInput = document.getElementById("registerPassword");
  const strengthText = document.getElementById("passwordStrengthText");
  passInput?.addEventListener("input", () => {
    const score = scorePassword(passInput.value);
    if (strengthText) strengthText.textContent = `Password strength: ${labelPassword(score)}`;
  });
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const fd = new FormData(registerForm);
    if (fd.get("password") !== fd.get("confirm_password")) return;
    authAudit("registration", { email: fd.get("email"), phone: fd.get("phone") });
    window.location.href = "auth-login.html";
  });
}

function initForgot() {
  const forgotForm = document.getElementById("forgotForm");
  if (!forgotForm) return;
  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(forgotForm);
    const email = String(fd.get("email") || "");
    const supabase = getSupabaseClient();
    if (supabase && email) {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth-reset-password.html`,
      });
    }
    authAudit("password_reset_request", { email });
    window.location.href = "auth-reset-password.html";
  });
}

function initReset() {
  const resetForm = document.getElementById("resetForm");
  if (!resetForm) return;
  const passInput = document.getElementById("resetPassword");
  const strengthText = document.getElementById("resetStrengthText");
  passInput?.addEventListener("input", () => {
    const score = scorePassword(passInput.value);
    if (strengthText) strengthText.textContent = `Password strength: ${labelPassword(score)}`;
  });
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(resetForm);
    if (fd.get("password") !== fd.get("confirm_password")) return;
    if (scorePassword(String(fd.get("password") || "")) < 3) return;
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.updateUser({ password: String(fd.get("password") || "") });
    authAudit("password_changed", { flow: "reset" });
    window.location.href = "auth-login.html";
  });
}

function initChangePassword() {
  const form = document.getElementById("changePasswordForm");
  if (!form) return;
  const passInput = document.getElementById("changeNewPassword");
  const strengthText = document.getElementById("changeStrengthText");
  passInput?.addEventListener("input", () => {
    const score = scorePassword(passInput.value);
    if (strengthText) strengthText.textContent = `Password strength: ${labelPassword(score)}`;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    if (fd.get("new_password") !== fd.get("confirm_password")) return;
    if (scorePassword(String(fd.get("new_password") || "")) < 3) return;
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.updateUser({ password: String(fd.get("new_password") || "") });
    const session = getSession();
    if (session) {
      session.firstLogin = false;
      setSession(session);
    }
    authAudit("password_changed", { flow: "first_login_change" });
    window.location.href = roleRedirect[session?.role || "admin"] || "dashboard.html";
  });
}

function initPasswordToggle() {
  document.body.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.getAttribute("data-toggle-password");
    if (!id) return;
    const input = document.getElementById(id);
    if (!(input instanceof HTMLInputElement)) return;
    input.type = input.type === "password" ? "text" : "password";
    target.textContent = input.type === "password" ? "Show" : "Hide";
  });
}

function renderSidebar(session) {
  const sidebarMenu = document.getElementById("sidebarMenu");
  if (!sidebarMenu) return;
  const items = sidebarItems.filter((item) => hasPermission(session.role, item.key));
  sidebarMenu.innerHTML = items.map((item) => `<a class="side-link" href="#" data-key="${item.key}">${item.label}</a>`).join("");
}

function initPortal() {
  const roleBadge = document.getElementById("roleBadge");
  if (!roleBadge) return;

  if (!requireSession() || !requirePermission("user_access")) return;
  const session = getSession();
  roleBadge.textContent = `Role: ${session.role}`;
  renderSidebar(session);

  const logoutBtn = document.getElementById("logoutBtn");
  const switchRoleBtn = document.getElementById("switchRoleBtn");
  logoutBtn?.addEventListener("click", () => {
    const ok = window.confirm("Una uhakika unataka kutoka kwenye mfumo?");
    if (!ok) return;
    authAudit("logout", { email: session.email });
    clearSession();
    window.location.href = "auth-login.html";
  });
  switchRoleBtn?.addEventListener("click", () => {
    const live = getSession();
    if (!live || !Array.isArray(live.availableRoles) || live.availableRoles.length < 2) return;
    promptRoleSwitch(live);
  });

  let rows = [...mockUsers];
  let currentPage = 1;
  const perPage = 3;
  let loading = true;

  const searchInput = document.getElementById("searchInput");
  const roleFilter = document.getElementById("roleFilter");
  const statusFilter = document.getElementById("statusFilter");
  const userTableBody = document.getElementById("userTableBody");
  const paginationInfo = document.getElementById("paginationInfo");

  const modalWrap = document.getElementById("modalWrap");
  const modalTitle = document.getElementById("modalTitle");
  const modalForm = document.getElementById("modalForm");
  const saveModalBtn = document.getElementById("saveModalBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const drawerWrap = document.getElementById("drawerWrap");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerContent = document.getElementById("drawerContent");

  let modalMode = "add";
  let selectedUserId = null;

  function filteredRows() {
    const q = (searchInput?.value || "").toLowerCase();
    const rf = roleFilter?.value || "";
    const sf = statusFilter?.value || "";
    return rows.filter((row) => {
      const qMatch =
        !q ||
        row.fullName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.dayosisi.toLowerCase().includes(q);
      const rMatch = !rf || row.role === rf;
      const sMatch = !sf || row.status === sf;
      return qMatch && rMatch && sMatch;
    });
  }

  function rowActions(user) {
    return `
      <div class="table-actions">
        <button class="btn secondary" data-action="view" data-id="${user.id}">View</button>
        <button class="btn secondary" data-action="edit" data-id="${user.id}">Edit</button>
        <button class="btn secondary" data-action="assign" data-id="${user.id}">Assign Role</button>
        <button class="btn secondary" data-action="activate" data-id="${user.id}">Activate</button>
        <button class="btn secondary" data-action="deactivate" data-id="${user.id}">Deactivate</button>
        <button class="btn secondary" data-action="reset" data-id="${user.id}">Reset Password</button>
        <button class="btn danger" data-action="delete" data-id="${user.id}">Delete</button>
      </div>
    `;
  }

  function renderTable() {
    if (loading) {
      userTableBody.innerHTML = `<tr><td colspan="10" class="state-row">Loading data... Tafadhali subiri.</td></tr>`;
      paginationInfo.textContent = "Inapakia...";
      return;
    }

    const list = filteredRows();
    if (!list.length) {
      userTableBody.innerHTML = `<tr><td colspan="10" class="state-row">Hakuna data. Bonyeza Add User kuanza.</td></tr>`;
      paginationInfo.textContent = "0 records";
      return;
    }

    const pages = Math.max(1, Math.ceil(list.length / perPage));
    if (currentPage > pages) currentPage = pages;
    const start = (currentPage - 1) * perPage;
    const data = list.slice(start, start + perPage);

    userTableBody.innerHTML = data
      .map(
        (row) => `
      <tr>
        <td>${row.fullName}</td>
        <td>${row.email}</td>
        <td>${row.phone}</td>
        <td><span class="badge">${row.role}</span></td>
        <td>${row.dayosisi}</td>
        <td>${row.jimbo}</td>
        <td>${row.tawi}</td>
        <td><span class="status ${row.status}">${row.status}</span></td>
        <td>${row.lastLogin}</td>
        <td>${rowActions(row)}</td>
      </tr>
    `
      )
      .join("");
    paginationInfo.textContent = `Page ${currentPage}/${pages} | Total ${list.length}`;
  }

  function openModal(mode, user) {
    modalMode = mode;
    selectedUserId = user ? user.id : null;
    modalTitle.textContent =
      mode === "add"
        ? "Add User"
        : mode === "edit"
        ? "Edit User"
        : "Assign Role";

    modalForm.innerHTML = `
      <input name="fullName" placeholder="Jina Kamili" value="${user?.fullName || ""}" ${mode === "assign" ? "disabled" : ""} />
      <input name="email" placeholder="Email" value="${user?.email || ""}" ${mode === "assign" ? "disabled" : ""} />
      <input name="phone" placeholder="Simu" value="${user?.phone || ""}" ${mode === "assign" ? "disabled" : ""} />
      <input name="dayosisi" placeholder="Dayosisi" value="${user?.dayosisi || ""}" ${mode === "assign" ? "disabled" : ""} />
      <input name="jimbo" placeholder="Jimbo" value="${user?.jimbo || ""}" ${mode === "assign" ? "disabled" : ""} />
      <input name="tawi" placeholder="Tawi" value="${user?.tawi || ""}" ${mode === "assign" ? "disabled" : ""} />
      <select name="role">${ROLES.map((r) => `<option ${user?.role === r ? "selected" : ""}>${r}</option>`).join("")}</select>
      <select name="status" ${mode === "assign" ? "disabled" : ""}>
        <option ${user?.status === "active" ? "selected" : ""}>active</option>
        <option ${user?.status === "inactive" ? "selected" : ""}>inactive</option>
      </select>
    `;
    modalWrap.classList.add("open");
  }

  function openDrawer(user) {
    drawerTitle.textContent = "View User Details";
    drawerContent.innerHTML = `
      <p><strong>Jina:</strong> ${user.fullName}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Simu:</strong> ${user.phone}</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p><strong>Dayosisi:</strong> ${user.dayosisi}</p>
      <p><strong>Jimbo:</strong> ${user.jimbo}</p>
      <p><strong>Tawi:</strong> ${user.tawi}</p>
      <p><strong>Status:</strong> ${user.status}</p>
      <p><strong>Last Login:</strong> ${user.lastLogin}</p>
    `;
    drawerWrap.classList.add("open");
  }

  function saveModal() {
    const fd = new FormData(modalForm);
    const payload = {
      fullName: fd.get("fullName") || "",
      email: fd.get("email") || "",
      phone: fd.get("phone") || "",
      dayosisi: fd.get("dayosisi") || "",
      jimbo: fd.get("jimbo") || "",
      tawi: fd.get("tawi") || "",
      role: fd.get("role") || "member",
      status: fd.get("status") || "active",
      lastLogin: "Never",
    };
    if (modalMode === "add") {
      rows.unshift({ id: Date.now(), ...payload });
    } else {
      rows = rows.map((row) => (row.id === selectedUserId ? { ...row, ...payload } : row));
    }
    modalWrap.classList.remove("open");
    renderTable();
  }

  function handleAction(action, userId) {
    const user = rows.find((r) => r.id === userId);
    if (!user) return;
    if (action === "view") openDrawer(user);
    if (action === "edit") openModal("edit", user);
    if (action === "assign") openModal("assign", user);
    if (action === "delete") rows = rows.filter((r) => r.id !== userId);
    if (action === "activate") user.status = "active";
    if (action === "deactivate") user.status = "inactive";
    if (action === "reset") user.lastLogin = "Password reset sent";
    renderTable();
  }

  setTimeout(() => {
    loading = false;
    renderTable();
  }, 900);

  searchInput?.addEventListener("input", () => {
    currentPage = 1;
    renderTable();
  });
  roleFilter?.addEventListener("change", () => {
    currentPage = 1;
    renderTable();
  });
  statusFilter?.addEventListener("change", () => {
    currentPage = 1;
    renderTable();
  });

  document.getElementById("prevPage")?.addEventListener("click", () => {
    currentPage = Math.max(1, currentPage - 1);
    renderTable();
  });
  document.getElementById("nextPage")?.addEventListener("click", () => {
    currentPage += 1;
    renderTable();
  });

  document.getElementById("addUserBtn")?.addEventListener("click", () => openModal("add"));
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    searchInput.value = "";
    roleFilter.value = "";
    statusFilter.value = "";
    renderTable();
  });
  document.getElementById("exportBtn")?.addEventListener("click", () => {
    const data = filteredRows();
    const csv = ["Jina,Email,Simu,Role,Dayosisi,Jimbo,Tawi,Status,Last Login"]
      .concat(data.map((r) => `${r.fullName},${r.email},${r.phone},${r.role},${r.dayosisi},${r.jimbo},${r.tawi},${r.status},${r.lastLogin}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kmkt-users-export.csv";
    a.click();
  });

  userTableBody?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-action");
    const id = Number(target.getAttribute("data-id"));
    if (action && id) handleAction(action, id);
  });

  saveModalBtn?.addEventListener("click", saveModal);
  closeModalBtn?.addEventListener("click", () => modalWrap.classList.remove("open"));
  document.getElementById("closeDrawerBtn")?.addEventListener("click", () => drawerWrap.classList.remove("open"));
}

function initSuperAdminRegistration() {
  const form = document.getElementById("superAdminRegistrationForm");
  if (!form) return;
  const guardBanner = document.getElementById("superAdminGuardBanner");
  if (!requireRoles(["chief_admin", "super_admin"])) {
    if (guardBanner) {
      guardBanner.style.display = "block";
      guardBanner.textContent = "Access denied: Eneo hili ni kwa Chief Admin au Super Admin pekee.";
    }
    return;
  }
  const slotsWrap = document.getElementById("slotCardsWrap");
  const statusEl = document.getElementById("superAdminRegisterStatus");
  const approvalModeEl = document.getElementById("approvalMode");
  const settings = getAuthSettings();
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("invite");
  const allowed = settings.superAdminRegistrationEnabled || !!inviteToken;
  if (!allowed) {
    if (statusEl) statusEl.textContent = "Usajili wa Super Admin umefungwa. Wasiliana na Chief Admin.";
    form.querySelectorAll("input,select,button").forEach((el) => (el.disabled = true));
    return;
  }
  if (approvalModeEl) approvalModeEl.value = settings.superAdminApprovalMode;
  const slots = getSuperAdminSlots();
  if (slotsWrap) {
    slotsWrap.innerHTML = slots
      .map(
        (s) => `<article class="slot-card">
      <h4>Slot ${s.slot}</h4>
      <p>Status: ${s.occupied ? "Occupied" : "Available"}</p>
      <p>Name: ${s.name || "-"}</p>
      <p>Date: ${s.registeredAt || "-"}</p>
    </article>`
      )
      .join("");
  }
  const allFull = slots.every((s) => s.occupied);
  if (allFull && statusEl) statusEl.textContent = "Slot zote za Super Admin zimejaa. Super Admin mmoja ajiondoe au Chief Admin amtoe ili mwingine ajisajili.";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    if (payload.password !== payload.confirm_password) return;
    const targetSlot = Number(payload.preferred_slot || 0);
    const slot = slots.find((s) => s.slot === targetSlot);
    if (!slot || slot.occupied) {
      if (statusEl) statusEl.textContent = "Slot uliyochagua imejazwa. Chagua slot nyingine.";
      return;
    }
    const requests = JSON.parse(localStorage.getItem(AUTH_KEYS.superAdminRequests) || "[]");
    requests.unshift({
      id: Date.now(),
      ...payload,
      status: "pending",
      approval_mode: approvalModeEl?.value || settings.superAdminApprovalMode,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(AUTH_KEYS.superAdminRequests, JSON.stringify(requests.slice(0, 300)));
    authAudit("super_admin_registration_submitted", { email: payload.email, slot: targetSlot });
    if (statusEl) statusEl.textContent = "Maombi ya usajili yamewasilishwa na kuhifadhiwa kama pending.";
    form.reset();
  });
}

function initSuperAdminResign() {
  const form = document.getElementById("superAdminResignForm");
  if (!form) return;
  const statusEl = document.getElementById("superAdminResignStatus");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const session = getSession();
    if (!session || session.role !== "super_admin") {
      if (statusEl) statusEl.textContent = "Feature hii ni kwa Super Admin aliye-login.";
      return;
    }
    const fd = new FormData(form);
    const password = String(fd.get("password") || "");
    if (!password) return;
    const ok = window.confirm("Ukijiondoa, nafasi yako ya Super Admin itakuwa wazi kwa mwingine kusajiliwa. Endelea?");
    if (!ok) return;
    const slots = getSuperAdminSlots();
    const idx = slots.findIndex((s) => String(s.email || "").toLowerCase() === String(session.email || "").toLowerCase());
    if (idx >= 0) {
      slots[idx] = { slot: slots[idx].slot, occupied: false, name: "", email: "", status: "Available", registeredAt: "" };
      saveSuperAdminSlots(slots);
    }
    authAudit("super_admin_resigned", { email: session.email, reason: fd.get("reason") || "" });
    if (statusEl) statusEl.textContent = "Umejiondoa kama Super Admin. Slot imeachiliwa.";
  });
}

initLogin();
initRegister();
initForgot();
initReset();
initChangePassword();
initPasswordToggle();
initPortal();
initSuperAdminRegistration();
initSuperAdminResign();
