(function () {
  const byId = (id) => document.getElementById(id);
  const now = () => new Date().toLocaleString();

  function getSnapshot() {
    if (window.KMKT_ANALYTICS?.getSnapshot) return window.KMKT_ANALYTICS.getSnapshot();
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      onlineCount: 0,
      onlineSessions: {},
      pageHits: {},
      latest: [],
    };
  }

  function render() {
    const s = getSnapshot();
    byId("kTotal").textContent = s.totalVisits || 0;
    byId("kUnique").textContent = s.uniqueVisitors || 0;
    byId("kOnline").textContent = s.onlineCount || 0;
    byId("kPages").textContent = Object.keys(s.pageHits || {}).length;
    byId("lastRefresh").textContent = `Last refresh: ${now()}`;

    const onlineRows = Object.values(s.onlineSessions || {});
    byId("onlineBody").innerHTML = onlineRows.length
      ? onlineRows
          .map(
            (r) =>
              `<tr><td>${r.actor_name || "ANONYMOUS"}</td><td>${r.role || "visitor"}</td><td>${r.country || "-"} / ${r.city || "-"}</td><td>${r.current_page || "-"}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="4">Hakuna online sessions sasa.</td></tr>`;

    const pageRows = Object.entries(s.pageHits || {}).sort((a, b) => b[1] - a[1]);
    byId("pagesBody").innerHTML = pageRows.length
      ? pageRows.map(([page, hits]) => `<tr><td>${page}</td><td>${hits}</td></tr>`).join("")
      : `<tr><td colspan="2">Hakuna page hits bado.</td></tr>`;

    const latest = (s.latest || []).slice(0, 40);
    byId("latestBody").innerHTML = latest.length
      ? latest
          .map(
            (r) =>
              `<tr><td>${r.created_at || "-"}</td><td>${r.actor_name || "ANONYMOUS"}</td><td>${r.role || "visitor"}</td><td>${r.country || "-"} / ${r.city || "-"}</td><td>${r.page || "-"}</td><td>${r.referrer || "-"}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="6">Hakuna latest visits bado.</td></tr>`;
  }

  byId("refreshBtn")?.addEventListener("click", render);
  render();
  setInterval(render, 15000);
})();
