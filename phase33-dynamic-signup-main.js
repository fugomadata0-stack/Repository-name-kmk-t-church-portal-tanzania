import { exportCsv } from "./phase3-services.js";
import {
  publicRoles,
  getReferenceData,
  validatePassword,
  analyzePasswordStrength,
  validatePhone,
  validateEmail,
  detectDuplicate,
  detectDuplicatePending,
  saveSignupRequest,
  validatePasswordRemote,
} from "./phase33-dynamic-signup-services.js";

const el = (id) => document.getElementById(id);
const data = getReferenceData();
let step = 1;

function toast(msg, type = "") {
  const wrap = el("toastWrap");
  const t = document.createElement("div");
  t.className = `toast ${type}`.trim();
  t.setAttribute("role", type === "error" ? "alert" : "status");
  t.textContent = msg;
  wrap.appendChild(t);
  const ms = type === "error" ? 5200 : 3200;
  setTimeout(() => t.remove(), ms);
}

function fillRoles() {
  const s = el("requestedRole");
  s.innerHTML = `<option value="">Chagua role unayoomba</option>${publicRoles.map((r) => `<option>${r}</option>`).join("")}`;
  const cards = el("roleCards");
  cards.innerHTML = publicRoles.map((r) => `<article class="role-card"><b>${r}</b><div class="mini-row"><span class="status-badge">Public role</span></div></article>`).join("");
}

function renderStepper() {
  el("stepper").innerHTML = [1, 2, 3, 4, 5]
    .map((n) => {
      let cls = "step-chip";
      if (n === step) cls += " active";
      else if (n < step) cls += " done";
      const cur = n === step ? ' aria-current="step"' : "";
      return `<span class="${cls}" role="listitem"${cur}>Hatua ${n}</span>`;
    })
    .join("");
  el("progressBar").style.width = `${(step / 5) * 100}%`;
  document.querySelectorAll(".step").forEach((x) => (x.hidden = Number(x.dataset.step) !== step));
  el("prevBtn").style.visibility = step === 1 || step === 5 ? "hidden" : "visible";
  el("nextBtn").hidden = step >= 4;
  el("submitBtn").hidden = step !== 4;
  syncPasswordGateButtons();
}

function renderOptions(arr, first = "Chagua") {
  return `<option value="">${first}</option>${arr.map((x) => `<option>${x}</option>`).join("")}`;
}

function selectField(name, label, arr, required = false) {
  return `<label>${label}<select name="${name}" ${required ? "required" : ""}>${renderOptions(arr)}</select></label>`;
}

function textField(name, label, required = false, ph = "") {
  return `<label>${label}<input name="${name}" ${required ? "required" : ""} placeholder="${ph}" /></label>`;
}

function noteArea(name = "supportingNote") {
  return `<label style="grid-column:1/-1">Supporting note<textarea rows="2" name="${name}"></textarea></label>`;
}

function dynamicCommonLevel(levelName = "Level", fieldName = "level") {
  return selectField(fieldName, levelName, ["National", "Diocese", "Jimbo", "Branch"], true);
}

function renderNoDataBlock(fieldName) {
  return `<div style="grid-column:1/-1">
    <p class="warn">Hakuna taarifa zilizopo kwa sasa.</p>
    ${textField(fieldName, "Andika jina la eneo kwa muda", false, "Mfano: Eneo jipya")}
    <small class="warn">Hii itawekwa alama: Needs Verification</small>
  </div>`;
}

function renderLocationByLevel(prefix = "") {
  return `
    ${selectField(`${prefix}Diocese`, "Select Diocese", data.dioceses)}
    ${selectField(`${prefix}Jimbo`, "Select Jimbo", [])}
    ${selectField(`${prefix}Branch`, "Select Branch/Tawi/Parokia/Kituo", [])}
  `;
}

function renderDynamicFields() {
  const role = el("requestedRole").value;
  const wrap = el("dynamicFields");
  if (!role) {
    wrap.innerHTML = `<p class="warn" style="grid-column:1/-1">Chagua role kwanza kwenye Step 2.</p>`;
    return;
  }
  if (role === "Diocese Data Officer") {
    wrap.innerHTML = `${selectField("diocese", "Select Diocese", data.dioceses, true)}${textField("diocesePosition", "Diocese office position/title")}${textField("assignedResponsibility", "Assigned responsibility")}${noteArea()}`;
    return;
  }
  if (role === "Jimbo Data Officer") {
    wrap.innerHTML = `${selectField("diocese", "Select Diocese", data.dioceses, true)}${selectField("jimbo", "Select Jimbo", [], true)}${textField("jimboPosition", "Jimbo office position/title")}${textField("assignedResponsibility", "Assigned responsibility")}${noteArea()}`;
    return;
  }
  if (role === "Branch Data Officer") {
    wrap.innerHTML = `${selectField("diocese", "Select Diocese", data.dioceses, true)}${selectField("jimbo", "Select Jimbo", [], true)}${selectField("branch", "Select Branch/Tawi/Parokia/Kituo", [], true)}${textField("localUnitTitle", "Local unit title")}${textField("assignedResponsibility", "Assigned responsibility")}${noteArea()}`;
    return;
  }
  if (role === "Department Officer") {
    wrap.innerHTML = `${selectField("department", "Select Department", data.departments, true)}${dynamicCommonLevel("Department level", "departmentLevel")}${renderLocationByLevel("department")}${textField("departmentPosition", "Position in department")}${noteArea()}`;
    return;
  }
  if (role === "Fellowship Officer") {
    wrap.innerHTML = `${selectField("fellowship", "Select Fellowship / Jumuiya", data.fellowships, true)}${dynamicCommonLevel("Fellowship level", "fellowshipLevel")}${renderLocationByLevel("fellowship")}${textField("fellowshipPosition", "Position in fellowship")}${noteArea()}`;
    return;
  }
  if (role === "Choir Officer") {
    wrap.innerHTML = `${selectField("choir", "Select Choir", data.choirs, true)}${dynamicCommonLevel("Choir level", "choirLevel")}${renderLocationByLevel("choir")}${textField("choirPosition", "Position in choir")}${noteArea()}`;
    return;
  }
  if (role === "Institution Officer") {
    wrap.innerHTML = `${selectField("institutionType", "Institution Type", Object.keys(data.institutions), true)}${selectField("institution", "Select Institution", [], true)}${textField("institutionLocation", "Institution location")}${textField("institutionPosition", "Position in institution")}${noteArea()}`;
    return;
  }
  if (role === "Events Officer") {
    wrap.innerHTML = `${selectField("eventLevel", "Event responsibility level", ["National", "Diocese", "Jimbo", "Branch", "Department", "Fellowship"], true)}${renderLocationByLevel("event")}${selectField("eventType", "Type of events managed", ["Makambi", "Mikutano", "Seminars", "Conferences", "Worship Events", "Other"], true)}${noteArea()}`;
    return;
  }
  if (role === "Publications/Media Officer") {
    wrap.innerHTML = `${selectField("mediaResponsibility", "Media responsibility", ["Publications", "Documents", "News", "Gallery", "Videos", "Social Media"], true)}${selectField("mediaLevel", "Responsibility level", ["National", "Diocese", "Jimbo", "Branch", "Department"], true)}${renderLocationByLevel("media")}${noteArea()}`;
    return;
  }
  wrap.innerHTML = `${textField("viewerReason", "Reason for viewing access", true)}${selectField("viewerScope", "Preferred scope", ["Public", "Diocese", "Jimbo", "Branch", "Department", "Institution"], true)}${renderLocationByLevel("viewer")}${noteArea()}`;
}

function updateDependentSelects(changedEl) {
  const n = changedEl.name || "";
  const form = el("dynamicSignupForm");
  const set = (name, arr) => {
    const node = form.querySelector(`[name="${name}"]`);
    if (!node) return;
    form.querySelectorAll(`[data-warn="${name}"]`).forEach((w) => w.remove());
    node.innerHTML = renderOptions(arr);
    if (!arr.length) {
      node.insertAdjacentHTML("afterend", `<small class="warn" data-warn="${name}">Hakuna taarifa zilizopo kwa sasa</small>`);
    }
  };
  if (n.toLowerCase().includes("diocese")) {
    const d = changedEl.value;
    const list = data.jimboByDiocese[d] || [];
    ["jimbo", "departmentJimbo", "fellowshipJimbo", "choirJimbo", "eventJimbo", "mediaJimbo", "viewerJimbo"].forEach((k) => set(k, list));
  }
  if (n.toLowerCase().includes("jimbo")) {
    const j = changedEl.value;
    const list = data.branchByJimbo[j] || [];
    ["branch", "departmentBranch", "fellowshipBranch", "choirBranch", "eventBranch", "mediaBranch", "viewerBranch"].forEach((k) => set(k, list));
  }
  if (n === "institutionType") {
    const list = data.institutions[changedEl.value] || [];
    set("institution", list);
  }
}

function applyLevelVisibility() {
  const form = el("dynamicSignupForm");
  const handle = (levelField, prefix) => {
    const lv = form.querySelector(`[name="${levelField}"]`)?.value || "";
    const d = form.querySelector(`[name="${prefix}Diocese"]`)?.closest("label");
    const j = form.querySelector(`[name="${prefix}Jimbo"]`)?.closest("label");
    const b = form.querySelector(`[name="${prefix}Branch"]`)?.closest("label");
    if (!d || !j || !b) return;
    d.style.display = ["Diocese", "Jimbo", "Branch"].includes(lv) ? "" : "none";
    j.style.display = ["Jimbo", "Branch"].includes(lv) ? "" : "none";
    b.style.display = lv === "Branch" ? "" : "none";
  };
  handle("departmentLevel", "department");
  handle("fellowshipLevel", "fellowship");
  handle("choirLevel", "choir");
  handle("eventLevel", "event");
  handle("mediaLevel", "media");
  handle("viewerScope", "viewer");
}

function validateCurrentStep() {
  const form = el("dynamicSignupForm");
  const stepNode = form.querySelector(`.step[data-step="${step}"]`);
  const required = stepNode.querySelectorAll("[required]");
  for (const f of required) {
    if (!String(f.value || "").trim()) {
      toast("Tafadhali jaza sehemu zote zinazotakiwa.", "error");
      f.focus();
      return false;
    }
  }
  if (step === 1) {
    const p = form.password.value;
    if (!validateEmail(form.email.value)) return toast("Email si sahihi.", "error"), false;
    if (!validatePhone(form.phone.value)) return toast("Phone number si sahihi.", "error"), false;
    if (!validatePassword(p)) {
      const det = analyzePasswordStrength(p);
      toast(det.errors[0] || "Nenosiri halikidhi mahitaji.", "error");
      return false;
    }
    if (p !== form.confirmPassword.value) return toast("Nenosiri hazifanani.", "error"), false;
    if (detectDuplicate(form.email.value, form.phone.value)) return toast("Email au simu tayari ipo kwenye ombi/rekodi.", "error"), false;
  }
  if (step === 2) {
    if (detectDuplicatePending(form.email.value, form.requestedRole.value)) return toast("Una ombi hai tayari kwa role hii.", "error"), false;
  }
  if (step === 4) {
    const p = form.password.value;
    if (!validatePassword(p)) {
      const det = analyzePasswordStrength(p);
      toast(det.errors[0] || "Nenosiri halikidhi mahitaji.", "error");
      return false;
    }
    if (p !== form.confirmPassword.value) {
      toast("Nenosiri hazifanani.", "error");
      return false;
    }
  }
  return true;
}

function collectDynamicPayload(form) {
  const fields = Array.from(el("dynamicFields").querySelectorAll("input,select,textarea"));
  const o = {};
  fields.forEach((f) => (o[f.name] = f.value));
  return o;
}

function requestedScopeFromPayload(role, payload) {
  if (role.includes("Diocese")) return "Diocese";
  if (role.includes("Jimbo")) return "Jimbo";
  if (role.includes("Branch")) return "Branch";
  return payload.departmentLevel || payload.fellowshipLevel || payload.choirLevel || payload.mediaLevel || payload.viewerScope || payload.eventLevel || "General";
}

function unitFromPayload(payload) {
  return payload.branch || payload.viewerBranch || payload.mediaBranch || payload.eventBranch || payload.jimbo || payload.viewerJimbo || payload.diocese || payload.department || payload.institution || "-";
}

function fillSummary() {
  const f = el("dynamicSignupForm");
  const p = collectDynamicPayload(f);
  const html = `
    <p><b>Full Name:</b> ${f.fullName.value}</p>
    <p><b>Email:</b> ${f.email.value}</p>
    <p><b>Requested Role:</b> ${f.requestedRole.value}</p>
    <p><b>Requested Scope:</b> ${requestedScopeFromPayload(f.requestedRole.value, p)}</p>
    <p><b>Unit:</b> ${unitFromPayload(p)}</p>
    <p class="mini-row"><span class="status-badge">Pending Approval / Inasubiri Kuidhinishwa</span></p>`;
  el("reviewSummary").innerHTML = html;
}

const RULE_ROWS = [
  { key: "firstUpper", swahili: "Herufi ya kwanza ni kubwa (A–Z)." },
  { key: "hasLower", swahili: "Kuna herufi ndogo." },
  { key: "hasSpecial", swahili: "Kuna alama maalum (@, #, $, !)." },
  { key: "fourDigits", swahili: "Kuna angalau nambari nne (4)." },
  { key: "length", swahili: "Urefu angalau herufi 8." },
];

/** Ujumbe wa mwisho kwa Kiswahili — ni salama tu ikiwa sheria zote + rudia linafanana */
function setPasswordFinalMessage(pwd, confirm) {
  const message = el("passwordMessage");
  if (!message) return;
  const result = analyzePasswordStrength(pwd);
  const matchOk = Boolean(pwd && confirm && pwd === confirm);
  if (!pwd.trim()) {
    message.textContent = "Nenosiri ni dhaifu";
    message.className = "password-summary bad";
    return;
  }
  if (!result.valid || !matchOk) {
    message.textContent = "Nenosiri ni dhaifu";
    message.className = "password-summary bad";
  } else {
    message.textContent = "Nenosiri ni sahihi na salama";
    message.className = "password-summary ok";
  }
}

/** Hatua 1: Endelea / usajili hawezi kabla ya nenosiri halali + rudia linalofanana */
function syncPasswordGateButtons() {
  const nextBtn = el("nextBtn");
  const submitBtn = el("submitBtn");
  const pwd = el("password")?.value ?? "";
  const confirm = el("confirmPassword")?.value ?? "";
  const passwordOk = validatePassword(pwd);
  const matchOk = pwd.length > 0 && pwd === confirm;
  const step1Ready = passwordOk && matchOk;

  if (nextBtn && step === 1) {
    nextBtn.disabled = !step1Ready;
    nextBtn.title = step1Ready ? "" : "Nenosiri lazima liwe salama na linafanana na rudia";
  } else if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.removeAttribute("title");
  }

  if (submitBtn && step === 4) {
    submitBtn.disabled = !passwordOk || !matchOk;
    submitBtn.title = submitBtn.disabled ? "Thibitisha nenosiri kwenye Hatua 1" : "";
  } else if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.removeAttribute("title");
  }
}

function syncPasswordToggleButton(btn) {
  const id = btn.getAttribute("data-toggle-pw");
  const input = id ? document.getElementById(id) : null;
  if (!input) return;
  const nowVisible = input.type === "text";
  btn.textContent = nowVisible ? "Ficha" : "Onyesha";
  btn.setAttribute("aria-pressed", nowVisible ? "true" : "false");
  const isConfirm = id === "confirmPassword";
  btn.setAttribute(
    "aria-label",
    nowVisible
      ? isConfirm
        ? "Ficha rudia la nenosiri"
        : "Ficha nenosiri"
      : isConfirm
        ? "Onyesha rudia la nenosiri"
        : "Onyesha nenosiri"
  );
}

function wirePasswordToggleButtons() {
  document.querySelectorAll(".btn-toggle-pw[data-toggle-pw]").forEach((btn) => {
    syncPasswordToggleButton(btn);
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-pw");
      const input = id ? document.getElementById(id) : null;
      if (!input) return;
      const wasVisible = input.type === "text";
      input.type = wasVisible ? "password" : "text";
      syncPasswordToggleButton(btn);
    });
  });
}

function updatePasswordLiveUI() {
  const pwd = el("password")?.value ?? "";
  const confirm = el("confirmPassword")?.value ?? "";
  const listEl = el("passwordRuleList");
  const confirmEl = el("confirmPasswordMsg");
  if (!listEl || !el("passwordMessage")) return;

  const result = analyzePasswordStrength(pwd);
  const ruleItems = RULE_ROWS.map((row) => {
    const ok = result.checks[row.key];
    const icon = ok ? "✅" : "❌";
    const cls = ok ? "ok" : "bad";
    return `<li class="${cls}"><span class="rule-icon" aria-hidden="true">${icon}</span> ${row.swahili}</li>`;
  }).join("");
  const matchOk = Boolean(pwd && confirm && pwd === confirm);
  const matchIcon = matchOk ? "✅" : "❌";
  const matchCls = matchOk ? "ok" : "bad";
  const matchText = "Rudia nenosiri linafanana na kuwanza.";
  listEl.innerHTML = `${ruleItems}<li class="${matchCls}"><span class="rule-icon" aria-hidden="true">${matchIcon}</span> ${matchText}</li>`;

  setPasswordFinalMessage(pwd, confirm);

  if (confirmEl) {
    if (!confirm) {
      confirmEl.textContent = "Andika rudia la nenosiri.";
      confirmEl.className = "password-confirm-msg muted";
    } else if (pwd === confirm) {
      confirmEl.textContent = "Nenosiri zinafanana.";
      confirmEl.className = "password-confirm-msg ok";
    } else {
      confirmEl.textContent = "Nenosiri hazifanani.";
      confirmEl.className = "password-confirm-msg bad";
    }
  }

  syncPasswordGateButtons();
}

function wire() {
  fillRoles();
  renderStepper();
  renderDynamicFields();
  applyLevelVisibility();

  el("requestedRole").addEventListener("change", () => {
    renderDynamicFields();
    applyLevelVisibility();
  });
  el("dynamicSignupForm").addEventListener("change", (e) => {
    updateDependentSelects(e.target);
    applyLevelVisibility();
  });
  el("password").addEventListener("input", () => updatePasswordLiveUI());
  el("confirmPassword").addEventListener("input", () => updatePasswordLiveUI());
  wirePasswordToggleButtons();
  updatePasswordLiveUI();

  el("prevBtn").addEventListener("click", () => {
    if (step > 1) step -= 1;
    renderStepper();
  });
  el("nextBtn").addEventListener("click", () => {
    if (!validateCurrentStep()) return;
    if (step === 3) fillSummary();
    if (step < 4) step += 1;
    renderStepper();
  });

  el("dynamicSignupForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!validateCurrentStep()) return;
    const f = ev.target;
    if (!(await validatePasswordRemote(f.password.value))) {
      toast("Nenosiri halikubaliwi na seva (kigezo cha usalama).", "error");
      return;
    }
    const payload = collectDynamicPayload(f);
    const verificationFlag = Object.values(payload).some((v) => String(v || "").toLowerCase().includes("eneo jipya")) ? "Needs Verification" : "";
    const row = await saveSignupRequest({
      fullName: f.fullName.value,
      gender: f.gender.value,
      phone: f.phone.value,
      email: f.email.value,
      requestedRole: f.requestedRole.value,
      requestReason: f.requestReason.value,
      previousResponsibility: f.previousResponsibility.value,
      requestedScope: requestedScopeFromPayload(f.requestedRole.value, payload),
      unitName: unitFromPayload(payload),
      dynamicPayload: payload,
      verificationFlag,
    });
    el("requestRef").textContent = row.id;
    step = 5;
    renderStepper();
    toast("Ombi limepokelewa na linasubiri kuidhinishwa.");
  });
}

wire();
