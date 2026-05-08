(() => {
  if (window.__kmktPremiumEnhancementsInstalled) return;
  window.__kmktPremiumEnhancementsInstalled = true;

  const applyButtonTypes = () => {
    document.querySelectorAll("button:not([type])").forEach((button) => {
      button.type = "button";
    });
  };

  const applyLazyImages = () => {
    document.querySelectorAll("img:not([loading])").forEach((img) => {
      img.loading = "lazy";
      img.decoding = "async";
    });
  };

  const protectBrokenAnchors = () => {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const targetId = href.slice(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) {
        anchor.classList.add("kmkt-disabled-anchor");
        anchor.addEventListener("click", (event) => {
          event.preventDefault();
        });
      }
    });
  };

  const makeTablesScrollable = () => {
    document.querySelectorAll("table").forEach((table) => {
      const parent = table.parentElement;
      if (!parent) return;
      if (parent.classList.contains("kmkt-table-scroll")) return;
      if (parent.classList.contains("table-wrap")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "kmkt-table-scroll";
      parent.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  };

  const standardizeExternalLinks = () => {
    document.querySelectorAll('a[target="_blank"]').forEach((anchor) => {
      const rel = (anchor.getAttribute("rel") || "").toLowerCase();
      if (!rel.includes("noopener")) {
        anchor.setAttribute("rel", rel ? `${rel} noopener noreferrer` : "noopener noreferrer");
      }
    });
  };

  const applyMobilePaddingClass = () => {
    document.querySelectorAll("main, .layout, .section").forEach((node) => {
      node.classList.add("kmkt-mobile-pad");
    });
  };

  const apply = () => {
    applyButtonTypes();
    applyLazyImages();
    protectBrokenAnchors();
    makeTablesScrollable();
    standardizeExternalLinks();
    applyMobilePaddingClass();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
