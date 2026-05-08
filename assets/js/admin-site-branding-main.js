/**
 * Admin: Branding + upload kwenye Storage (chief_admin / super_admin + JWT ya Supabase kwa write).
 */
import { createSupabaseBrowserClient, fetchBrandingRow } from "./site-branding-service.js";

const SESSION_KEY = "kmt_session";
const DEFAULT_LOGO_PREVIEW = "assets/images/church-modern.svg";
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

let logoPreviewBlobUrl = null;

function getLocalRole() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s?.role || "";
  } catch (_) {
    return "";
  }
}

function showMsg(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind || "info";
  el.style.display = "block";
}

function previewFile(inputEl, imgEl) {
  const f = inputEl?.files?.[0];
  if (!f || !imgEl) return;
  const url = URL.createObjectURL(f);
  imgEl.src = url;
}

function previewLogoFile(inputEl, imgEl) {
  const f = inputEl?.files?.[0];
  if (!f || !imgEl) return;
  if (logoPreviewBlobUrl) {
    URL.revokeObjectURL(logoPreviewBlobUrl);
    logoPreviewBlobUrl = null;
  }
  logoPreviewBlobUrl = URL.createObjectURL(f);
  imgEl.src = logoPreviewBlobUrl;
}

function guessExtFromMimeAndUrl(mime, url) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("svg")) return ".svg";
  if (m.includes("png")) return ".png";
  if (m.includes("webp")) return ".webp";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  const u = String(url).match(/\.(svg|png|jpe?g|webp)(\?|#|$)/i);
  if (u) return u[1].toLowerCase().startsWith("jp") ? ".jpg" : "." + u[1].toLowerCase();
  return ".png";
}

async function loadState() {
  const row = await fetchBrandingRow();
  const elHero = document.getElementById("previewHero");
  const elCross = document.getElementById("previewCross");
  const elLogo = document.getElementById("previewLogo");
  const elStatus = document.getElementById("adminBrandingStatus");
  const pick = (v, fb) => {
    const t = String(v || "").trim();
    return /^https?:\/\//i.test(t) ? t : fb;
  };

  if (!row) {
    showMsg(elStatus, "Hakuna safu ya branding — endesha sql/kmt-site-branding-v1.sql kwenye Supabase.", "warn");
    if (elLogo && !logoPreviewBlobUrl) elLogo.src = DEFAULT_LOGO_PREVIEW;
    return;
  }

  if (elHero) elHero.src = pick(row.jesus_image, elHero.src);
  if (elCross) elCross.src = pick(row.cross_image, elCross.src);
  if (elLogo && !logoPreviewBlobUrl) {
    elLogo.src = pick(row.logo, DEFAULT_LOGO_PREVIEW);
  }

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };
  setVal("urlJesus", row.jesus_image);
  setVal("urlCross", row.cross_image);
  setVal("urlHeroBg", row.hero_bg);
  setVal("urlLogo", row.logo);
}

async function uploadAndUpdate(fieldColumn, fileInput) {
  const f = fileInput?.files?.[0];
  if (!f) return { ok: false, message: "Chagua faili kwanza." };
  if (f.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "Faili ni kubwa sana — tumia chini ya 4 MB." };
  }
  const s = createSupabaseBrowserClient();
  if (!s) return { ok: false, message: "Supabase haijawashwa." };
  const { data: sess } = await s.auth.getSession();
  if (!sess?.session) {
    return {
      ok: false,
      message:
        "Unahitaji kuingia kwa akaunti ya Supabase (email/nenosiri) ili kupakia. Login ya legacy (localStorage pekee) haiwezi kuandika RLS.",
    };
  }
  const path = `uploads/${fieldColumn}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
  const { error: upErr } = await s.storage.from("site-branding").upload(path, f, { upsert: true, contentType: f.type || undefined });
  if (upErr) return { ok: false, message: upErr.message || "Upload imeshindwa (angalia RLS / bucket)." };
  const { data: pub } = s.storage.from("site-branding").getPublicUrl(path);
  const url = pub?.publicUrl;
  if (!url) return { ok: false, message: "Haikuweza kupata public URL." };

  const { data: row } = await s.from("branding_settings").select("id").limit(1).maybeSingle();
  const payload = { [fieldColumn]: url };
  if (row?.id) {
    const { error } = await s.from("branding_settings").update(payload).eq("id", row.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await s.from("branding_settings").insert(payload);
    if (error) return { ok: false, message: error.message };
  }
  return { ok: true, message: "Imehifadhiwa.", url };
}

async function saveUrls() {
  const s = createSupabaseBrowserClient();
  const elStatus = document.getElementById("adminBrandingStatus");
  if (!s) {
    showMsg(elStatus, "Supabase haijawashwa.", "err");
    return;
  }
  const { data: sess } = await s.auth.getSession();
  if (!sess?.session) {
    showMsg(elStatus, "Ingia kwa Supabase Auth ili kuhifadhi URL.", "err");
    return;
  }
  const payload = {
    logo: document.getElementById("urlLogo")?.value?.trim() || "",
    jesus_image: document.getElementById("urlJesus")?.value?.trim() || "",
    cross_image: document.getElementById("urlCross")?.value?.trim() || "",
    hero_bg: document.getElementById("urlHeroBg")?.value?.trim() || "",
  };
  const { data: row } = await s.from("branding_settings").select("id").limit(1).maybeSingle();
  let err;
  if (row?.id) ({ error: err } = await s.from("branding_settings").update(payload).eq("id", row.id));
  else ({ error: err } = await s.from("branding_settings").insert(payload));
  showMsg(elStatus, err ? err.message : "URL zimehifadhiwa (pamoja na nembo).", err ? "err" : "ok");
  await loadState();
}

async function downloadLogo() {
  const elStatus = document.getElementById("adminBrandingStatus");
  const fileInput = document.getElementById("fileLogo");
  const localFile = fileInput?.files?.[0];
  if (localFile) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(localFile);
    a.download = localFile.name.replace(/[^\w.\-]/g, "_") || "kmk-church-logo.png";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    showMsg(elStatus, "Faili la chaguo limepakuliwa.", "ok");
    return;
  }
  const preview = document.getElementById("previewLogo");
  const src = preview?.src || "";
  if (!src || src.indexOf("church-modern.svg") !== -1) {
    showMsg(elStatus, "Pakiya nembo au weka URL kwanza, kisha hifadhi.", "warn");
    return;
  }
  if (src.startsWith("blob:")) {
    showMsg(elStatus, "Tumia faili ulilochagua — tayari lipo kwenye kifaa.", "info");
    return;
  }
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const ext = guessExtFromMimeAndUrl(blob.type, src);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kmk-church-logo" + ext;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    showMsg(elStatus, "Nembo limepakuliwa.", "ok");
  } catch (_) {
    const a = document.createElement("a");
    a.href = src;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showMsg(elStatus, "Imefungua kiungo — hifadhi picha kwa mkono ikiwa haipaki moja kwa moja.", "info");
  }
}

async function init() {
  const role = getLocalRole();
  const elGate = document.getElementById("adminBrandingGate");
  const elMain = document.getElementById("adminBrandingMain");
  if (!["chief_admin", "super_admin"].includes(role)) {
    if (elGate) elGate.style.display = "block";
    if (elMain) elMain.style.display = "none";
    return;
  }
  if (elGate) elGate.style.display = "none";
  if (elMain) elMain.style.display = "block";

  await loadState();

  document.getElementById("fileLogo")?.addEventListener("change", (e) => previewLogoFile(e.target, document.getElementById("previewLogo")));
  document.getElementById("fileJesus")?.addEventListener("change", (e) => previewFile(e.target, document.getElementById("previewHero")));
  document.getElementById("fileCross")?.addEventListener("change", (e) => previewFile(e.target, document.getElementById("previewCross")));

  document.getElementById("btnUploadLogo")?.addEventListener("click", async () => {
    const st = await uploadAndUpdate("logo", document.getElementById("fileLogo"));
    showMsg(document.getElementById("adminBrandingStatus"), st.message, st.ok ? "ok" : "err");
    if (st.ok) {
      const fi = document.getElementById("fileLogo");
      if (fi) fi.value = "";
      if (logoPreviewBlobUrl) {
        URL.revokeObjectURL(logoPreviewBlobUrl);
        logoPreviewBlobUrl = null;
      }
      await loadState();
    }
  });
  document.getElementById("btnDownloadLogo")?.addEventListener("click", downloadLogo);

  document.getElementById("btnUploadJesus")?.addEventListener("click", async () => {
    const st = await uploadAndUpdate("jesus_image", document.getElementById("fileJesus"));
    showMsg(document.getElementById("adminBrandingStatus"), st.message, st.ok ? "ok" : "err");
    if (st.ok) await loadState();
  });
  document.getElementById("btnUploadCross")?.addEventListener("click", async () => {
    const st = await uploadAndUpdate("cross_image", document.getElementById("fileCross"));
    showMsg(document.getElementById("adminBrandingStatus"), st.message, st.ok ? "ok" : "err");
    if (st.ok) await loadState();
  });
  document.getElementById("btnSaveUrls")?.addEventListener("click", saveUrls);
}

init();
