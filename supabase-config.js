/**
 * Muunganisho wa Supabase — kurasa za HTML (hati safi kwenye Git).
 *
 * 1) Pakia kabla ya faili hii (baada ya @supabase/supabase-js):
 *    <script src="supabase-config.local.js"></script>
 * 2) Katika supabase-config.local.js weka:
 *    window.KMT_SUPABASE_LOCAL = { url: "https://xxx.supabase.co", anonKey: "...", enabled: true };
 *
 * Unaweza pia kuweka window.KMT_SUPABASE_LOCAL kwenye script ndogo kabla ya faili hii.
 */
(function () {
  var base = { url: "", anonKey: "", enabled: false };
  var ext =
    typeof window !== "undefined" && window.KMT_SUPABASE_LOCAL && typeof window.KMT_SUPABASE_LOCAL === "object"
      ? window.KMT_SUPABASE_LOCAL
      : {};
  var cfg = {};
  for (var k in base) {
    if (Object.prototype.hasOwnProperty.call(base, k)) cfg[k] = base[k];
  }
  for (var k2 in ext) {
    if (Object.prototype.hasOwnProperty.call(ext, k2)) cfg[k2] = ext[k2];
  }
  var url = cfg.url != null ? String(cfg.url).trim() : "";
  var key = cfg.anonKey != null ? String(cfg.anonKey).trim() : "";
  if (url && key) {
    cfg.enabled = cfg.enabled !== false;
  } else {
    cfg.enabled = false;
  }
  window.KMT_SUPABASE_CONFIG = cfg;
})();
