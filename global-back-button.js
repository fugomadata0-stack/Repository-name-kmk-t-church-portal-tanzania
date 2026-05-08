(() => {
  if (window.__kmktBackButtonInstalled) return;
  window.__kmktBackButtonInstalled = true;
  if (!window.__kmktUppercaseInstalled) {
    window.__kmktUppercaseInstalled = true;
    const shouldSkipUppercase = (el) => {
      if (!(el instanceof HTMLElement)) return true;
      if (el instanceof HTMLInputElement) {
        const type = String(el.type || "").toLowerCase();
        const name = String(el.name || "").toLowerCase();
        const id = String(el.id || "").toLowerCase();
        const placeholder = String(el.placeholder || "").toLowerCase();
        if (type === "email") return true;
        if (name.includes("email") || id.includes("email") || placeholder.includes("email")) return true;
        return false;
      }
      if (el instanceof HTMLTextAreaElement) {
        const name = String(el.name || "").toLowerCase();
        const id = String(el.id || "").toLowerCase();
        const placeholder = String(el.placeholder || "").toLowerCase();
        return name.includes("email") || id.includes("email") || placeholder.includes("email");
      }
      return true;
    };

    const normalizeUppercase = (el) => {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      if (shouldSkipUppercase(el)) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = String(el.value || "").toUpperCase();
      if (next === el.value) return;
      el.value = next;
      if (typeof start === "number" && typeof end === "number") {
        try {
          el.setSelectionRange(start, end);
        } catch (_) {
          // ignore cursor restore errors for unsupported inputs
        }
      }
    };

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        normalizeUppercase(target);
      }
    });

    document.addEventListener("blur", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        normalizeUppercase(target);
      }
    }, true);
  }

  if (!window.__kmktVisitorAnalyticsInstalled) {
    window.__kmktVisitorAnalyticsInstalled = true;
    const KEY_VISITOR = "kmt_visitor_id";
    const KEY_SESSION = "kmt_visit_session_id";
    const KEY_STATS = "kmt_visit_stats";
    const KEY_ONLINE = "kmt_online_sessions";
    const KEY_GEO = "kmt_geo_cache";
    const ONLINE_STALE_MS = 90 * 1000;

    const nowIso = () => new Date().toISOString();
    const randomId = () =>
      (window.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`).replace(/-/g, "");

    const readJson = (key, fallback) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_) {
        return fallback;
      }
    };
    const writeJson = (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (_) {
        // ignore storage errors
      }
    };

    const getVisitorId = () => {
      let id = localStorage.getItem(KEY_VISITOR);
      if (!id) {
        id = randomId();
        localStorage.setItem(KEY_VISITOR, id);
      }
      return id;
    };
    const getSessionId = () => {
      let id = sessionStorage.getItem(KEY_SESSION);
      if (!id) {
        id = randomId();
        sessionStorage.setItem(KEY_SESSION, id);
      }
      return id;
    };

    const getActor = () => {
      try {
        const raw = localStorage.getItem("kmt_session");
        if (!raw) return { role: "visitor", name: "ANONYMOUS", email: "" };
        const s = JSON.parse(raw);
        return {
          role: s.role || "visitor",
          name: s.name || "ANONYMOUS",
          email: s.email || "",
        };
      } catch (_) {
        return { role: "visitor", name: "ANONYMOUS", email: "" };
      }
    };

    const loadGeo = async () => {
      try {
        const cached = sessionStorage.getItem(KEY_GEO);
        if (cached) return JSON.parse(cached);
      } catch (_) {}
      const fallback = { country: "UNKNOWN", city: "UNKNOWN", ip: "-" };
      try {
        const res = await fetch("https://ipapi.co/json/", { method: "GET" });
        if (!res.ok) return fallback;
        const data = await res.json();
        const geo = {
          country: data.country_name || data.country || "UNKNOWN",
          city: data.city || "UNKNOWN",
          ip: data.ip || "-",
        };
        try {
          sessionStorage.setItem(KEY_GEO, JSON.stringify(geo));
        } catch (_) {}
        return geo;
      } catch (_) {
        return fallback;
      }
    };

    const updateLocalStats = (event) => {
      const stats = readJson(KEY_STATS, {
        totalVisits: 0,
        uniqueVisitors: {},
        pageHits: {},
        latest: [],
      });
      stats.totalVisits += 1;
      stats.uniqueVisitors[event.visitor_id] = nowIso();
      stats.pageHits[event.page] = (stats.pageHits[event.page] || 0) + 1;
      stats.latest.unshift(event);
      stats.latest = stats.latest.slice(0, 100);
      stats.uniqueCount = Object.keys(stats.uniqueVisitors).length;
      writeJson(KEY_STATS, stats);
      return stats;
    };

    const updateOnlineSessions = (sessionId, payload) => {
      const map = readJson(KEY_ONLINE, {});
      const nowMs = Date.now();
      Object.keys(map).forEach((k) => {
        const row = map[k];
        if (!row?.lastSeen || nowMs - row.lastSeen > ONLINE_STALE_MS) delete map[k];
      });
      map[sessionId] = {
        ...map[sessionId],
        ...payload,
        lastSeen: nowMs,
      };
      writeJson(KEY_ONLINE, map);
      return map;
    };

    const markOffline = (sessionId) => {
      const map = readJson(KEY_ONLINE, {});
      delete map[sessionId];
      writeJson(KEY_ONLINE, map);
    };

    const getSupabaseClient = () => {
      if (!window.KMT_SUPABASE_CONFIG?.enabled || !window.supabase?.createClient) return null;
      const { url, anonKey } = window.KMT_SUPABASE_CONFIG;
      if (!url || !anonKey) return null;
      return window.supabase.createClient(url, anonKey);
    };

    const syncSupabaseAnalytics = async (event, onlinePayload) => {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        await client.from("web_visit_events").insert(event);
      } catch (_) {}
      try {
        await client
          .from("web_online_presence")
          .upsert({ ...onlinePayload, last_seen: new Date().toISOString(), is_online: true }, { onConflict: "session_id" });
      } catch (_) {}
    };

    const bootstrapTracking = async () => {
      const visitorId = getVisitorId();
      const sessionId = getSessionId();
      const actor = getActor();
      const geo = await loadGeo();
      const page = window.location.pathname || "index.html";
      const event = {
        visitor_id: visitorId,
        session_id: sessionId,
        page,
        referrer: document.referrer || "-",
        role: actor.role,
        actor_name: actor.name,
        actor_email: actor.email || null,
        country: geo.country,
        city: geo.city,
        ip_hint: geo.ip,
        user_agent: navigator.userAgent,
        language: navigator.language || "sw",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        created_at: nowIso(),
      };
      const stats = updateLocalStats(event);
      const onlinePayload = {
        session_id: sessionId,
        visitor_id: visitorId,
        actor_name: actor.name,
        actor_email: actor.email || null,
        role: actor.role,
        country: geo.country,
        city: geo.city,
        current_page: page,
      };
      updateOnlineSessions(sessionId, onlinePayload);
      syncSupabaseAnalytics(event, onlinePayload);

      window.KMKT_ANALYTICS = {
        getSnapshot: () => {
          const online = readJson(KEY_ONLINE, {});
          const onlineCount = Object.keys(online).length;
          return {
            totalVisits: stats.totalVisits,
            uniqueVisitors: stats.uniqueCount || 0,
            onlineCount,
            onlineSessions: online,
            pageHits: stats.pageHits || {},
            latest: stats.latest || [],
          };
        },
      };

      setInterval(() => {
        updateOnlineSessions(sessionId, onlinePayload);
      }, 30000);

      window.addEventListener("beforeunload", () => markOffline(sessionId));
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          markOffline(sessionId);
        } else {
          updateOnlineSessions(sessionId, onlinePayload);
        }
      });
    };

    bootstrapTracking().catch(() => {});
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "← Rudi Nyuma / Back";
  btn.setAttribute("aria-label", "Rudi nyuma");
  btn.style.position = "fixed";
  btn.style.left = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "9999";
  btn.style.border = "1px solid rgba(212,177,74,.5)";
  btn.style.background = "linear-gradient(180deg,#1b3f73,#0a1f3e)";
  btn.style.color = "#fff";
  btn.style.borderRadius = "999px";
  btn.style.padding = "8px 12px";
  btn.style.fontSize = "12px";
  btn.style.fontWeight = "700";
  btn.style.cursor = "pointer";
  btn.style.boxShadow = "0 8px 18px rgba(0,0,0,.25)";

  btn.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    const fallback = document.body?.dataset?.backFallback || "dashboard.html";
    window.location.href = fallback;
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(btn);
  });
})();
