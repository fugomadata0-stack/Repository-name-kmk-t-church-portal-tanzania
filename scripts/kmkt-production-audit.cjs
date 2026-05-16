/**
 * Ukaguzi wa haraka kabla ya matumizi rasmi (anon key — hesabu tu).
 * Tumia: node scripts/kmkt-production-audit.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const envPath = path.join(__dirname, "..", "app-next", ".env.local");
  if (!fs.existsSync(envPath)) throw new Error("Hakuna app-next/.env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

async function rowCount(c, table, applyFilter) {
  let q = c.from(table).select("*", { count: "exact", head: true });
  if (applyFilter) q = applyFilter(q);
  const { count: n, error } = await q;
  if (error) {
    const msg =
      [error.message, error.details, error.hint, error.code].filter(Boolean).join(" — ") || JSON.stringify(error);
    return { err: msg, n: -1 };
  }
  return { n: n ?? 0 };
}

async function main() {
  loadEnv();
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("VITE_SUPABASE_*");
  const c = createClient(url, key);

  console.log("\n══════════════════════════════════════════════════");
  console.log("  Hatua 19 — Ukaguzi wa mwisho (DB + CI)");
  console.log("══════════════════════════════════════════════════");
  console.log(
    "  Kidokezo: hesabu za jedwali zinategemea RLS; ikiwa anon haizoniki, ni kawaida.",
  );
  console.log("");

  const checks = [
    ["TRIAL finance (notes)", () => rowCount(c, "church_finance_entries", (q) => q.like("notes", "TRIAL-NGAZI%"))],
    ["TRIAL income (code)", () => rowCount(c, "church_income_lines", (q) => q.like("income_code", "TRIAL-%"))],
    ["TRIAL attendance", () => rowCount(c, "attendance_sessions", (q) => q.like("notes", "TRIAL-NGAZI%"))],
    [
      "Familia Petro (mfano)",
      () => rowCount(c, "church_families", (q) => q.eq("family_name", "Familia ya Mfano — Petro")),
    ],
    ["Waumini KMKT-MARA-*", () => rowCount(c, "church_members", (q) => q.like("member_number", "KMKT-MARA-%"))],
    ["Jimbo la Mfano", () => rowCount(c, "church_jimbo", (q) => q.ilike("jina", "%Jimbo la Mfano%"))],
    ["Tawi yenye 'Mfano' katika jina", () => rowCount(c, "church_tawi", (q) => q.ilike("jina", "%Mfano%"))],
  ];

  for (const [label, fn] of checks) {
    const r = await fn();
    let mark = "·";
    if (r.err) mark = "✗";
    else if (label.startsWith("TRIAL")) mark = r.n === 0 ? "✓" : "⚠";
    const extra =
      label.includes("Petro") && r.n === 1 ? " — bado ipo: sasisha/ondoa kupitia Waumini" : "";
    const warn =
      !r.err && r.n > 0 && label.startsWith("TRIAL") ? " (inapaswa kuwa 0)" : "";
    const body = r.err ? `${r.err} (hesabu haiwezi)` : String(r.n);
    console.log(`  ${mark} ${label}: ${body}${warn}${extra}`);
  }

  const smoke = await rowCount(c, "church_finance_entries");
  if (smoke.err) {
    console.log(
      "\n  Uthibitishaji wa jedwali (anon):",
      smoke.err,
      "\n  → Hesabu za TRIAL/Petro hapo juu zinaweza kushindikana bila kuingia; endesha ukaguzi ukiwa umeingia au pitia SQL.",
    );
  } else {
    console.log("\n  Uthibitishaji wa jedwali (anon): idadi jumla ya mialala ~", smoke.n);
  }

  const { data: rpc, error: rpcErr } = await c.rpc("portal_ngazi_operations_summary", {});
  if (rpcErr) console.log("\n  RPC portal_ngazi_operations_summary:", rpcErr.message);
  else {
    const sum = (rpc.levels || []).reduce((s, l) => s + Number(l.finance_mapato || 0), 0);
    console.log("\n  RPC ngazi: vipenzi", (rpc.levels || []).length, "| jumla mapato (mwezi):", sum);
  }

  const { count: alertN, error: alertErr } = await c
    .from("system_alerts")
    .select("*", { count: "exact", head: true })
    .ilike("title", "%Data halisi%");
  console.log(
    "\n  Tangazo 'Data halisi':",
    alertErr
      ? alertErr.message || alertErr.code || JSON.stringify(alertErr)
      : alertN ?? 0,
    alertN === 0 && !alertErr ? "(0 kwa anon — kawaida ikiwa RLS ina mipaka; angalia ukiwa umeingia)" : "",
  );

  console.log("\n══════════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
