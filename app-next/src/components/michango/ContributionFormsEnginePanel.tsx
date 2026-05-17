import { useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { PremiumKPICard } from "../executive/PremiumKPICard";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { PortalTableSkeleton } from "../common/PortalSkeleton";
import { formatMoneyTzOrDash } from "../../lib/money";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";
import {
  downloadContributionFormsCsvTemplate,
  downloadContributionFormsExcelTemplate,
  downloadContributionFormsPdfTemplate,
} from "../../lib/contributionFormsTemplates";
import type { ContributionRowValidation } from "../../lib/contributionFormsValidation";
import { usePortal } from "../../context/PortalContext";
import {
  contributionFileGuard,
  importValidatedContributionRows,
  listContributionUploadHistory,
  parseContributionFile,
  subscribeContributionUploadsRealtime,
  updateContributionUploadVerification,
  validateContributionFileRows,
  type ContributionUploadRecord,
} from "../../services/contributionFormsEngineService";

export function ContributionFormsEnginePanel() {
  const { logAudit, pushToast, session, authUser } = usePortal();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ContributionUploadRecord[]>([]);
  const [preview, setPreview] = useState<ContributionRowValidation[] | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);

  const uploadedBy = session?.user?.email ?? authUser?.email ?? authUser?.id ?? "portal";

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listContributionUploadHistory();
      setHistory(rows);
    } catch (e) {
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => subscribeContributionUploadsRealtime(() => void loadHistory()), [loadHistory]);

  const handleFile = async (f: File) => {
    const guard = contributionFileGuard(f);
    if (guard) {
      pushToast(guard, "error");
      return;
    }
    setFile(f);
    setImportBusy(true);
    setProgress(10);
    try {
      const parsed = await parseContributionFile(f);
      setProgress(40);
      const { validation, nonEmptyRows } = await validateContributionFileRows(parsed.rows);
      setParsedRows(nonEmptyRows);
      setPreview(validation.rows);
      setProgress(100);
      pushToast(
        `${validation.validCount} safu sahihi, ${validation.invalidCount} zina hitilafu · Jumla ${formatMoneyTzOrDash(validation.totalAmount)}`,
        validation.invalidCount > 0 ? "info" : "success"
      );
    } catch (e) {
      setPreview(null);
      setParsedRows([]);
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setImportBusy(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const runImport = async () => {
    if (!file || !preview) return;
    const valid = preview.filter((p) => p.valid);
    if (valid.length === 0) {
      pushToast("Hakuna safu sahihi za kuhifadhi.", "error");
      return;
    }
    setImportBusy(true);
    setProgress(5);
    try {
      const res = await importValidatedContributionRows({
        file,
        rows: parsedRows,
        validations: preview,
        uploadedBy,
        onProgress: setProgress,
      });
      void logAudit("contribution_forms_import", "church_contribution_form_uploads", res.batchId, {
        ok: res.ok,
        fail: res.fail,
        batchCode: res.batchCode,
      });
      pushToast(
        `Imehifadhiwa: ${res.ok} · Imeshindwa: ${res.fail} · Kundi ${res.batchCode}`,
        res.fail > 0 ? "info" : "success"
      );
      setPreview(null);
      setParsedRows([]);
      setFile(null);
      await loadHistory();
    } catch (e) {
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setImportBusy(false);
      setProgress(0);
    }
  };

  const verifyUpload = async (row: ContributionUploadRecord, status: "verified" | "rejected") => {
    setActionId(row.id);
    try {
      await updateContributionUploadVerification(row.id, status, uploadedBy);
      void logAudit(`contribution_upload_${status}`, "church_contribution_form_uploads", row.id);
      pushToast(status === "verified" ? "Upakiaji umethibitishwa." : "Upakiaji umekataliwa.", "success");
      await loadHistory();
    } catch (e) {
      pushToast(userFacingQueryError(e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = history.filter((h) => h.verification_status === "pending").length;
  const totalOk = history.reduce((s, h) => s + h.rows_ok, 0);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border-4 border-double border-emerald-900/40 bg-gradient-to-br from-green-950 via-emerald-900 to-slate-950 p-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Contribution Forms Engine</p>
        <h2 className="mt-1 text-xl font-bold">Fomu za Michango — KMK(T)</h2>
        <p className="mt-2 text-sm text-green-100/90">Blanki · Pakia · Thibitisha · Hifadhi Supabase · Historia</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <PremiumKPICard title="Upakiaji" value={String(history.length)} index={0} static />
        <PremiumKPICard title="Inasubiri uthibitisho" value={String(pendingCount)} index={1} static />
        <PremiumKPICard title="Mistari yaliyohifadhiwa" value={String(totalOk)} index={2} static />
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => void downloadContributionFormsExcelTemplate()}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-emerald-700 bg-emerald-50 p-4 transition hover:shadow-md"
        >
          <FileSpreadsheet className="h-8 w-8 text-emerald-800" />
          <span className="text-sm font-bold text-emerald-950">Pakua Excel</span>
        </button>
        <button
          type="button"
          onClick={() => downloadContributionFormsCsvTemplate()}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-slate-700 bg-slate-50 p-4 transition hover:shadow-md"
        >
          <FileSpreadsheet className="h-8 w-8 text-slate-800" />
          <span className="text-sm font-bold">Pakua CSV</span>
        </button>
        <button
          type="button"
          onClick={() => void downloadContributionFormsPdfTemplate()}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-amber-600 bg-amber-50 p-4 transition hover:shadow-md"
        >
          <FileText className="h-8 w-8 text-amber-900" />
          <span className="text-sm font-bold text-amber-950">Pakua PDF</span>
        </button>
      </section>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-4 border-dashed p-8 text-center transition ${
          dragOver ? "border-emerald-500 bg-emerald-50 scale-[1.01]" : "border-slate-300 bg-white"
        }`}
      >
        <Upload className={`mx-auto h-12 w-12 ${dragOver ? "text-emerald-600 animate-bounce" : "text-slate-400"}`} />
        <p className="mt-3 text-sm font-semibold text-slate-800">Buruta & acha faili hapa · au</p>
        <button
          type="button"
          disabled={importBusy}
          onClick={() => fileRef.current?.click()}
          className="mt-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Chagua faili (.xlsx / .csv)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        {file && <p className="mt-2 text-xs text-slate-600">{file.name}</p>}
        {progress > 0 && (
          <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </section>

      {preview && preview.length > 0 && (
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800">Hakiki kabla ya kuhifadhi</h3>
            <button
              type="button"
              disabled={importBusy || preview.every((p) => !p.valid)}
              onClick={() => void runImport()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {importBusy ? "Inahifadhi…" : "Hifadhi kwenye Supabase"}
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border-4 border-double border-slate-800">
            <table className="w-full min-w-[640px] border-collapse text-center text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border px-2 py-2">Safu</th>
                  <th className="border px-2 py-2">Income Code</th>
                  <th className="border px-2 py-2">Kiasi</th>
                  <th className="border px-2 py-2">Hali</th>
                  <th className="border px-2 py-2">Maelezo</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 30).map((p) => (
                  <tr key={p.rowIndex} className={p.valid ? "bg-emerald-50/60" : "bg-red-50/80"}>
                    <td className="border px-2 py-1">{p.rowIndex}</td>
                    <td className="border px-2 py-1 font-mono">{p.incomeCode || "—"}</td>
                    <td className="border px-2 py-1">{formatMoneyTzOrDash(p.amount)}</td>
                    <td className="border px-2 py-1">{p.valid ? "Sahihi" : "Hitilafu"}</td>
                    <td className="border px-2 py-1 text-left text-[10px]">
                      {[...p.errors, ...p.warnings].join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 30 && (
            <p className="mt-1 text-center text-xs text-slate-500">Inaonyesha safu 30 za kwanza kati ya {preview.length}</p>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-2 text-center text-sm font-bold text-slate-800">Historia ya upakiaji & uthibitisho</h3>
        {loading ? (
          <PortalTableSkeleton />
        ) : history.length === 0 ? (
          <SupabaseListFeedback loading={false} loadError={null} isEmpty onRetry={() => void loadHistory()} />
        ) : (
          <div className="overflow-x-auto rounded-xl border-4 border-double border-emerald-900/50">
            <table className="w-full min-w-[720px] border-collapse text-center text-xs sm:text-sm">
              <thead>
                <tr className="bg-emerald-950 text-white">
                  <th className="border px-2 py-2">Kundi</th>
                  <th className="border px-2 py-2">Faili</th>
                  <th className="border px-2 py-2">Safu</th>
                  <th className="border px-2 py-2">OK / Fail</th>
                  <th className="border px-2 py-2">Jumla</th>
                  <th className="border px-2 py-2">Uthibitisho</th>
                  <th className="border px-2 py-2">Vitendo</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={h.id} className={idx % 2 === 0 ? "bg-emerald-50/50" : "bg-white"}>
                    <td className="border px-2 py-2 font-mono text-[10px]">{h.batch_code}</td>
                    <td className="border px-2 py-2 text-left">{h.file_name}</td>
                    <td className="border px-2 py-2">{h.row_count}</td>
                    <td className="border px-2 py-2">
                      {h.rows_ok} / {h.rows_fail}
                    </td>
                    <td className="border px-2 py-2">{formatMoneyTzOrDash(h.total_amount_tz)}</td>
                    <td className="border px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          h.verification_status === "verified"
                            ? "bg-emerald-100 text-emerald-900"
                            : h.verification_status === "rejected"
                              ? "bg-red-100 text-red-900"
                              : "bg-amber-100 text-amber-950"
                        }`}
                      >
                        {h.verification_status}
                      </span>
                    </td>
                    <td className="border px-2 py-1">
                      {h.verification_status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={actionId === h.id}
                            onClick={() => void verifyUpload(h, "verified")}
                            className="mr-1 rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                          >
                            Thibitisha
                          </button>
                          <button
                            type="button"
                            disabled={actionId === h.id}
                            onClick={() => void verifyUpload(h, "rejected")}
                            className="rounded border border-red-400 px-2 py-1 text-xs text-red-800"
                          >
                            Kataa
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}