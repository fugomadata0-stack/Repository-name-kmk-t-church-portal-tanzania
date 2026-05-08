/**
 * Muunganiko wa mazingira ya Supabase db push (siri hazichapishwi hapa).
 * Faili kwa mpangilio: .env → app-next/.env.local → .env.local (mizizi)
 */
const fs = require("fs");
const path = require("path");

const PROJECT_REF = "tjtsrirwdssocaplsfql";

function getRoot() {
  return path.join(__dirname, "..");
}

function mergeEnvFromFile(filePath) {
  try {
    let txt = fs.readFileSync(filePath, "utf8");
    txt = txt.replace(/^\uFEFF/, "");
    for (const line of txt.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key === "SUPABASE_DB_PASSWORD") process.env.SUPABASE_DB_PASSWORD = val;
      if (key === "SUPABASE_POOLER_REGION") process.env.SUPABASE_POOLER_REGION = val;
      if (key === "SUPABASE_DATABASE_URL") process.env.SUPABASE_DATABASE_URL = val;
      if (key === "DATABASE_URL") process.env.DATABASE_URL = val;
      if (key === "SUPABASE_POOLER_PORT") process.env.SUPABASE_POOLER_PORT = val;
      if (key === "SUPABASE_DB_DIRECT") process.env.SUPABASE_DB_DIRECT = val;
    }
  } catch {
    /* faili halipo */
  }
}

/** Soma faili za .env kwa mpangilio sawa na db-push-pooler.cjs */
function mergePortalEnv() {
  const root = getRoot();
  mergeEnvFromFile(path.join(root, ".env"));
  mergeEnvFromFile(path.join(root, "app-next", ".env.local"));
  mergeEnvFromFile(path.join(root, ".env.local"));
}

function countSqlMigrations() {
  const dir = path.join(getRoot(), "supabase", "migrations");
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).length;
  } catch {
    return 0;
  }
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/** Thamani si tupu baada ya trim (bila kuchapisha thamani) */
function envSet(name) {
  const v = process.env[name];
  if (v == null) return false;
  const t = String(v).trim();
  if (!t) return false;
  if (/^(your_|changeme|placeholder|xxx|REPLACE)/i.test(t)) return false;
  return true;
}

function hasExplicitDatabaseUrl() {
  const u = (
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");
  return (
    u.startsWith("postgresql://") ||
    u.startsWith("postgres://")
  );
}

function getLinkedProjectRef() {
  const p = path.join(getRoot(), "supabase", ".temp", "project-ref");
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return null;
  }
}

/**
 * Futa sehemu ya nywila kutoka kwenye mstari wa connection string ili usichapishwe bila kukusudia.
 */
function redactConnectionSecrets(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/postgres(ql)?:\/\/([^:\/?#\s]+):([^@\/?#\s]+)@/gi, "postgres://[USER]:[PASSWORD]@")
    .replace(/postgres(ql)?:\/\/([^@\/?#\s]+)@/gi, "postgres://[CREDENTIALS]@");
}

module.exports = {
  PROJECT_REF,
  getRoot,
  mergePortalEnv,
  mergeEnvFromFile,
  countSqlMigrations,
  fileExists,
  envSet,
  hasExplicitDatabaseUrl,
  getLinkedProjectRef,
  redactConnectionSecrets,
};
