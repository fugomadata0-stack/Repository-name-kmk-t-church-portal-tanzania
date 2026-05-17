import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Upload } from "lucide-react";
import { EnterpriseDocumentUpload } from "../common/EnterpriseDocumentUpload";
import { UploadFilePreview } from "./UploadFilePreview";
import {
  UPLOAD_CENTER_CATEGORIES,
  uploadCategoryGuard,
  type UploadCenterCategory,
  type UploadRegistryRow,
} from "../../lib/enterpriseUploadCenter";
import {
  fetchUploadHistory,
  uploadNewVersion,
  uploadToEnterpriseCenter,
} from "../../services/enterpriseUploadCenterService";
import type { StorageUploadProgress } from "../../lib/enterpriseStorageUpload";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";
import { usePortal } from "../../context/PortalContext";

export function EnterpriseUploadCenterPanel() {
  const { authUser } = usePortal();
  const [category, setCategory] = useState<UploadCenterCategory>("receipt");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<StorageUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<UploadRegistryRow[]>([]);
  const [preview, setPreview] = useState<UploadRegistryRow | null>(null);
  const [entityId, setEntityId] = useState("");

  const catMeta = useMemo(
    () => UPLOAD_CENTER_CATEGORIES.find((c) => c.id === category) ?? UPLOAD_CENTER_CATEGORIES[0],
    [category],
  );

  const loadHistory = useCallback(async () => {
    try {
      const rows = await fetchUploadHistory(category, 50);
      setHistory(rows);
    } catch (e) {
      setHistory([]);
      setError(userFacingQueryError(e instanceof Error ? e.message : String(e)));
    }
  }, [category]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const runUpload = useCallback(
    async (parent?: UploadRegistryRow | null) => {
      if (!file) return;
      setUploading(true);
      setError(null);
      setMessage(null);
      setProgress({ phase: "validating", percent: 0 });
      try {
        const row = parent
          ? await uploadNewVersion(parent, file, authUser?.id ?? null, setProgress)
          : await uploadToEnterpriseCenter({
              category,
              file,
              entityId: entityId.trim() || null,
              entityType: entityId.trim() ? `${category}_entity` : undefined,
              uploadedBy: authUser?.id ?? null,
              onProgress: setProgress,
            });
        setMessage(`Imepakiwa: ${row.file_name} (v${row.version_number})`);
        setFile(null);
        setPreview(row);
        await loadHistory();
      } catch (e) {
        setError(userFacingQueryError(e instanceof Error ? e.message : String(e)));
      } finally {
        setUploading(false);
        setProgress(null);
      }
    },
    [authUser?.id, category, entityId, file, loadHistory],
  );

  const guard = uploadCategoryGuard(category);
  const maxMb = Math.round(guard.maxBytes / (1024 * 1024));

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border-4 border-double border-[#0B3C5D]/35 bg-gradient-to-br from-[#0B3C5D] via-slate-800 to-slate-950 p-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200/90">Enterprise Upload Center</p>
        <h2 className="mt-1 text-xl font-bold">Kituo cha Upakiaji</h2>
        <p className="mt-2 text-sm text-slate-200/90">
          Risiti · Ripoti · Vyeti · Saini · Miradi · Michango — toleo, hakiki, historia
        </p>
      </header>

      <div className="flex flex-wrap justify-center gap-2">
        {UPLOAD_CENTER_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategory(c.id);
              setFile(null);
              setError(null);
              setPreview(null);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              category === c.id ? "bg-cyan-500 text-[#0a1628]" : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {c.labelSw}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-900">{message}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-[#0B1F3A]">
            <Upload className="h-4 w-4" aria-hidden />
            Pakia — {catMeta.labelSw}
          </h3>
          <p className="mb-3 text-[10px] text-slate-500">{catMeta.hint} · hadi {maxMb}MB</p>

          {(category === "project" || category === "contribution") && (
            <label className="mb-3 block text-xs">
              <span className="font-medium text-slate-700">Kitambulisho cha rekodi (si lazima)</span>
              <input
                type="text"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="UUID ya mradi / batch"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          )}

          <EnterpriseDocumentUpload
            label={`Chagua faili (${catMeta.labelEn})`}
            selectedFile={file}
            onFileChange={setFile}
            onValidationError={setError}
            uploading={uploading}
            progress={progress}
            lastError={error}
            onRetry={() => void runUpload()}
          />

          <button
            type="button"
            disabled={!file || uploading}
            onClick={() => void runUpload()}
            className="mt-3 w-full rounded-lg bg-[#0B1F3A] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {uploading ? "Inapakia…" : "Pakia sasa"}
          </button>
        </section>

        <UploadFilePreview row={preview} onClose={() => setPreview(null)} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0B1F3A]">
          <History className="h-4 w-4" aria-hidden />
          Historia ya faili
        </h3>
        {history.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Hakuna upakiaji bado kwa kategoria hii.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2">Faili</th>
                  <th className="p-2">Toleo</th>
                  <th className="p-2">Ukubwa</th>
                  <th className="p-2">Muda</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="max-w-[12rem] truncate p-2 font-medium" title={row.file_name}>
                      {row.file_name}
                    </td>
                    <td className="p-2">v{row.version_number}</td>
                    <td className="p-2">{(row.file_size_bytes / 1024).toFixed(0)} KB</td>
                    <td className="p-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString("sw-TZ")}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-0.5 text-[10px] font-semibold"
                          onClick={() => setPreview(row)}
                        >
                          Hakiki
                        </button>
                        <button
                          type="button"
                          className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-950"
                          onClick={() => {
                            setFile(null);
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = ".pdf,.png,.jpg,.jpeg,.xlsx,.csv";
                            input.onchange = () => {
                              const f = input.files?.[0];
                              if (!f) return;
                              if (f.size > guard.maxBytes) {
                                setError(`Faili ni kubwa mno (kikomo ${maxMb}MB).`);
                                return;
                              }
                              setFile(f);
                              void (async () => {
                                setUploading(true);
                                try {
                                  const next = await uploadNewVersion(row, f, authUser?.id ?? null, setProgress);
                                  setMessage(`Toleo jipya: v${next.version_number}`);
                                  setPreview(next);
                                  await loadHistory();
                                } catch (e) {
                                  setError(userFacingQueryError(e instanceof Error ? e.message : String(e)));
                                } finally {
                                  setUploading(false);
                                  setProgress(null);
                                  setFile(null);
                                }
                              })();
                            };
                            input.click();
                          }}
                        >
                          Toleo jipya
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-center text-[10px] text-slate-500">
        Buckets zilizopo zinahifadhiwa — File Manager na moduli nyingine zinaendelea kufanya kazi kawaida.
      </p>
    </div>
  );
}
