/**
 * KMT Dashboard — auth helpers (session kwenye localStorage / phase2)
 * Hakuna service role hapa; anon key tu kwenye Supabase client.
 */
(function () {
  var SESSION_KEY = "kmt_session";

  function parseSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /** Panga role ya mfumo kuwa role ya dashibodi ya SaaS */
  function mapToSaaSRole(role) {
    var r = String(role || "")
      .toLowerCase()
      .trim();
    if (r === "chief_admin" || r === "super_admin") return "super_admin";
    if (r === "national_admin") return "national_admin";
    if (r === "finance_officer") return "finance_admin";
    if (r === "admin") return "office_admin";
    if (r === "viewer" || r === "member" || r === "branch_user") return "reviewer";
    if (r === "jimbo_user") return "office_admin";
    if (r === "diocese_user") return "national_admin";
    if (r === "kiongozi_idara") return "office_admin";
    if (r.indexOf("media") >= 0) return "office_admin";
    if (r.indexOf("askofu") >= 0 || r.indexOf("mchungaji") >= 0) return "approver";
    return "national_admin";
  }

  var ROLE_LABELS = {
    super_admin: "Super Admin",
    national_admin: "National Admin",
    office_admin: "Office Admin",
    finance_admin: "Finance Admin",
    reviewer: "Reviewer",
    approver: "Approver",
  };

  var ACCESS_MATRIX = {
    super_admin: "*",
    national_admin: ["overview", "members", "branches", "leaders", "attendance", "finance", "events", "reports", "categories"],
    office_admin: ["overview", "members", "branches", "events", "reports", "categories"],
    finance_admin: ["overview", "finance", "reports"],
    reviewer: ["overview", "reports", "attendance"],
    approver: ["overview", "members", "reports", "events"],
  };

  function canAccessModule(saasRole, moduleId) {
    if (moduleId === "overview") return true;
    var allowed = ACCESS_MATRIX[saasRole];
    if (!allowed) return false;
    if (allowed === "*") return true;
    return allowed.indexOf(moduleId) >= 0;
  }

  function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    window.location.href = "auth-login.html";
  }

  window.KMTAuth = {
    SESSION_KEY: SESSION_KEY,
    getSession: parseSession,
    isAuthenticated: function () {
      return !!parseSession();
    },
    /** Role nyeti kutoka session (mfano super_admin) */
    getRawRole: function () {
      var s = parseSession();
      return s && s.role ? s.role : null;
    },
    getSaaSRole: function () {
      var s = parseSession();
      return s ? mapToSaaSRole(s.role) : null;
    },
    getDisplayRole: function () {
      var sr = window.KMTAuth.getSaaSRole();
      return sr ? ROLE_LABELS[sr] || sr : "";
    },
    getUserName: function () {
      var s = parseSession();
      return (s && (s.name || s.fullName || s.email)) || "Mtumiaji";
    },
    canAccessModule: canAccessModule,
    logout: logout,
    requireLogin: function () {
      if (!parseSession()) {
        window.location.href = "auth-login.html?next=" + encodeURIComponent(window.location.pathname.split("/").pop() || "dashboard.html");
        return false;
      }
      return true;
    },
  };
})();
