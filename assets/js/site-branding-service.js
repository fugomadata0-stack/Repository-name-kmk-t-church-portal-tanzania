/**
 * Huduma ya pamoja — kusoma branding_settings (umma / anon) na kutumika kwenye DOM.
 */

const DASH_IMG = {
  jesus: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=600&q=80",
  bible: "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=600&q=80",
  church: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=600&q=80",
};

function pickHttpUrl(value, fallback) {
  const v = String(value ?? "").trim();
  if (/^https?:\/\//i.test(v)) return v;
  return fallback;
}

export function createSupabaseBrowserClient() {
  const cfg = typeof window !== "undefined" ? window.KMT_SUPABASE_CONFIG : null;
  if (!cfg?.enabled || !cfg.url || !cfg.anonKey || !window.supabase?.createClient) return null;
  return window.supabase.createClient(cfg.url, cfg.anonKey);
}

/** Soma safu ya kwanza ya branding (umma — anon inaruhusiwa na RLS). */
export async function fetchBrandingRow() {
  const s = createSupabaseBrowserClient();
  if (!s) return null;
  try {
    const { data, error } = await s.from("branding_settings").select("*").limit(1).maybeSingle();
    if (error) return null;
    return data || null;
  } catch (_) {
    return null;
  }
}

/** Viwango vya picha za dashibodi (vitendo 3 vya hero). */
export function getDashboardVisualUrls(branding) {
  const b = branding || {};
  return {
    heroBg: pickHttpUrl(b.hero_bg, ""),
    imgJesus: pickHttpUrl(b.jesus_image, DASH_IMG.jesus),
    imgBible: pickHttpUrl(b.bible_image, DASH_IMG.bible),
    imgChurch: pickHttpUrl(b.church_image, DASH_IMG.church),
  };
}

/** Nembo kwenye sidebar ya Dashibodi Premium. */
export function applyLogoToDashboardSidebar(branding) {
  if (typeof document === "undefined") return;
  const el = document.getElementById("dashboardBrandLogoSlot");
  if (!el) return;
  const logo = pickHttpUrl(branding?.logo, "");
  el.textContent = "";
  if (logo) {
    const img = document.createElement("img");
    img.src = logo;
    img.alt = "KMK(T) National Church Portal";
    img.className = "kmt-dashboard-logo-img";
    img.loading = "eager";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer-when-downgrade";
    img.onerror = function () {
      el.textContent = "✝";
    };
    el.appendChild(img);
  } else {
    el.textContent = "✝";
  }
}

/** Ukurasa wa mwanzo: nembo, picha kuu, msalaba, rangi ya accent (hiari). */
export function applyBrandingToIndexDom(branding) {
  if (!branding || typeof document === "undefined") return;

  const slot = document.getElementById("brandMarkSlot");
  if (slot) {
    const logo = pickHttpUrl(branding.logo, "");
    slot.innerHTML = "";
    if (logo) {
      const img = document.createElement("img");
      img.src = logo;
      img.alt = "Nembo ya KMK(T)";
      img.className = "kmt-brand-logo-header";
      img.width = 42;
      img.height = 42;
      img.loading = "eager";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer-when-downgrade";
      img.onerror = function () {
        slot.innerHTML = "";
        const sp = document.createElement("span");
        sp.className = "brand-mark";
        sp.textContent = "✝";
        slot.appendChild(sp);
      };
      slot.appendChild(img);
    } else {
      const sp = document.createElement("span");
      sp.className = "brand-mark";
      sp.textContent = "✝";
      slot.appendChild(sp);
    }
  }

  const heroImg = document.getElementById("heroMainImage");
  const jesus = pickHttpUrl(branding.jesus_image, "");
  if (heroImg && jesus) {
    heroImg.src = jesus;
    heroImg.loading = "eager";
  }
  const cw = document.querySelector(".cross-watermark");
  const cross = pickHttpUrl(branding.cross_image, "");
  if (cw) {
    if (cross) {
      cw.innerHTML = "";
      const img = document.createElement("img");
      img.src = cross;
      img.alt = "Msalaba";
      img.className = "cross-watermark-img";
      img.decoding = "async";
      img.loading = "lazy";
      cw.appendChild(img);
      cw.setAttribute("data-kmt-cross", "image");
    } else {
      cw.textContent = "✝";
      cw.removeAttribute("data-kmt-cross");
    }
  }
  const accent = String(branding.accent_color || "").trim();
  if (/^#[0-9a-f]{3,8}$/i.test(accent)) {
    document.documentElement.style.setProperty("--kmt-brand-accent", accent);
  }
}
