/**
 * Ukaguzi wa tovuti ya production (baada ya deploy).
 * Inatumia URL ya Vercel na .env.local kwa majaribio ya API (si kuchapisha funguo).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SITE = (process.env.PRODUCTION_SITE_URL ?? "https://v0-church-portal-tanzania.vercel.app").replace(
  /\/+$/,
  "",
);

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const supabaseUrl = String(env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const anonKey = String(env.VITE_SUPABASE_ANON_KEY ?? "").trim();

let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`OK  ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${name}:`, e instanceof Error ? e.message : e);
  }
}

await check("Production index (200)", async () => {
  const res = await fetch(`${SITE}/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("KMK(T)") && !html.includes("Mennonite")) {
    throw new Error("Unexpected landing HTML");
  }
  if (!/supabase\.co/.test(html)) {
    throw new Error("No supabase.co preconnect in HTML — build env missing on Vercel?");
  }
});

await check("SPA route /auth/signup-request", async () => {
  const res = await fetch(`${SITE}/auth/signup-request`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("index") && !html.includes("KMK")) {
    throw new Error("Rewrite may be broken — not index.html");
  }
});

if (supabaseUrl && anonKey) {
  await check("Supabase REST (storage buckets)", async () => {
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error(`HTTP ${res.status} — check anon key`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buckets = await res.json();
    const ids = new Set((Array.isArray(buckets) ? buckets : []).map((b) => b.id));
    const required = ["church-gallery", "portal-uploads", "certificates"];
    const missing = required.filter((id) => !ids.has(id));
    if (missing.length) throw new Error(`Missing buckets: ${missing.join(", ")}`);
  });

  await check("Public dashboard RPC", async () => {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/portal_public_dashboard_counts`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (res.status === 404) {
      throw new Error("RPC not found — run db push on linked project");
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
  });
} else {
  console.warn("SKIP Supabase API checks — set VITE_* in app-next/.env.local");
}

console.log(failed ? `\n${failed} check(s) failed.\n` : "\nAll production checks passed.\n");
process.exit(failed ? 1 : 0);
