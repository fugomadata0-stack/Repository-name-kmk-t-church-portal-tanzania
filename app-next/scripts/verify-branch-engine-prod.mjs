/**
 * Thibitisha jedwali la Injini ya Matawi kwenye Supabase ya production (linked).
 * Inasoma VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY kutoka .env.local ikiwepo.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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
const url = env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY kwenye app-next/.env.local");
  process.exit(1);
}

const res = await fetch(
  `${url}/rest/v1/portal_branch_engine_workspace?select=id&limit=1`,
  {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  },
);

if (res.status === 404 || res.status === 406) {
  console.error("Jedwali portal_branch_engine_workspace halipo au halijafichuliwa kwa API.");
  console.error("Endesha: npm run db:push:safe   au   npm run db:push:branch-engine");
  process.exit(1);
}

if (!res.ok) {
  const body = await res.text();
  console.error("HTTP", res.status, body.slice(0, 400));
  process.exit(1);
}

console.log("OK — portal_branch_engine_workspace inapatikana kwenye production API.");
