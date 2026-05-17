const fs = require("fs");
const p = require("path").join(__dirname, "../src/components/settings/NationalLeadershipEnginePanel.tsx");
let t = fs.readFileSync(p, "utf8");
if (t.includes("<LeadershipDocumentPreviewModal")) {
  console.log("already patched");
  process.exit(0);
}
const insert = `
      <LeadershipDocumentPreviewModal
        open={!!previewRow}
        onClose={() => setPreviewRole(null)}
        title={previewRow ? nationalLeadershipDisplayTitle(previewRow, "sw") : "Hakiki"}
        preview={
          previewRow
            ? nationalRowToPreviewProps(previewRow, { logoUrl, kind: "certificate" })
            : { fullName: "—", titleSw: "—" }
        }
        pdfBusy={previewRow ? pdfBusy === previewRow.role_key : false}
        onDownloadPdf={
          previewRow
            ? async () => {
                await exportNationalCertificate(previewRow);
              }
            : undefined
        }
        onSaveDraft={previewRow && canEdit ? () => void save(previewRow.role_key) : undefined}
      />`;
const key = "\r\n    </div>\r\n  );\r\n}\r\n\r\nfunction NatLeadFormSection";
const pos = t.indexOf(key);
if (pos < 0) {
  console.log("key not found");
  process.exit(1);
}
t = t.slice(0, pos) + insert + key;
fs.writeFileSync(p, t);
console.log("patched");
