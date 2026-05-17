const fs = require("fs");
const p = require("path").join(__dirname, "../src/components/settings/LeadershipCvEnginePanel.tsx");
let t = fs.readFileSync(p, "utf8");

if (!t.includes("<LeadershipDocumentGallery")) {
  const gallery = `
      <LeadershipDocumentGallery
        items={cvGalleryItems}
        onPreview={(item) => {
          const L = leaders.find((x) => x.id === item.id);
          if (L) {
            setSelectedId(L.id);
            setPreviewOpen(true);
          }
        }}
      />
`;
  t = t.replace(
    /(\s*<\/div>\s*\r?\n\s*<div className="grid gap-3 lg:grid-cols-\[minmax\(220px,280px\)_1fr\]">)/,
    gallery + "$1"
  );
}

if (!t.includes("onAppointmentCertPdf")) {
  /* already added in prior edit */
}

if (!t.includes("Hakiki kamili")) {
  t = t.replace(
    /(\s*<div className="flex flex-wrap gap-2">\s*\r?\n\s*<button\s*\r?\n\s*type="button"\s*\r?\n\s*disabled=\{!props\.canEdit \|\| busy \|\| pdfBusy\})/,
    `$1
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-semibold text-[#0B1F3A]"
                  >
                    Hakiki kamili
                  </button>
                  <button
                    type="button"
                    disabled={certPdfBusy}
                    onClick={() => void onAppointmentCertPdf()}
                    className="rounded-xl border border-[#D4AF37]/60 bg-gradient-to-r from-[#0B1F3A] to-[#123C69] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {certPdfBusy ? "Cheti…" : "Cheti (PDF)"}
                  </button>`
  );
}

if (!t.includes("<LeadershipDocumentPreviewModal")) {
  const modal = `
      <LeadershipDocumentPreviewModal
        open={previewOpen && !!leader}
        onClose={() => setPreviewOpen(false)}
        title={leader ? (leader.jina || leader.full_name || "Wasifu") : "Hakiki"}
        preview={
          leader
            ? kiongoziToPreviewProps(leader, {
                logoUrl,
                photoUrl: previewPhoto || leader.photo_url,
                biography: profile?.executive_summary || leader.biography || leader.notes,
                kind: "cv",
              })
            : { fullName: "—", titleSw: "—" }
        }
        pdfBusy={pdfBusy}
        onDownloadPdf={leader ? async () => { await onPdf(); } : undefined}
        onSaveDraft={leader && props.canEdit ? () => void onSave() : undefined}
      />`;
  const key = "\r\n    </div>\r\n  );\r\n}\r\n\r\nfunction emptyProfile";
  const key2 = "\n    </div>\n  );\n}\n\nfunction emptyProfile";
  if (t.includes(key)) t = t.replace(key, modal + key);
  else if (t.includes(key2)) t = t.replace(key2, modal + key2);
  else {
    const end = t.lastIndexOf("export function LeadershipCvEnginePanel");
    const fnEnd = t.indexOf("\nfunction ", end + 100);
    if (fnEnd > 0) {
      const before = t.slice(0, fnEnd);
      const last = before.lastIndexOf("  );\n}");
      if (last > 0) t = before.slice(0, last) + modal + before.slice(last) + t.slice(fnEnd);
    }
  }
}

fs.writeFileSync(p, t);
console.log("cv panel patched");
