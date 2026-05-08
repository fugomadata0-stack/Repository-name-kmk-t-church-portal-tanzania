/**
 * Mteja wa Supabase + uthibitishaji wa mipangilio (XAMPP / tovuti).
 * Weka funguo katika `supabase-config.local.js` (nakili kutoka .example); `supabase-config.js` ni muunganishaji tu.
 */
export function describeSupabaseConfig() {
  const cfg = typeof window !== "undefined" ? window.KMT_SUPABASE_CONFIG : null;
  const reasons = [];

  if (!cfg) {
    reasons.push("KMT_SUPABASE_CONFIG haipo — hakikisha faili supabase-config.js lipo na limepakuliwa kwenye XAMPP");
    return { ok: false, reasons, summary: reasons.join("; ") };
  }
  if (cfg.enabled !== true) {
    reasons.push('enabled si true — weka enabled: true baada ya kuweka url na anonKey sahihi');
  }
  const url = cfg.url != null ? String(cfg.url).trim() : "";
  const anonKey = cfg.anonKey != null ? String(cfg.anonKey).trim() : "";
  if (!url) reasons.push("url ni tupu");
  if (!anonKey) reasons.push("anonKey ni tupu");

  if (typeof window !== "undefined" && typeof window.supabase === "undefined") {
    reasons.push(
      "maktaba @supabase/supabase-js haijalodiwa — weka kabla ya supabase-config.js (CDN au npm)"
    );
  }

  if (url && !/^https:\/\/.+/i.test(url)) {
    reasons.push("url lazima ianze na https://");
  }

  if (anonKey) {
    const jwtLike = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(anonKey);
    const publishable = /^sb_publishable_/i.test(anonKey) || /^sb_secret_/i.test(anonKey);
    if (!jwtLike && !publishable && anonKey.length < 36) {
      reasons.push(
        "anonKey inaonekana fupi au si kamili — nakili kutoka Supabase → Project Settings → API Keys"
      );
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    summary: reasons.length ? reasons.join("; ") : "OK",
  };
}

export function getSupabaseClient() {
  const d = describeSupabaseConfig();
  if (!d.ok) return null;
  const cfg = window.KMT_SUPABASE_CONFIG;
  const url = String(cfg.url).trim();
  const anonKey = String(cfg.anonKey).trim();
  return window.supabase.createClient(url, anonKey);
}

/**
 * Thibitisha mitandao + URL + ufunguo kwa Auth API (siyo jedwali maalum).
 * Kurudi { ok, detail } — tumia kabla ya kuamini data ya DB.
 */
export async function verifySupabaseConnectivity() {
  const d = describeSupabaseConfig();
  if (!d.ok) {
    return { ok: false, detail: d.summary };
  }

  const cfg = window.KMT_SUPABASE_CONFIG;
  const base = String(cfg.url).trim().replace(/\/$/, "");
  const key = String(cfg.anonKey).trim();
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  try {
    const res = await fetch(`${base}/auth/v1/health`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const raw = await res.text();
    let json = {};
    try {
      json = JSON.parse(raw);
    } catch (_) {
      /* non-JSON body */
    }

    if (res.ok) {
      const v = json.version || json.name;
      return {
        ok: true,
        detail: v ? `Imeunganishwa · Auth API (${v})` : "Imeunganishwa · Auth API OK",
      };
    }

    const msg = json.error_description || json.msg || json.message || raw?.slice(0, 160) || res.statusText;
    return {
      ok: false,
      detail: `Auth API HTTP ${res.status}: ${msg}`,
    };
  } catch (e) {
    const client = getSupabaseClient();
    if (!client) {
      return {
        ok: false,
        detail: e?.message || String(e),
      };
    }
    try {
      const { error } = await client.auth.getSession();
      if (error) {
        return {
          ok: false,
          detail: `${e?.message || "Mtandao"} · pia session: ${error.message}`,
        };
      }
      return {
        ok: true,
        detail:
          "Mteja umeundwa; jaribu tena ukaguzi wa mtandao (CORS / firewall) au fungua system-health.html",
      };
    } catch (e2) {
      return {
        ok: false,
        detail: e?.message || e2?.message || String(e2),
      };
    }
  }
}
