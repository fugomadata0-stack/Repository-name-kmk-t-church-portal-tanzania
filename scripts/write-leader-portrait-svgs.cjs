const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "app-next", "public", "national");
const LEADERS = [
  { role: "askofu_mkuu", initials: "LM", bg: "#0B1F3A", accent: "#D4AF37" },
  { role: "katibu_mkuu", initials: "JS", bg: "#123C69", accent: "#F5E6B4" },
  { role: "naibu_katibu_mkuu", initials: "ZB", bg: "#1a4d2e", accent: "#D4AF37" },
  { role: "mhasibu_mkuu", initials: "SC", bg: "#4a1942", accent: "#FFFFFF" },
];

function svg(initials, bg, accent) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${bg}"/>
  <circle cx="256" cy="200" r="120" fill="${accent}" opacity="0.25"/>
  <text x="256" y="240" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="120" font-weight="700" fill="${accent}">${initials}</text>
  <text x="256" y="460" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="28" fill="${accent}" opacity="0.9">KMK(T)</text>
</svg>`;
}

fs.mkdirSync(outDir, { recursive: true });
for (const L of LEADERS) {
  fs.writeFileSync(path.join(outDir, `${L.role}.svg`), svg(L.initials, L.bg, L.accent), "utf8");
}
console.log("Wrote", LEADERS.length, "portraits to", outDir);
