/**
 * Pakia nembo/hero za KMK(T) kwenye site-assets (njia zinazoruhusiwa kwa anon)
 * na sasisha URL kwenye DB kupitia pooler (SUPABASE_DB_PASSWORD au SUPABASE_DATABASE_URL).
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { spawnSync } = require("child_process");
const { mergePortalEnv, PROJECT_REF } = require("./supabase-env-merge.cjs");

const root = path.join(__dirname, "..");
const appNext = path.join(root, "app-next");

function readEnvLocal() {
  mergePortalEnv();
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

function publicUrl(supabaseUrl, storagePath) {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/site-assets/${storagePath}`;
}

async function uploadFile(supabase, storagePath, filePath, contentType) {
  const buf = fs.readFileSync(filePath);
  const { error } = await supabase.storage.from("site-assets").upload(storagePath, buf, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  if (error) throw new Error(`${storagePath}: ${error.message}`);
  console.log(`  ✓ uploaded ${storagePath}`);
}

function runSql(sql) {
  const tmp = path.join(root, ".temp-seed-branding.sql");
  fs.writeFileSync(tmp, sql, "utf8");
  mergePortalEnv();
  const r = spawnSync(
    "npx",
    ["supabase", "db", "query", "-f", tmp, "--linked", "--workdir", root],
    { stdio: "inherit", shell: true, env: process.env }
  );
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* */
  }
  if (r.status !== 0) {
    throw new Error("SQL update failed (supabase db query --linked)");
  }
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
    console.error("Weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY kwenye app-next/.env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const assets = [
    {
      storagePath: "about/logo/kmkt-logo.svg",
      file: path.join(appNext, "src/assets/images/branding/kmkt-logo.svg"),
      type: "image/svg+xml",
    },
    {
      storagePath: "favicon/favicon.svg",
      file: path.join(appNext, "public/favicon.svg"),
      type: "image/svg+xml",
    },
    {
      storagePath: "about/hero/church-hero.svg",
      file: path.join(appNext, "public/images/hero/church-congregation.svg"),
      type: "image/svg+xml",
    },
    {
      storagePath: "about/national/askofu_mkuu.svg",
      file: path.join(appNext, "src/assets/images/branding/kmkt-logo.svg"),
      type: "image/svg+xml",
    },
    {
      storagePath: "about/national/katibu_mkuu.svg",
      file: path.join(appNext, "src/assets/images/branding/kmkt-logo.svg"),
      type: "image/svg+xml",
    },
    {
      storagePath: "about/national/naibu_katibu_mkuu.svg",
      file: path.join(appNext, "src/assets/images/branding/kmkt-logo.svg"),
      type: "image/svg+xml",
    },
    {
      storagePath: "about/national/mhasibu_mkuu.svg",
      file: path.join(appNext, "src/assets/images/branding/kmkt-logo.svg"),
      type: "image/svg+xml",
    },
  ];

  console.log("\nKMK(T) — seed branding assets → site-assets\n");
  for (const a of assets) {
    if (!fs.existsSync(a.file)) {
      console.warn(`  ⚠ skip (missing): ${a.file}`);
      continue;
    }
    await uploadFile(supabase, a.storagePath, a.file, a.type);
  }

  const logo = publicUrl(url, "about/logo/kmkt-logo.svg");
  const fav = publicUrl(url, "favicon/favicon.svg");
  const hero = publicUrl(url, "about/hero/church-hero.svg");
  const askofu = publicUrl(url, "about/national/askofu_mkuu.svg");
  const katibu = publicUrl(url, "about/national/katibu_mkuu.svg");
  const naibu = publicUrl(url, "about/national/naibu_katibu_mkuu.svg");
  const mhasibu = publicUrl(url, "about/national/mhasibu_mkuu.svg");

  const esc = (s) => s.replace(/'/g, "''");
  const sql = `
update public.portal_theme_settings
set logo_url = '${esc(logo)}', favicon_url = '${esc(fav)}', updated_at = now()
where singleton_key = 'default';

update public.church_identity
set logo_url = '${esc(logo)}', favicon_url = '${esc(fav)}', cover_image_url = '${esc(hero)}', updated_at = now()
where singleton_key = 'default';

update public.about_kmkt
set logo_url = '${esc(logo)}', hero_image_url = '${esc(hero)}', updated_at = now();

update public.national_leadership_profiles
set profile_photo_url = '${esc(askofu)}', updated_at = now()
where role_key = 'askofu_mkuu';

update public.national_leadership_profiles
set profile_photo_url = '${esc(katibu)}', updated_at = now()
where role_key = 'katibu_mkuu';

update public.national_leadership_profiles
set profile_photo_url = '${esc(naibu)}', updated_at = now()
where role_key = 'naibu_katibu_mkuu';

update public.national_leadership_profiles
set profile_photo_url = '${esc(mhasibu)}', updated_at = now()
where role_key = 'mhasibu_mkuu';

update public.site_settings
set favicon_url = '${esc(fav)}', updated_at = now()
where favicon_url is null or trim(favicon_url) = '';
`;

  console.log("\nUpdating database URLs…\n");
  mergePortalEnv();
  runSql(sql);
  console.log("\n✓ Branding seed complete.\n");
  console.log(`  Logo: ${logo}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
