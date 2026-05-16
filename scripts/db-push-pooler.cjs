/**
 * Endesha `supabase db push` kupitia pooler (IPv4) au URI kamili kutoka Dashboard.
 *
 * 1) Bora zaidi: nakili `SUPABASE_DATABASE_URL` kutoka Dashboard → Database → Connection string
 *    (Session mode / URI ile inayotumia port 5432 kwenye pooler).
 * 2) Au: SUPABASE_DB_PASSWORD + SUPABASE_POOLER_REGION — tunajenga URI ya Session pooler
 *    (chaguomsingi port 5432; si 6543 transaction — migrations zinaweza kushindwa au auth ya pool).
 *
 * Amri:
 *   npm run db:push
 *   npm run db:push:all
 *   npm run db:push:dry
 */

const { spawnSync } = require("child_process");
const {
  PROJECT_REF,
  getRoot,
  mergePortalEnv,
  countSqlMigrations,
  hasExplicitDatabaseUrl,
} = require("./supabase-env-merge.cjs");

const root = getRoot();

function printBanner({ region, projectRef, migrationCount, dryRun, connectionHint }) {
  const line = "═".repeat(56);
  console.log("");
  console.log(line);
  console.log("  KMT Church Portal — Supabase  ·  db push (IPv4 pooler)");
  console.log(`  Mradi: ${projectRef}  ·  eneo la pooler: ${region}`);
  if (connectionHint) console.log(`  Muunganisho: ${connectionHint}`);
  console.log(`  Faili za migrations ndani ya repo: ${migrationCount} (.sql)`);
  if (dryRun) {
    console.log("");
    console.log("  » DRY-RUN: hakuna mabadiliko yatatumika kwenye database.");
  }
  console.log(line);
  console.log("");
  console.log(
    "  Kidokezo: Ujumbe NOTICE (policy … does not exist, skipping) ni kawaida"
  );
  console.log("            wakati wa migrations zinazotumia DROP … IF EXISTS.");
  console.log("");
}

function printHelp() {
  console.log(`
KMT — db push kupitia pooler (IPv4)

  npm run db:push              Tumiza migrations kwenye Supabase
  npm run db:push:all          Sawa na db:push + --include-all (migrations “nje ya mpangilio”)
  npm run db:push:dry          Hakikisha ni zipi zitatumika (dry-run)
  npm run db:push:safe         Uthibitisho kisha db push (hakuna siri zinachapishwa)

  Pia: npm run db:push -- --include-all   (sawa na db:push:all)

  Mazingira / .env (moja ya seti hizi):
    SUPABASE_DATABASE_URL      Bora: URI kamili kutoka Dashboard → Database → Connection string
    au
    SUPABASE_DB_PASSWORD         + SUPABASE_POOLER_REGION (lazima — angalia Dashboard → General → Region)
    SUPABASE_POOLER_PORT         Chaguomsingi 5432
    SUPABASE_DB_DIRECT=1         Majaribio: muunganiko wa direct db.*.supabase.co (IPv6)

  Faili: .env → app-next/.env.local → .env.local (mizizi)
`);
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

mergePortalEnv();

const passRaw = process.env.SUPABASE_DB_PASSWORD;
const pass = passRaw != null ? String(passRaw).trim() : "";

const hasExplicitUrl = hasExplicitDatabaseUrl();
const explicitDbUrl = (
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  ""
)
  .trim()
  .replace(/^["']|["']$/g, "");

const dryRun =
  argv.includes("--dry-run") ||
  argv.includes("-n") ||
  process.env.DB_PUSH_DRY === "1";

const passthrough = argv.filter(
  (a) =>
    !["--dry-run", "-n", "--help", "-h"].includes(a) &&
    (a.startsWith("--") || (a.length > 1 && a.startsWith("-") && a !== "-n"))
);

if (!hasExplicitUrl && !pass) {
  console.error("");
  console.error("  ✗  Hakuna njia ya kuunganisha DB.");
  console.error("");
  console.error("     Chaguo A — nakili URI kutoka Dashboard → Database → Connection string → URI");
  console.error("              weka kwenye .env.local ya mizizi:");
  console.error("              SUPABASE_DATABASE_URL=postgresql://postgres....");
  console.error("");
  console.error("     Chaguo B — weka nenosiri la Database tu:");
  console.error("              SUPABASE_DB_PASSWORD=...");
  console.error("");
  console.error("     Dashboard → Project Settings → Database");
  console.error("");
  console.error("     Jaribu pia: npm run db:doctor");
  console.error("");
  process.exit(1);
}

const migrationCount = countSqlMigrations();

let dbUrl;
let connectionHint;
let bannerRegion = "(URI)";

if (hasExplicitUrl) {
  dbUrl = explicitDbUrl;
  connectionHint = "URI kamili (SUPABASE_DATABASE_URL)";
} else {
  const enc = encodeURIComponent(pass);
  const direct =
    process.env.SUPABASE_DB_DIRECT === "1" ||
    /^true$/i.test(String(process.env.SUPABASE_DB_DIRECT || "").trim());

  if (direct) {
    dbUrl = `postgresql://postgres:${enc}@db.${PROJECT_REF}.supabase.co:5432/postgres`;
    connectionHint = "direct · db.*.supabase.co:5432 (IPv6 / kamili kwenye mtandao wako)";
    bannerRegion = "direct";
  } else {
    const regionClean = String(process.env.SUPABASE_POOLER_REGION || "").trim();
    if (!regionClean) {
      console.error("");
      console.error("  ✗  Unatumia SUPABASE_DB_PASSWORD bila eneo la pooler.");
      console.error("");
      console.error("     Weka mstari kwenye .env.local ya mizizi (angalia Dashboard → Settings → General → Region), mfano:");
      console.error("       SUPABASE_POOLER_REGION=eu-central-1");
      console.error("");
      console.error("     Au tumia URI kamili: SUPABASE_DATABASE_URL=... (Database → Connection string → URI)");
      console.error("");
      console.error("     Jaribu: npm run db:doctor");
      console.error("");
      process.exit(1);
    }
    bannerRegion = regionClean;
    const poolPort = String(process.env.SUPABASE_POOLER_PORT || "5432").trim() || "5432";
    dbUrl = `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-${regionClean}.pooler.supabase.com:${poolPort}/postgres`;
    connectionHint = `pooler · ${regionClean} · port ${poolPort} (session)`;
  }
}

printBanner({
  region: bannerRegion,
  projectRef: PROJECT_REF,
  migrationCount,
  dryRun,
  connectionHint,
});

const cliArgs = ["supabase", "db", "push", "--db-url", dbUrl];
if (dryRun) cliArgs.push("--dry-run");
cliArgs.push(...passthrough);

const r = spawnSync("npx", cliArgs, {
  stdio: "inherit",
  shell: true,
  cwd: root,
  env: { ...process.env },
});

if (r.status === 0) {
  console.log("");
  console.log("  ✓  Amri imekamilika (exit 0).");
  if (dryRun) {
    console.log("     Endesha bila --dry-run ili kutumiza migrations kweli.");
  }
  console.log("");
} else if (r.status !== null && r.status !== 0) {
  console.error("");
  console.error("  Makosa ya muunganisho / uthibitisho (mfano SQLSTATE 28P01):");
  console.error("    Password si sahihi au pooler bado haijarefresh. Reset database password au tumia Session Pooler URI.");
  console.error("    1) Dashboard → Database → Reset database password → sasisha SUPABASE_DB_PASSWORD");
  console.error("    2) Hakikisha SUPABASE_POOLER_REGION = Region ya mradi (si lazima eu-west-1)");
  console.error("    3) Bora: nakili URI kamili → SUPABASE_DATABASE_URL kwenye .env.local ya mizizi");
  console.error("    4) Jaribu: SUPABASE_DB_DIRECT=1 (direct connection; inahitaji IPv6 au mtandao unaoungana)");
  console.error("    5) Jaribu: npm run db:doctor  au  npm run db:push:safe");
  console.error("");
}

process.exit(r.status === null ? 1 : r.status);
