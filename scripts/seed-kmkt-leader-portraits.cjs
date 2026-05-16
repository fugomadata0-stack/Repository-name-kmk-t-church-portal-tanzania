/**
 * Tengeneza na pakia picha za viongozi (SVG + initiale) — tofauti na logo moja.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { spawnSync } = require("child_process");
const { mergePortalEnv } = require("./supabase-env-merge.cjs");

const root = path.join(__dirname, "..");
const appNext = path.join(root, "app-next");
const tmpDir = path.join(root, ".temp-leader-portraits");

const LEADERS = [
  { role: "askofu_mkuu", initials: "LM", name: "LAMECK NICODEMUS MANJI", bg: "#0B1F3A", accent: "#D4AF37" },
  { role: "katibu_mkuu", initials: "JS", name: "MCH JOHN MUTTANI SEAN", bg: "#123C69", accent: "#F5E6B4" },
  { role: "naibu_katibu_mkuu", initials: "ZB", name: "Zakaria Rukonge Bunini", bg: "#1a4d2e", accent: "#D4AF37" },
  { role: "mhasibu_mkuu", initials: "SC", name: "MCH SOSPITER MASAMAKI CHANGURU", bg: "#4a1942", accent: "#FFFFFF" },
];

function readEnvLocal() {
  const file = path.join(appNext, ".env.local");
  const out = {};
  try {
    const txt = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    for (const line of txt.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
  } catch {
    /* */
  }
  return out;
}

function svgPortrait(initials, bg, accent) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${bg}"/>
  <circle cx="256" cy="200" r="120" fill="${accent}" opacity="0.25"/>
  <text x="256" y="240" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="120" font-weight="700" fill="${accent}">${initials}</text>
  <text x="256" y="460" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="28" fill="${accent}" opacity="0.9">KMK(T)</text>
</svg>`;
}

function publicUrl(supabaseUrl, storagePath) {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/site-assets/${storagePath}`;
}

async function main() {
  if (!process.env.NODE_OPTIONS?.includes("use-system-ca")) {
    const major = Number(/^v?(\d+)/.exec(process.version)?.[1] ?? 0);
    if (major >= 22) process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --use-system-ca`.trim();
  }

  const env = readEnvLocal();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Weka VITE_SUPABASE_* kwenye app-next/.env.local");
    process.exit(1);
  }

  fs.mkdirSync(tmpDir, { recursive: true });
  const supabase = createClient(url, key);
  const urls = {};

  console.log("\nKMK(T) — leader portraits → site-assets\n");

  for (const L of LEADERS) {
    const storagePath = `about/national/${L.role}.svg`;
    const filePath = path.join(tmpDir, `${L.role}.svg`);
    fs.writeFileSync(filePath, svgPortrait(L.initials, L.bg, L.accent), "utf8");
    const buf = fs.readFileSync(filePath);
    const { error } = await supabase.storage.from("site-assets").upload(storagePath, buf, {
      upsert: true,
      contentType: "image/svg+xml",
      cacheControl: "3600",
    });
    if (error) throw new Error(`${storagePath}: ${error.message}`);
    urls[L.role] = publicUrl(url, storagePath);
    console.log(`  ✓ ${L.name} → ${storagePath}`);
  }

  const esc = (s) => s.replace(/'/g, "''");
  const sql = LEADERS.map(
    (L) => `
update public.national_leadership_profiles
set profile_photo_url = '${esc(urls[L.role])}', updated_at = now()
where role_key = '${L.role}';

update public.church_structure_leaders
set photo_url = '${esc(urls[L.role])}', updated_at = now()
where lower(trim(full_name)) = lower('${esc(L.name)}');
`
  ).join("\n");

  const tmp = path.join(root, ".temp-leader-portraits.sql");
  fs.writeFileSync(tmp, sql, "utf8");
  mergePortalEnv();
  const r = spawnSync("npx", ["supabase", "db", "query", "-f", tmp, "--linked", "--workdir", root], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* */
  }
  if (r.status !== 0) throw new Error("DB update failed");

  console.log("\n✓ Picha za viongozi (initiale) zimewekwa.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
