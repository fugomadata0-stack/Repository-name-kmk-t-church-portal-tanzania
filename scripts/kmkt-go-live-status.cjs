/**
 * Ukaguzi wa mwisho — portal live (HTTP + muhtasari wa hatua).
 */
const https = require("https");

const PORTAL = "https://v0-church-portal-tanzania.vercel.app";
const CHECKS = [
  "/",
  "/docs/kmkt-mwongozo-portal.pdf",
  "/national/askofu_mkuu.svg",
  "/branding/kmkt-logo.svg",
];

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: "GET", timeout: 15000 }, (res) => {
      res.resume();
      resolve({ url, status: res.statusCode });
    });
    req.on("error", (e) => resolve({ url, status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ url, status: 0, error: "timeout" });
    });
    req.end();
  });
}

async function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  KMK(T) Portal — Go-live status");
  console.log("══════════════════════════════════════════════════\n");
  console.log("  Portal (shiriki na timu):");
  console.log("  " + PORTAL + "\n");

  for (const path of CHECKS) {
    const r = await head(PORTAL + path);
    const ok = r.status >= 200 && r.status < 400;
    console.log(`  ${ok ? "✓" : "✗"} ${path}  →  ${r.status || r.error}`);
  }

  console.log("\n  Mialiko (chief_admin):");
  console.log("  Dashboard → Mialiko / Ruhusa → tuma mwaliko");
  console.log("  Kiungo: " + PORTAL + "/auth/accept-invite?invite=TOKEN\n");

  console.log("  Ukaguzi wa haraka:");
  console.log("  [ ] Ingia kwenye simu");
  console.log("  [ ] Mipangilio → Uongozi wa Kitaifa → pakia picha halisi");
  console.log("  [ ] Ingiza fedha / mapato / mahudhurio (Muundo → Ngazi Kuu)");
  console.log("  [ ] Sajili familia na waumini halisi (Waumini)");
  console.log("  [ ] Jaribu PDF / Nyaraka\n");
  console.log("══════════════════════════════════════════════════\n");
}

main();
