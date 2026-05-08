(function () {
  const byId = (id) => document.getElementById(id);

  function getSnapshot() {
    if (window.KMKT_ANALYTICS?.getSnapshot) return window.KMKT_ANALYTICS.getSnapshot();
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      onlineCount: 0,
      onlineSessions: {},
      pageHits: {},
    };
  }

  function renderKpis(s) {
    const wrap = byId("websiteAnalyticsKpis");
    if (!wrap) return;
    wrap.innerHTML = `
      <article class="kpi"><p>Total Visits</p><h4>${s.totalVisits || 0}</h4></article>
      <article class="kpi"><p>Unique Visitors</p><h4>${s.uniqueVisitors || 0}</h4></article>
      <article class="kpi"><p>Online Sasa</p><h4>${s.onlineCount || 0}</h4></article>
      <article class="kpi"><p>Tracked Pages</p><h4>${Object.keys(s.pageHits || {}).length}</h4></article>
    `;
  }

  function renderOnline(s) {
    const body = byId("websiteOnlineBody");
    if (!body) return;
    const rows = Object.values(s.onlineSessions || {});
    body.innerHTML = rows.length
      ? rows
          .map(
            (r) =>
              `<tr><td>${r.actor_name || "ANONYMOUS"}</td><td>${r.role || "visitor"}</td><td>${r.country || "-"} / ${r.city || "-"}</td><td>${r.current_page || "-"}</td><td><span class="status active">Online</span></td></tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="empty">Hakuna sessions online kwa sasa.</td></tr>`;
  }

  function renderAll() {
    const s = getSnapshot();
    renderKpis(s);
    renderOnline(s);
  }

  renderAll();
  setInterval(renderAll, 15000);
})();
