/**
 * Kagua mipangilio ya Supabase / db push bila kuchapisha siri.
 *
 *   npm run db:doctor
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  PROJECT_REF,
  getRoot,
  mergePortalEnv,
  countSqlMigrations,
  fileExists,
  envSet,
  hasExplicitDatabaseUrl,
  getLinkedProjectRef,
} = require("./supabase-env-merge.cjs");

const root = getRoot();
const line = "═".repeat(58);

function findDuplicateMigrationPrefixes() {
  const dir = path.join(root, "supabase", "migrations");
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"));
  } catch {
    return { ok: false, message: "Folda ya migrations haipatikani.", duplicates: [] };
  }
  const counts = new Map();
  const badNames = [];
  for (const f of files) {
    const m = f.match(/^(\d{14})_[a-zA-Z0-9_.-]+\.sql$/);
    if (!m) {
      badNames.push(f);
      continue;
    }
    const prefix = m[1];
    counts.set(prefix, (counts.get(prefix) || 0) + 1);
  }
  const duplicates = [...counts.entries()].filter(([, n]) => n > 1).map(([p]) => p);
  return {
    ok: duplicates.length === 0,
    duplicates,
    badNames,
    total: files.length,
  };
}

console.log("");
console.log(line);
console.log("  KMT Church Portal — db:doctor (hakuna siri zinachapishwa)");
console.log(line);
console.log("");

/* Supabase CLI */
const ver = spawnSync("npx", ["supabase", "--version"], {
  cwd: root,
  encoding: "utf8",
  shell: true,
});
if (ver.status !== 0 || !String(ver.stdout || "").trim()) {
  console.log("  ✗  Supabase CLI: haijapatikana au amri imeshindwa.");
  console.log("      Jaribu: npm install (mizizi) au npx supabase --version");
  console.log("");
  process.exit(1);
}
console.log(`  ✓  Supabase CLI: ${String(ver.stdout).trim()}`);

/* Project ref inayotarajiwa */
console.log(`  ✓  Project ref (msimbo): ${PROJECT_REF}`);

const linked = getLinkedProjectRef();
if (linked) {
  if (linked === PROJECT_REF) {
    console.log(`  ✓  Mradi uliounganishwa (supabase/.temp/project-ref): ${linked}`);
  } else {
    console.log(`  ⚠  project-ref iliyohifadhiwa (${linked}) si sawa na ref ya msimbo (${PROJECT_REF}).`);
    console.log("      Endesha: npm run supabase:link");
  }
} else {
  console.log("  ⚠  Hakuna supabase/.temp/project-ref — huenda hukujaribu `supabase link` bado.");
  console.log("      Endesha: npm run supabase:link");
}

/* Migrations */
const mig = findDuplicateMigrationPrefixes();
console.log(`  ✓  Idadi ya migrations (.sql): ${mig.total}`);
if (mig.badNames.length) {
  console.log(`  ⚠  Majina yasiyo na muundo wa kawaida (${mig.badNames.length}):`);
  mig.badNames.slice(0, 5).forEach((n) => console.log(`      - ${n}`));
  if (mig.badNames.length > 5) console.log("      …");
}
if (!mig.ok) {
  console.log("  ✗  Timestamp mbili zina prefix sawa (duplicate):");
  mig.duplicates.forEach((p) => console.log(`      - ${p}`));
} else {
  console.log("  ✓  Hakuna duplicate ya timestamp (prefix ya tarakimu 14).");
}

/* Faili za .env */
const envRoot = path.join(root, ".env");
const envLocalRoot = path.join(root, ".env.local");
const envLocalApp = path.join(root, "app-next", ".env.local");
console.log("");
console.log("  Faili za mazingira:");
console.log(`      .env                 ${fileExists(envRoot) ? "ipo" : "haipo"}`);
console.log(`      .env.local (mizizi)  ${fileExists(envLocalRoot) ? "ipo" : "haipo"}`);
console.log(`      app-next/.env.local  ${fileExists(envLocalApp) ? "ipo" : "haipo"}`);

mergePortalEnv();

const hasUrl = hasExplicitDatabaseUrl();
const hasPass = envSet("SUPABASE_DB_PASSWORD");
const hasRegion = envSet("SUPABASE_POOLER_REGION");
const direct = /^1$|^true$/i.test(String(process.env.SUPABASE_DB_DIRECT || "").trim());

console.log("");
console.log("  Mazingira ya muunganisho wa DB (baada ya kusoma faili):");
console.log(`      SUPABASE_DATABASE_URL au DATABASE_URL  ${hasUrl ? "✓ imeundwa" : "— haipo"}`);
console.log(`      SUPABASE_DB_PASSWORD                    ${hasPass ? "✓ imeundwa" : "— haipo"}`);
console.log(`      SUPABASE_POOLER_REGION                  ${hasRegion ? "✓ imeundwa" : "— haipo"}`);
console.log(`      SUPABASE_DB_DIRECT                      ${direct ? "1/true" : "(haijawashwa)"}`);

console.log("");
if (hasUrl) {
  console.log("  ✓  Mpangilio: tutatumia URI kamili (inapendekezwa kwa usalama/stability).");
} else if (hasPass && (hasRegion || direct)) {
  console.log("  ✓  Mpangilio: nenosiri + pooler au direct — inatosha kwa db:push.");
} else if (hasPass && !hasRegion && !direct) {
  console.log("  ⚠  Una SUPABASE_DB_PASSWORD lakini hakuna SUPABASE_POOLER_REGION wala DIRECT.");
  console.log("      Weka eneo la mradi, mfano: SUPABASE_POOLER_REGION=eu-west-1");
  console.log("      (Dashboard → Project Settings → General → Region)");
} else {
  console.log("  ✗  Hakuna njia ya kuunganisha database.");
  console.log("");
  console.log("      Chaguo A (bora): Dashboard → Database → Connection string → URI");
  console.log("          Weka kwenye .env.local ya mizizi:");
  console.log("          SUPABASE_DATABASE_URL=postgresql://...");
  console.log("");
  console.log("      Chaguo B: Dashboard → Database → Database password");
  console.log("          Weka kwenye .env.local ya mizizi:");
  console.log("          SUPABASE_DB_PASSWORD=…");
  console.log("          SUPABASE_POOLER_REGION=… (eneo la mradi)");
}

console.log("");
console.log(line);
console.log("  Mwisho: endesha  npm run db:push:safe  au  npm run db:push");
console.log(line);
console.log("");

const okLink = !linked || linked === PROJECT_REF;
const okMig = mig.ok && mig.badNames.length === 0;
const okCreds = hasUrl || (hasPass && (hasRegion || direct));
process.exit(okLink && okMig && okCreds ? 0 : 1);
