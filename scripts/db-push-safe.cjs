/**
 * Thibitisha mazingira kisha endesha db push bila kuchapisha siri.
 *
 *   npm run db:push:safe
 *   npm run db:push:safe -- --dry-run
 */
const path = require("path");
const { spawnSync } = require("child_process");
const {
  mergePortalEnv,
  envSet,
  hasExplicitDatabaseUrl,
  redactConnectionSecrets,
} = require("./supabase-env-merge.cjs");

const root = path.join(__dirname, "..");
const poolerScript = path.join(__dirname, "db-push-pooler.cjs");

const forwarded = process.argv.slice(2);

function say(title, lines) {
  console.log("");
  console.log(`  ${title}`);
  lines.forEach((l) => console.log(`      ${l}`));
}

mergePortalEnv();

const hasUrl = hasExplicitDatabaseUrl();
const hasPass = envSet("SUPABASE_DB_PASSWORD");
const hasRegion = envSet("SUPABASE_POOLER_REGION");
const direct =
  process.env.SUPABASE_DB_DIRECT === "1" ||
  /^true$/i.test(String(process.env.SUPABASE_DB_DIRECT || "").trim());

console.log("");
console.log("  KMT — db:push:safe  (uthibitisho → db push)");
console.log("");

if (!hasUrl && !hasPass) {
  say("✗ Hatuwezi kuendelea:", [
    "Hakuna SUPABASE_DATABASE_URL wala SUPABASE_DB_PASSWORD baada ya kusoma .env / .env.local.",
    "",
    "Weka moja ya hizi kwenye .env.local ya mizizi (siri hazichapishwi hapa):",
    "  • SUPABASE_DATABASE_URL — URI ya Session kutoka Dashboard → Database",
    "  • au SUPABASE_DB_PASSWORD + SUPABASE_POOLER_REGION",
  ]);
  process.exit(1);
}

if (!hasUrl && hasPass && !hasRegion && !direct) {
  say("✗ Hatuwezi kuendelea:", [
    "Una SUPABASE_DB_PASSWORD lakini kuna SUPABASE_POOLER_REGION tupu.",
    "Weka eneo la mradi (Dashboard → Settings → General → Region), mfano:",
    "  SUPABASE_POOLER_REGION=eu-west-1",
    "Au tumia SUPABASE_DATABASE_URL (URI kamili).",
  ]);
  process.exit(1);
}

if (hasUrl) {
  say("✓ Uthibitisho:", [
    "Tutaendesha db push kwa SUPABASE_DATABASE_URL / DATABASE_URL (inapendekezwa).",
  ]);
} else {
  say("✓ Uthibitisho:", [
    "Tutaendesha db push kwa nenosiri + pooler/direct.",
    "Nenosiri HALICHAPISHIWI.",
  ]);
}

const r = spawnSync(process.execPath, [poolerScript, ...forwarded], {
  cwd: root,
  encoding: "utf8",
  shell: false,
  env: { ...process.env },
  maxBuffer: 24 * 1024 * 1024,
});

const out = [r.stdout, r.stderr].filter(Boolean).join("\n");
if (out.trim()) {
  console.log(redactConnectionSecrets(out));
}

const code = r.status === null ? 1 : r.status;
if (code !== 0) {
  const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
  const isAuth =
    /28P01|password authentication failed|SASL auth/i.test(combined);

  say("✗ db push haikufaulu.", [
    ...(isAuth
      ? [
          "Password si sahihi au pooler bado haijarefresh.",
          "Reset database password au tumia Session Pooler URI.",
          "Dashboard → Project Settings → Database.",
        ]
      : [
          "Angalia ujumbe hapo juu (baada ya kuficha URI).",
          "Unaweza kujaribu: npm run db:doctor",
        ]),
    "",
    "Hatua pili:",
    hasUrl
      ? "Hakikisha URI ni ya Session / inasasishwa kutoka Dashboard."
      : "Sasisha SUPABASE_DB_PASSWORD au badili hadi SUPABASE_DATABASE_URL.",
  ]);
}

process.exit(code);
