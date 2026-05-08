import { installGlobalCrashGuards } from "./phase-integration-core.js";
import { exportCsv, getSession, logAudit } from "./phase3-services.js";
import { showToast, askConfirm } from "./phase3-ui.js";
import { getSupabaseClient } from "./phase3-supabase.js";
import {
  workflowStatuses,
  inviteTypes,
  assignableRoles,
  assignLevels,
  permissionLayersList,
} from "./phase32-invite-promote-hooks.js";
import {
  assertAdminInviteModuleAccess,
  savePhase32Settings,
  getPhase32Settings,
  canUseSuperAdminInvite,
  createInvite,
  sendInvite,
  markInviteOpened,
  acceptInvite,
  cancelInvite,
  expireInvite,
  archiveInvite,
  createPromotion,
  approvePromotion,
  rejectPromotion,
  applyPromotionImmediately,
  addPermissionLayer,
  approvePermissionLayer,
  rejectPermissionLayer,
  createReplacement,
  applyReplacement,
  runAllPhase32Sweeps,
  syncPhase32FromSupabase,
  seedIfEmpty,
  getInvitations,
  getPromotions,
  getPermissionLayers,
  getReplacements,
  getActiveAssignments,
  getAuditLogs,
  getNotifications,
  getProfileIntegrationBundle,
  loadSlots,
} from "./phase32-invite-promote-services.js";

installGlobalCrashGuards();

const el = (id) => document.getElementById(id);
const canModerate = (ctx) => ctx.level === "full" || ctx.level === "extended";
const canCreate = (ctx) => ["full", "extended", "limited"].includes(ctx.level);

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(v) {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function statusPill(status) {
  const m = workflowStatuses.find((x) => x.sw === status);
  const cls = m?.color || "slate";
  return `<span class="status-pill ${cls}">${escapeHtml(status)}</span>`;
}

function actorLabel() {
  const s = getSession();
  return s?.name || s?.email || "Admin";
}

function fillSelect(sel, options, filterFn) {
  if (!sel) return;
  const list = filterFn ? options.filter(filterFn) : options;
  sel.innerHTML = list.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

/** Urejesho kutoka maombi ya Phase 33 (URL query) → majina ya role za Phase 32 */
function mapSignupRoleToInviteSelect(raw) {
  const m = {
    "Viewer / Mtazamaji": "Viewer",
    "Publications/Media Officer": "Media Admin",
  };
  return m[raw] || raw;
}

/** Jaza fomu ya mwaliko kutoka `?email=&fullName=&phone=&roleToAssign=&requestRef=` */
function applyInviteQueryPrefill() {
  const form = el("formInvite");
  if (!form) return;
  const p = new URLSearchParams(window.location.search);
  const setInput = (name, param) => {
    const v = p.get(param);
    if (!v) return;
    const input = form.querySelector(`[name="${name}"]`);
    if (input && input.tagName === "INPUT" && !String(input.value || "").trim()) {
      input.value = v;
    }
  };
  setInput("fullName", "fullName");
  setInput("email", "email");
  setInput("phone", "phone");

  const ref = p.get("requestRef");
  if (ref) {
    const ta = form.querySelector('[name="notes"]');
    if (ta && !String(ta.value || "").trim()) {
      ta.value = `Ombi la usajili Phase 33 (ref: ${ref}).`;
    }
  }

  const rawRole = p.get("roleToAssign");
  if (rawRole) {
    const mapped = mapSignupRoleToInviteSelect(rawRole);
    const sel = el("roleToAssignSelect");
    if (sel) {
      const match = [...sel.options].find((o) => o.value === mapped);
      if (match) sel.value = mapped;
    }
  }

  if (p.get("email") || p.get("fullName")) {
    showToast("Taarifa za ombi zimejazwa kwenye fomu ya mwaliko.");
  }
}

function focusInvitePanelIfQuery() {
  const p = new URLSearchParams(window.location.search);
  if (!p.get("email") && !p.get("fullName") && !p.get("requestRef")) return;
  document.querySelector('.tab[data-tab="invite"]')?.click();
}

function initFormDefaults() {
  const t = todayISODate();
  const invS = el("inviteStartDate");
  const invE = el("inviteExpiry");
  const rep = el("repEffective");
  const ps = document.querySelector("#formPromote .promote-start");
  const ls = document.querySelector("#formLayer .layer-start");
  if (invS && !invS.value) invS.value = t;
  if (invE && !invE.value) invE.value = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  if (rep && !rep.value) rep.value = t;
  if (ps && !ps.value) ps.value = t;
  if (ls && !ls.value) ls.value = t;
}

function renderSettings(ctx) {
  const st = getPhase32Settings();
  const chkS = el("chkSuperCanInvite");
  const chkN = el("chkNationalCanModule");
  const chkO = el("chkOfficeLimited");
  if (chkS) {
    chkS.checked = st.superInviteAllowedForSuperAdmin;
    chkS.disabled = ctx.level !== "full";
  }
  if (chkN) {
    chkN.checked = st.nationalAdminCanInvite;
    chkN.disabled = ctx.level !== "full";
  }
  if (chkO) {
    chkO.checked = st.officeAdminCanUse !== false;
    chkO.disabled = ctx.level !== "full";
  }
  const card = el("settingsCard");
  if (ctx.level === "limited") {
    card?.querySelectorAll("input[type=checkbox]").forEach((c) => {
      c.disabled = true;
    });
  }
}

function renderSuperSlots() {
  const wrap = el("superSlotsSummary");
  if (!wrap) return;
  const slots = loadSlots();
  wrap.innerHTML = slots
    .map(
      (s) => `
    <div><b>Slot ${s.slot}</b><br/>${s.occupied ? escapeHtml(s.name || s.email || "Occupied") : "<em>Available / Inapatikana</em>"}</div>`
    )
    .join("");
}

function renderProfileIntegration(session) {
  const b = el("profileIntegrationBody");
  const tl = el("profileTimeline");
  if (!b) return;
  const p = getProfileIntegrationBundle(session);
  b.innerHTML = `
    <div><b>Primary Role</b>${escapeHtml(p.primaryRole)}</div>
    <div><b>Additional Roles</b>${escapeHtml((p.additionalRoles || []).join(", ") || "-")}</div>
    <div><b>Permission Layers</b>${escapeHtml(p.permissionLayers.join(", ") || "-")}</div>
    <div><b>Pending Invites</b>${p.pendingInvites.length}</div>
    <div><b>Pending Promotions</b>${p.pendingPromotions.length}</div>
    <div><b>Pending Permission</b>${p.pendingPermissionRequests.length}</div>
    <div><b>Temporary Assignments</b>${p.temporaryAssignments.length}</div>
  `;
  if (tl) {
    const lines = [...p.roleHistory.slice(0, 6), ...p.approvalHistory.map((a) => `${a.at}: ${a.action}`).slice(0, 8)];
    tl.innerHTML = lines.length ? lines.map((l) => `• ${escapeHtml(l)}`).join("<br/>") : "Hakuna historia bado / No history yet.";
  }
}

function renderAuditAndNotify() {
  const a = el("auditTimeline");
  const n = el("notifyTimeline");
  if (a) {
    a.innerHTML = getAuditLogs()
      .slice(0, 35)
      .map((l) => `• <b>${escapeHtml(l.at)}</b> ${escapeHtml(l.action)} — ${escapeHtml(l.actor)}`)
      .join("<br/>");
  }
  if (n) {
    n.innerHTML = getNotifications()
      .slice(0, 25)
      .map((x) => `• ${escapeHtml(x.at)}: ${escapeHtml(x.title)}`)
      .join("<br/>");
  }
}

function inviteLink(token) {
  const u = new URL(window.location.href);
  u.searchParams.set("invite", token);
  return u.toString();
}

function renderInvites(ctx) {
  const tb = el("tblInvites");
  if (!tb) return;
  const rows = getInvitations();
  tb.innerHTML = rows
    .map((r, i) => {
      const link = inviteLink(r.inviteToken);
      const canSuperFlow = ctx.level === "full" || (ctx.session.role === "super_admin" && ctx.settings.superInviteAllowedForSuperAdmin);
      const superNeedsChiefStep = r.inviteType === "Super Admin Invite" && r.status === "Inakaguliwa";
      const sendDisabled = superNeedsChiefStep && !canSuperFlow;
      const sendLabel =
        r.inviteType === "Super Admin Invite" && r.status === "Rasimu"
          ? "Wasilisha kwa ukaguzi / Submit for review"
          : superNeedsChiefStep
            ? "Tuma baada ya idhini / Approve send"
            : "Tuma / Send";
      const sendBtn = ["Rasimu", "Inakaguliwa"].includes(r.status)
        ? `<button type="button" class="btn tiny" data-p32-act="sendInvite" data-p32-id="${escapeHtml(r.id)}" ${sendDisabled || !canCreate(ctx) ? "disabled" : ""}>${sendLabel}</button>`
        : "";
      const demoBtns =
        ctx.level !== "limited"
          ? `<button type="button" class="btn tiny" data-p32-act="opened" data-p32-id="${escapeHtml(r.id)}">Opened</button>
         <button type="button" class="btn tiny" data-p32-act="accepted" data-p32-id="${escapeHtml(r.id)}">Accepted</button>`
          : "";
      return `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.fullName)}</td>
      <td>${escapeHtml(r.email)}</td>
      <td>${escapeHtml(r.inviteType)}</td>
      <td>${escapeHtml(r.primaryRole)}</td>
      <td>${escapeHtml(r.assignedLevel)}</td>
      <td>${escapeHtml(r.assignedUnit || "")}</td>
      <td>${statusPill(r.status)}</td>
      <td><code style="font-size:10px">${escapeHtml(r.inviteToken)}</code><br/><button type="button" class="btn tiny" data-p32-act="copyLink" data-p32-link="${escapeHtml(link)}">Nakili kiungo</button></td>
      <td class="actions">
        <button type="button" class="btn tiny" data-p32-act="view" data-p32-kind="invite" data-p32-id="${escapeHtml(r.id)}">View</button>
        ${sendBtn}
        ${demoBtns}
        <button type="button" class="btn tiny" data-p32-act="cancelInv" data-p32-id="${escapeHtml(r.id)}" ${canModerate(ctx) ? "" : "disabled"}>Cancel</button>
        <button type="button" class="btn tiny" data-p32-act="expireInv" data-p32-id="${escapeHtml(r.id)}" ${canModerate(ctx) ? "" : "disabled"}>Expire</button>
        <button type="button" class="btn tiny" data-p32-act="archiveInv" data-p32-id="${escapeHtml(r.id)}" ${canModerate(ctx) ? "" : "disabled"}>Archive</button>
      </td></tr>`;
    })
    .join("");
}

function renderPromotions(ctx) {
  const tb = el("tblPromotions");
  if (!tb) return;
  const rows = getPromotions();
  tb.innerHTML = rows
    .map((r, i) => {
      return `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.userName)}</td>
      <td>${escapeHtml(r.currentRoles)}</td>
      <td>${escapeHtml(r.newRole)}</td>
      <td>${escapeHtml(r.assignedLevel)}</td>
      <td>${statusPill(r.status)}</td>
      <td>${escapeHtml(r.submittedAt)}</td>
      <td class="actions">
        <button type="button" class="btn tiny" data-p32-act="view" data-p32-kind="promotion" data-p32-id="${escapeHtml(r.id)}">View</button>
        <button type="button" class="btn tiny" data-p32-act="approvePro" data-p32-id="${escapeHtml(r.id)}" ${canModerate(ctx) ? "" : "disabled"}>Approve</button>
        <button type="button" class="btn tiny" data-p32-act="rejectPro" data-p32-id="${escapeHtml(r.id)}" ${canModerate(ctx) ? "" : "disabled"}>Reject</button>
        <button type="button" class="btn tiny" data-p32-act="applyPro" data-p32-id="${escapeHtml(r.id)}" ${canModerate(ctx) ? "" : "disabled"}>Apply now</button>
      </td></tr>`;
    })
    .join("");
}

function renderLayers(ctx) {
  const tb = el("tblLayers");
  if (!tb) return;
  const rows = getPermissionLayers();
  tb.innerHTML = rows
    .map((r, i) => {
      return `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.userName)}</td>
      <td>${escapeHtml(r.primaryRole)}</td>
      <td>${escapeHtml(r.layer)}</td>
      <td>${escapeHtml(r.scope)}</td>
      <td>${statusPill(r.status)}</td>
      <td class="actions">
        <button type="button" class="btn tiny" data-p32-act="view" data-p32-kind="layer" data-p32-id="${escapeHtml(r.id)}">View</button>
        <button type="button" class="btn tiny" data-p32-act="approveLay" data-p32-id="${escapeHtml(r.id)}" ${canModerate(ctx) ? "" : "disabled"}>Approve</button>
        <button type="button" class="btn tiny" data-p32-act="rejectLay" data-p32-id="${escapeHtml(r.id)}" ${canModerate(ctx) ? "" : "disabled"}>Reject</button>
      </td></tr>`;
    })
    .join("");
}

function renderReplacements(ctx) {
  const tb = el("tblReplacements");
  if (!tb) return;
  const rows = getReplacements();
  tb.innerHTML = rows
    .map((r, i) => {
      return `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.currentUser)}</td>
      <td>${escapeHtml(r.replacementUser)}</td>
      <td>${escapeHtml(r.effectiveDate || "")}</td>
      <td>${statusPill(r.status)}</td>
      <td class="actions">
        <button type="button" class="btn tiny" data-p32-act="view" data-p32-kind="replacement" data-p32-id="${escapeHtml(r.id)}">View</button>
        <button type="button" class="btn tiny" data-p32-act="applyRep" data-p32-id="${escapeHtml(r.id)}" ${canModerate(ctx) ? "" : "disabled"}>Complete</button>
      </td></tr>`;
    })
    .join("");
}

function renderActive() {
  const tb = el("tblActive");
  if (!tb) return;
  const rows = getActiveAssignments();
  tb.innerHTML = rows
    .map((r, i) => {
      return `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.user)}</td>
      <td>${escapeHtml(r.currentRole)}</td>
      <td>${escapeHtml(r.assignedRole)}</td>
      <td>${escapeHtml(r.permissionLayer)}</td>
      <td>${escapeHtml(r.scope)}</td>
      <td>${escapeHtml(r.unit)}</td>
      <td>${statusPill(r.status)}</td>
      <td>${escapeHtml(r.startDate)}</td>
      <td>${escapeHtml(r.endDate || "")}</td>
      <td>${escapeHtml(r.tempPerm)}</td>
      <td>${escapeHtml(r.approvedBy)}</td>
      <td class="actions">
        <button type="button" class="btn tiny" data-p32-act="view" data-p32-kind="active" data-p32-id="${escapeHtml(r.id)}">View</button>
      </td></tr>`;
    })
    .join("");
}

function renderAll(ctx) {
  renderSuperSlots();
  renderInvites(ctx);
  renderPromotions(ctx);
  renderLayers(ctx);
  renderReplacements(ctx);
  renderActive();
  renderAuditAndNotify();
  renderProfileIntegration(ctx.session);
}

function openDetail(obj) {
  const m = el("detailModal");
  const b = el("detailModalBody");
  if (b) b.textContent = JSON.stringify(obj, null, 2);
  m?.classList.add("show");
  m?.setAttribute("aria-hidden", "false");
}

function closeDetail() {
  const m = el("detailModal");
  m?.classList.remove("show");
  m?.setAttribute("aria-hidden", "true");
}

function wireTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".panel").forEach((p) => {
        p.hidden = p.getAttribute("data-panel") !== key;
      });
    });
  });
}

function wireTables(ctx) {
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-p32-act]");
    if (!btn) return;
    const act = btn.getAttribute("data-p32-act");
    const id = btn.getAttribute("data-p32-id");
    const kind = btn.getAttribute("data-p32-kind");
    const actor = actorLabel();

    if (act === "copyLink") {
      const link = btn.getAttribute("data-p32-link");
      navigator.clipboard?.writeText(link || "").then(() => showToast("Kiungo kimenakiliwa / Link copied"));
      return;
    }
    if (!canModerate(ctx) && ["cancelInv", "expireInv", "archiveInv", "approvePro", "rejectPro", "applyPro", "approveLay", "rejectLay", "applyRep"].includes(act)) {
      showToast("Huna ruhusa ya kufanya action hii kwenye kiwango chako / Limited role cannot perform this action", "error");
      return;
    }
    if (act === "view") {
      let obj = null;
      if (kind === "invite") obj = getInvitations().find((x) => x.id === id);
      if (kind === "promotion") obj = getPromotions().find((x) => x.id === id);
      if (kind === "layer") obj = getPermissionLayers().find((x) => x.id === id);
      if (kind === "replacement") obj = getReplacements().find((x) => x.id === id);
      if (kind === "active") obj = getActiveAssignments().find((x) => x.id === id);
      if (obj) openDetail(obj);
      return;
    }
    if (act === "sendInvite") {
      sendInvite(id, actor);
      logAudit({ module: "phase32_invite", action: "invite_sent", description: id, actor });
      showToast("Mwaliko umetumwa / Invite sent");
      renderAll(ctx);
      return;
    }
    if (act === "opened") {
      markInviteOpened(id);
      showToast("Hali: Imepokelewa / Opened");
      renderAll(ctx);
      return;
    }
    if (act === "accepted") {
      acceptInvite(id, actor);
      logAudit({ module: "phase32_invite", action: "invite_accepted", description: id, actor });
      showToast("Mwaliko umekubaliwa / Accepted");
      renderAll(ctx);
      return;
    }
    if (act === "cancelInv") {
      askConfirm({
        title: "Ghairi mwaliko?",
        message: "Hatua hii itabadilisha hali kuwa Imeghairiwa.",
        onConfirm: () => {
          cancelInvite(id, actor);
          logAudit({ module: "phase32_invite", action: "invite_cancelled", description: id, actor });
          showToast("Imeghairiwa");
          renderAll(ctx);
        },
      });
      return;
    }
    if (act === "expireInv") {
      expireInvite(id, actor);
      showToast("Imewekwa kuwa imeisha muda");
      renderAll(ctx);
      return;
    }
    if (act === "archiveInv") {
      archiveInvite(id, actor);
      showToast("Imehifadhiwa / Archived");
      renderAll(ctx);
      return;
    }
    if (act === "approvePro") {
      approvePromotion(id, actor);
      logAudit({ module: "phase32_promote", action: "promotion_approved", description: id, actor });
      showToast("Upandishaji umeidhinishwa");
      renderAll(ctx);
      return;
    }
    if (act === "rejectPro") {
      const reason = window.prompt("Sababu ya kukataa / Rejection reason") || "";
      rejectPromotion(id, actor, reason);
      showToast("Imekataliwa");
      renderAll(ctx);
      return;
    }
    if (act === "applyPro") {
      const row = getPromotions().find((x) => x.id === id);
      if (!row) return;
      if (row.approvalNeeded) {
        showToast("Inahitaji idhini kwanza; tumia Approve / Needs approval first", "error");
        return;
      }
      applyPromotionImmediately(id, actor);
      showToast("Imetekelezwa mara moja / Applied");
      renderAll(ctx);
      return;
    }
    if (act === "approveLay") {
      approvePermissionLayer(id, actor);
      logAudit({ module: "phase32_layer", action: "layer_approved", description: id, actor });
      showToast("Ruhusa ya ziada imeidhinishwa");
      renderAll(ctx);
      return;
    }
    if (act === "rejectLay") {
      const reason = window.prompt("Sababu / Reason") || "";
      rejectPermissionLayer(id, actor, reason);
      renderAll(ctx);
      return;
    }
    if (act === "applyRep") {
      applyReplacement(id, actor);
      logAudit({ module: "phase32_replace", action: "replacement_done", description: id, actor });
      showToast("Badilishaji limekamilika");
      renderAll(ctx);
    }
  });
}

function wireForms(ctx) {
  el("formInvite")?.addEventListener("submit", (ev) => {
    if (!canCreate(ctx)) {
      ev.preventDefault();
      showToast("Role yako hairuhusiwi kuunda maombi mapya hapa / Not allowed", "error");
      return;
    }
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const saveAsDraft = ev.target.querySelector('[name="saveAsDraft"]')?.checked;
    const payload = {
      fullName: fd.get("fullName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      inviteType: fd.get("inviteType"),
      roleToAssign: fd.get("roleToAssign"),
      primaryRole: fd.get("primaryRole"),
      additionalRoles: fd.get("additionalRoles"),
      assignedLevel: fd.get("assignedLevel"),
      assignedUnit: fd.get("assignedUnit"),
      slotNumber: fd.get("slotNumber"),
      startDate: fd.get("startDate"),
      endDate: fd.get("endDate"),
      tempOrPermanent: fd.get("tempOrPermanent"),
      notes: fd.get("notes"),
      inviteExpiry: fd.get("inviteExpiry"),
      saveAsDraft: !!saveAsDraft,
    };
    try {
      createInvite(payload, actorLabel());
      logAudit({ module: "phase32_invite", action: "invite_created", description: payload.email, actor: actorLabel() });
      showToast(saveAsDraft ? "Rasimu imehifadhiwa" : "Mwaliko umeundwa");
      ev.target.reset();
      initFormDefaults();
      renderAll(ctx);
    } catch (err) {
      showToast(err.message || "Hitilafu", "error");
    }
  });

  el("formPromote")?.addEventListener("submit", (ev) => {
    if (!canCreate(ctx)) {
      ev.preventDefault();
      showToast("Role yako hairuhusiwi kuunda promotion / Not allowed", "error");
      return;
    }
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const payload = {
      userName: fd.get("userName"),
      userEmail: fd.get("userEmail"),
      currentRoles: fd.get("currentRoles"),
      newRole: fd.get("newRole"),
      promotionType: fd.get("promotionType"),
      assignedLevel: fd.get("assignedLevel"),
      assignedUnit: fd.get("assignedUnit"),
      startDate: fd.get("startDate"),
      endDate: fd.get("endDate"),
      reason: fd.get("reason"),
      notes: fd.get("notes"),
      approvalNeeded: !!ev.target.querySelector('[name="approvalNeeded"]')?.checked,
      saveAsDraft: !!ev.target.querySelector('[name="saveAsDraft"]')?.checked,
    };
    createPromotion(payload, actorLabel());
    logAudit({ module: "phase32_promote", action: "promotion_submitted", description: payload.userName, actor: actorLabel() });
    showToast("Upandishaji uwasilishwa");
    ev.target.reset();
    initFormDefaults();
    renderAll(ctx);
  });

  el("formLayer")?.addEventListener("submit", (ev) => {
    if (!canCreate(ctx)) {
      ev.preventDefault();
      showToast("Role yako hairuhusiwi kuomba permission layer / Not allowed", "error");
      return;
    }
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const payload = {
      userName: fd.get("userName"),
      userEmail: fd.get("userEmail"),
      primaryRole: fd.get("primaryRole"),
      layer: fd.get("layer"),
      scope: fd.get("scope"),
      unit: fd.get("unit"),
      startDate: fd.get("startDate"),
      endDate: fd.get("endDate"),
      tempOrPermanent: fd.get("tempOrPermanent"),
      reason: fd.get("reason"),
      notes: fd.get("notes"),
      saveAsDraft: !!ev.target.querySelector('[name="saveAsDraft"]')?.checked,
    };
    addPermissionLayer(payload, actorLabel());
    logAudit({ module: "phase32_layer", action: "layer_submitted", description: `${payload.userName} + ${payload.layer}`, actor: actorLabel() });
    showToast("Ombi la ruhusa limewasilishwa");
    ev.target.reset();
    initFormDefaults();
    renderAll(ctx);
  });

  el("formReplace")?.addEventListener("submit", (ev) => {
    if (!canCreate(ctx)) {
      ev.preventDefault();
      showToast("Role yako hairuhusiwi kuunda replacement / Not allowed", "error");
      return;
    }
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const payload = {
      currentUser: fd.get("currentUser"),
      replacementUser: fd.get("replacementUser"),
      replacementIsInvite: !!ev.target.querySelector('[name="replacementIsInvite"]')?.checked,
      effectiveDate: fd.get("effectiveDate"),
      immediate: !!ev.target.querySelector('[name="immediate"]')?.checked,
      transferPendingTasks: !!ev.target.querySelector('[name="transferPendingTasks"]')?.checked,
      reason: fd.get("reason"),
      notes: fd.get("notes"),
    };
    createReplacement(payload, actorLabel());
    logAudit({ module: "phase32_replace", action: "replacement_submitted", description: payload.currentUser, actor: actorLabel() });
    showToast("Ombi la badilishaji limewasilishwa");
    ev.target.reset();
    initFormDefaults();
    renderAll(ctx);
  });
}

function wireSettings(ctx) {
  const save = () => {
    if (ctx.level !== "full") return;
    savePhase32Settings({
      superInviteAllowedForSuperAdmin: el("chkSuperCanInvite")?.checked,
      nationalAdminCanInvite: el("chkNationalCanModule")?.checked,
      officeAdminCanUse: el("chkOfficeLimited")?.checked !== false,
    });
    showToast("Mipangilio imehifadhiwa");
    Object.assign(ctx, { settings: getPhase32Settings() });
  };
  ["chkSuperCanInvite", "chkNationalCanModule", "chkOfficeLimited"].forEach((id) => {
    el(id)?.addEventListener("change", save);
  });
}

function wireExports() {
  el("btnExportActive")?.addEventListener("click", () => {
    const rows = getActiveAssignments();
    const header = "User,CurrentRole,AssignedRole,Layer,Scope,Unit,Status,Start,End,TempPerm,ApprovedBy";
    const lines = rows.map(
      (r) =>
        `${csvCell(r.user)},${csvCell(r.currentRole)},${csvCell(r.assignedRole)},${csvCell(r.permissionLayer)},${csvCell(r.scope)},${csvCell(r.unit)},${csvCell(r.status)},${csvCell(r.startDate)},${csvCell(r.endDate)},${csvCell(r.tempPerm)},${csvCell(r.approvedBy)}`
    );
    exportCsv("kmt-phase32-active-assignments.csv", [header, ...lines]);
    showToast("CSV imepakuliwa");
  });
  el("btnPrintActive")?.addEventListener("click", () => {
    const rows = getActiveAssignments();
    const html = `<table><thead><tr><th>User</th><th>Role</th><th>Layer</th><th>Status</th></tr></thead><tbody>${rows
      .map((r) => `<tr><td>${escapeHtml(r.user)}</td><td>${escapeHtml(r.assignedRole)}</td><td>${escapeHtml(r.permissionLayer)}</td><td>${escapeHtml(r.status)}</td></tr>`)
      .join("")}</tbody></table>`;
    const w = window.open("", "_blank", "width=960,height=720");
    if (!w) return showToast("Pop-up zimezuiwa", "error");
    w.document.write(
      `<!DOCTYPE html><html lang="sw"><head><meta charset="UTF-8"/><title>Active assignments</title><style>body{font-family:Inter,sans-serif;padding:16px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;font-size:12px}</style></head><body><h2>RUHUSA ZA JUU ZILIZO HAI</h2>${html}<script>window.onload=function(){window.print();}<\/script></body></html>`
    );
    w.document.close();
  });
}

function startSupabaseLiveSync(ctx) {
  const client = getSupabaseClient();
  if (!client || typeof client.channel !== "function") {
    setInterval(async () => {
      const changed = await syncPhase32FromSupabase();
      if (changed) renderAll(ctx);
    }, 45000);
    return;
  }
  const ch = client.channel("phase32-live-sync");
  ["phase32_invitations", "phase32_promotions", "phase32_permission_layers", "phase32_replacements"].forEach((table) => {
    ch.on("postgres_changes", { event: "*", schema: "public", table }, async () => {
      const changed = await syncPhase32FromSupabase();
      if (changed) renderAll(ctx);
    });
  });
  ch.subscribe();
}

el("btnCopyInviteTemplate")?.addEventListener("click", () => {
  const sample = `Habari,\n\nUmealikwa kwenye KMK(T) National Church Portal. Bonyeza kiungo salama kilicho hapa chini ili kukamilisha usajili wako.\n\n[LINK]\n\nKiungo kitakuisha baada ya tarehe iliyowekwa.\n\nBaraka,\nMfumo wa KMK(T)`;
  navigator.clipboard?.writeText(sample).then(() => showToast("Template imenakiliwa / Email template copied"));
});

el("detailCloseBtn")?.addEventListener("click", closeDetail);
el("detailModal")?.addEventListener("click", (e) => {
  if (e.target === el("detailModal")) closeDetail();
});

async function main() {
  const ctx = assertAdminInviteModuleAccess();
  if (!ctx) return;

  el("actorRoleBadge").textContent = ctx.session.role || "role";
  el("accessLevelBadge").textContent =
    ctx.level === "full" ? "Full admin" : ctx.level === "extended" ? "National extended" : "Office limited";

  const synced = await syncPhase32FromSupabase();
  if (!synced) seedIfEmpty(actorLabel());
  runAllPhase32Sweeps();
  setInterval(() => runAllPhase32Sweeps(), 120000);

  fillSelect(el("roleToAssignSelect"), assignableRoles);
  fillSelect(el("primaryRoleSelect"), assignableRoles);
  fillSelect(el("promoteNewRoleSelect"), assignableRoles);
  fillSelect(el("assignedLevelSelect"), assignLevels);
  document.querySelectorAll(".promote-level").forEach((s) => fillSelect(s, assignLevels));
  fillSelect(el("layerSelect"), permissionLayersList);

  const superFilter = (t) => {
    if (ctx.level === "limited" && t === "Super Admin Invite") return false;
    if (!canUseSuperAdminInvite(ctx) && t === "Super Admin Invite") return false;
    return true;
  };
  fillSelect(el("inviteTypeSelect"), inviteTypes, superFilter);

  renderSettings(ctx);
  initFormDefaults();
  wireTabs();
  applyInviteQueryPrefill();
  focusInvitePanelIfQuery();
  wireTables(ctx);
  wireForms(ctx);
  wireSettings(ctx);
  wireExports();
  renderAll(ctx);
  startSupabaseLiveSync(ctx);

  const it = el("inviteTypeSelect");
  const slotLabel = el("slotFieldLabel");
  const slotInput = document.querySelector('#formInvite input[name="slotNumber"]');
  const toggleSlot = () => {
    const on = it?.value === "Super Admin Invite";
    if (slotLabel) slotLabel.style.opacity = on ? "1" : "0.45";
    if (slotInput) {
      slotInput.disabled = !on;
      if (!on) slotInput.value = "";
    }
  };
  it?.addEventListener("change", toggleSlot);
  toggleSlot();
}

main().catch(() => {
  showToast("Kulitokea hitilafu ya kuanzisha moduli / Failed to initialize module", "error");
});
