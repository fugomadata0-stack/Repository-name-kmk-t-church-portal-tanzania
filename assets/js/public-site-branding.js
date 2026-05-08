import { fetchBrandingRow, applyBrandingToIndexDom } from "./site-branding-service.js";

async function run() {
  try {
    const row = await fetchBrandingRow();
    if (row) applyBrandingToIndexDom(row);
  } catch (_) {
    /* fail silently — index hubaki na default */
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
