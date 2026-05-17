const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "../src/components/executive/ExecutiveInstitutionalCertificatePreview.tsx");
const wrongClose = "</" + "motion.div>";
const rightClose = "</" + "div>";
let lines = fs.readFileSync(p, "utf8").split("\n");
const keepClose = new Set([47, 139, 213]);
lines = lines.map((line, i) => {
  if (line.trim() === wrongClose && !keepClose.has(i)) {
    return line.replace(wrongClose, rightClose);
  }
  return line;
});
const openMotion = "<" + "motion.div";
const openDiv = "<" + "motion.div";
if (lines[46] && lines[46].includes("motion")) {
  lines[46] = lines[46].replace(openMotion, "<div");
}
fs.writeFileSync(p, lines.join("\n"));
console.log("fixed");
