import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Layers } from "lucide-react";
import type { Phase1Scope } from "../../services/phase1FoundationService";
import { fetchNationalLeadershipProfilesOptional } from "../../services/nationalLeadershipService";
import type { KiongoziRecord } from "../../types";
import { buildMasterReport, type BuiltMasterPdf, type MasterReportKind } from "../../lib/printPdfMasterEngine";
import { safeDownloadLeadershipPdf } from "../../lib/leadershipPdfEngine/exportActionsSafe";
import { PrintPdfMasterToolbar } from "./PrintPdfMasterToolbar";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";

const SCOPES: { scope: Phase1Scope; label: string }[] = [
  { scope: "tawi", label: "Tawi" },
  { scope: "jimbo", label: "Jimbo" },
  { scope: "dayosisi", label: "Dayosisi" },
  { scope: "kmkt", label: "KMK(T)" },
];

const HIERARCHY_REPORTS: { kind: MasterReportKind; label: string; hint: string }[] = [
  { kind: "tawi", label: "PDF ya Tawi", hint: "Ripoti kamili — tawi" },
  { kind: "jimbo", label: "PDF ya Jimbo", hint: "Ripoti kamili — jimbo" },
  { kind: "dayosisi", label: "PDF ya Dayosisi", hint: "Ripoti kamili — dayosisi" },
  { kind: "kmkt", label: "PDF ya KMK(T)", hint: "Ripoti kamili — kitaifa" },
];

const DATA_REPORTS: { kind: MasterReportKind; label: string; color: string }[] = [
  { kind: "membership", label: "Uanachama", color: "bg-emerald-700" },
  { kind: "finance", label: "Fedha", color: "bg-green-800" },
  { kind: "projects", label: "Miradi", color: "bg-orange-700" },
];

function nationalProfileToKiongozi(row: import("../../services/nationalLeadershipService").NationalLeadershipProfileRow): KiongoziRecord {
  return {
    id: row.role_key,
    jina: String(row.full_name ?? "Kiongozi"),
    cheo: String(row.display_title_sw ?? row.display_title_en ?? ""),
    ngazi: "KMK(T)",
    leadership_level: "KMK(T)",
    wasifu: row.biography ?? undefined,
    picha: row.profile_photo_url ?? undefined,
  } as unknown as KiongoziRecord;
}

export function PrintPdfMasterEnginePanel() {
  const [scope, setScope] = useState<Phase1Scope>("kmkt");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [built, setBuilt] = useState<BuiltMasterPdf | null>(null);
  const [leaders, setLeaders] = useState<KiongoziRecord[]>([]);
  const [leaderId, setLeaderId] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchNationalLeadershipProfilesOptional().then((rows) => {
      setLeaders(rows.map(nationalProfileToKiongozi));
      if (rows[0]?.role_key) setLeaderId(rows[0].role_key);
    });
  }, []);

  const selectedLeader = useMemo(
    () => leaders.find((l) => l.id === leaderId) ?? null,
    [leaders, leaderId],
  );

  const run = useCallback(
    async (kind: MasterReportKind) => {
      const key = `${kind}-${scope}`;
      setBusy(key);
      setMessage(null);
      setBuilt(null);
      try {
        const result = await buildMasterReport(
          kind,
          scope,
          kind === "leadership" && selectedLeader
            ? { kind: "leadership_certificate", leader: selectedLeader }
            : undefined,
        );
        setBuilt(result);
        const dl = safeDownloadLeadershipPdf(result.doc, result.filename);
        if (!dl.ok) {
          setMessage(dl.message);
          return;
        }
        setMessage(`PDF imepakuliwa: ${result.filename}`);
      } catch (e) {
        setMessage(userFacingQueryError(e instanceof Error ? e.message : String(e)));
      } finally {
        setBusy(null);
      }
    },
    [scope, selectedLeader],
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border-4 border-double border-[#0B1F3A]/35 bg-gradient-to-br from-[#0B1F3A] via-[#123C69] to-slate-950 p-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/90">Print & PDF Master Engine</p>
        <h2 className="mt-1 text-xl font-bold">Injini Kuu ya PDF — Hati Rasmi</h2>
        <p className="mt-2 text-sm text-slate-200/90">
          Pande mbili · Mistari wima · Watermark · QR · Saini · A4 print-ready
        </p>
      </header>

      {message ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm text-slate-700">{message}</p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-600">Ngazi ya data (ripoti za fedha/uanachama/miradi)</p>
        <div className="flex flex-wrap justify-center gap-2">
          {SCOPES.map((s) => (
            <button
              key={s.scope}
              type="button"
              onClick={() => setScope(s.scope)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                scope === s.scope ? "bg-amber-500 text-[#0B1F3A]" : "border border-slate-300 text-slate-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border-4 border-double border-slate-800 bg-white p-4 text-center shadow-md">
          <div className="mb-2 flex justify-center">
            <Layers className="h-6 w-6 text-[#0B1F3A]" aria-hidden />
          </div>
          <h3 className="font-bold text-slate-900">Ripoti za Ngazi (kamili)</h3>
          <p className="text-xs text-slate-500">Tawi · Jimbo · Dayosisi · KMK(T)</p>
          <div className="mt-3 grid gap-2">
            {HIERARCHY_REPORTS.map((r) => (
              <button
                key={r.kind}
                type="button"
                disabled={busy !== null}
                title={r.hint}
                onClick={() => void run(r.kind)}
                className="rounded-lg bg-[#0B1F3A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy === `${r.kind}-${scope}` ? "Inatengeneza…" : r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border-4 border-double border-slate-800 bg-white p-4 text-center shadow-md">
          <div className="mb-2 flex justify-center">
            <FileText className="h-6 w-6 text-emerald-800" aria-hidden />
          </div>
          <h3 className="font-bold text-slate-900">Ripoti za Data</h3>
          <p className="text-xs text-slate-500">Ngazi: {scope.toUpperCase()}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {DATA_REPORTS.map((r) => (
              <button
                key={r.kind}
                type="button"
                disabled={busy !== null}
                onClick={() => void run(r.kind)}
                className={`rounded-lg px-3 py-2 text-xs text-white disabled:opacity-50 ${r.color}`}
              >
                {busy === `${r.kind}-${scope}` ? "…" : r.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
        <h3 className="text-center text-sm font-bold text-[#0B1F3A]">PDF ya Uongozi</h3>
        <p className="mt-1 text-center text-xs text-slate-600">
          Chagua kiongozi wa kitaifa — cheti chenye QR, watermark, na saini.
        </p>
        {leaders.length > 0 ? (
          <select
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            className="mx-auto mt-3 block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.jina} — {l.cheo || l.ngazi}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-2 text-center text-xs text-slate-500">Hakuna orodha ya viongozi — tumia Leadership Credentials Hub.</p>
        )}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            disabled={busy !== null || !selectedLeader}
            onClick={() => void run("leadership")}
            className="rounded-lg bg-violet-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy === `leadership-${scope}` ? "Inatengeneza…" : "Tengeneza PDF ya Uongozi"}
          </button>
        </div>
      </section>

      {built ? (
        <PrintPdfMasterToolbar
          built={{ doc: built.doc, filename: built.filename, verifyUrl: built.verifyUrl, displaySerial: built.displaySerial }}
          previewRef={previewRef}
        />
      ) : null}

      <div ref={previewRef} className="sr-only" aria-hidden />

      <p className="text-center text-xs text-slate-500">
        Ripoti za Phase 1 (kituo cha zamani) bado zinapatikana chini ya &quot;Ripoti Phase 1 (PDF)&quot;. Injini hii inaongeza watermark, QR, pande mbili, na saini bila kubadilisha logic ya zamani.
      </p>
    </div>
  );
}
