import { exportCsv, getSession } from "./phase3-services.js";
import { getSignupRequests, seedIfEmpty, syncRequestsFromSupabase, updateRequestStatus } from "./phase33-dynamic-signup-services.js";

const el = (id) => document.getElementById(id);

function toast(msg, type = "") {
  const wrap = el("toastWrap");
  const t = document.createElement("div");
  t.className = `toast ${type}`.trim();
  t.setAttribute("role", type === "error" ? "alert" : "status");
  t.textContent = msg;
  wrap.appendChild(t);
  const ms = type === "error" ? 5200 : 3000;
  setTimeout(() => t.remove(), ms);
}

function guard() {
  const s = getSession();
  if (!s) return (window.location.href = "auth-login.html");
  if (!["chief_admin", "super_admin"].includes(s.role)) return (window.location.href = "unauthorized.html");
}

function invitePrefillHref(r) {
  const q = new URLSearchParams();
  if (r.email) q.set("email", r.email);
  if (r.fullName) q.set("fullName", r.fullName);
  if (r.phone) q.set("phone", r.phone);
  if (r.requestedRole) q.set("roleToAssign", r.requestedRole);
  if (r.id) q.set("requestRef", r.id);
  return `admin-invite-promote.html?${q.toString()}`;
}

function actionsHtml(r) {
  const id = r.id;
  const inviteUrl = invitePrefillHref(r);
  return `<div class="inline-actions">
    <button class="btn" data-a="view" data-id="${id}">View</button>
    <a class="btn gold" href="${inviteUrl}">Mwaliko</a>
    <button class="btn" data-a="approve" data-id="${id}">Approve</button>
    <button class="btn" data-a="reject" data-id="${id}">Reject</button>
    <button class="btn" data-a="correction" data-id="${id}">Request Correction</button>
    <button class="btn" data-a="slot" data-id="${id}">Assign Slot</button>
    <button class="btn" data-a="activate" data-id="${id}">Activate</button>
    <button class="btn" data-a="archive" data-id="${id}">Archive</button>
  </div>`;
}

function render() {
  const rows = getSignupRequests();
  el("requestsBody").innerHTML = rows
    .map(
      (r, i) => `<tr>
      <td>${i + 1}</td>
      <td>${r.fullName}</td>
      <td>${r.email}</td>
      <td>${r.phone}</td>
      <td>${r.requestedRole}</td>
      <td>${r.requestedScope || "-"}</td>
      <td>${r.unitName || "-"}</td>
      <td><span class="status-badge">${r.status}</span></td>
      <td>${r.submittedAt}</td>
      <td>${actionsHtml(r)}</td>
    </tr>`
    )
    .join("");
}

function attach() {
  document.body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const id = b.dataset.id;
    const a = b.dataset.a;
    if (a === "view") {
      const row = getSignupRequests().find((x) => x.id === id);
      if (!row) return;
      alert(JSON.stringify(row, null, 2));
      return;
    }
    if (a === "slot") {
      const row = getSignupRequests().find((x) => x.id === id);
      if (!row) return;
      if ((row.requestedScope || "").toLowerCase().includes("branch")) {
        toast("Slot za eneo hili zimejaa. Tafadhali badilisha mtumiaji au ongeza slot kupitia mipangilio.", "error");
        return;
      }
      toast("Slot assignment imewekwa (demo).");
      return;
    }
    const map = {
      approve: "Approved",
      reject: "Rejected",
      correction: "Needs Correction",
      activate: "Activated",
      archive: "Archived",
    };
    if (map[a]) {
      await updateRequestStatus(id, map[a]);
      render();
      toast(`Status: ${map[a]}`);
    }
  });

  el("exportCsvBtn").addEventListener("click", () => {
    const rows = getSignupRequests();
    const header = "FullName,Email,Phone,RequestedRole,Scope,Unit,Status,SubmittedAt";
    const lines = rows.map((r) => `"${r.fullName}","${r.email}","${r.phone}","${r.requestedRole}","${r.requestedScope || ""}","${r.unitName || ""}","${r.status}","${r.submittedAt}"`);
    exportCsv("kmt-signup-pending-requests.csv", [header, ...lines]);
  });
  el("printBtn").addEventListener("click", () => window.print());
}

async function main() {
  guard();
  const synced = await syncRequestsFromSupabase();
  if (!synced) seedIfEmpty();
  render();
  attach();
}

main();
