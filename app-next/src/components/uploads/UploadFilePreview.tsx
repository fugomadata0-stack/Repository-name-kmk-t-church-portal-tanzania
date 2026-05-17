import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import type { UploadRegistryRow } from "../../lib/enterpriseUploadCenter";
import { resolveUploadPreviewUrl } from "../../services/enterpriseUploadCenterService";

type Props = {
  row: UploadRegistryRow | null;
  onClose?: () => void;
};

export function UploadFilePreview({ row, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void resolveUploadPreviewUrl(row)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Hakikuwezekana kuhakiki.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row]);

  if (!row) return null;

  const mime = (row.mime_type ?? "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const isPdf = mime.includes("pdf");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-[#0B1F3A]">{row.file_name}</p>
          <p className="text-[10px] text-slate-500">
            v{row.version_number} · {(row.file_size_bytes / 1024).toFixed(1)} KB · {row.category}
          </p>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800">
            Funga
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Inaandaa hakiki…</p>
      ) : error ? (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : !url ? (
        <p className="py-6 text-center text-sm text-slate-500">Hakuna URL ya hakiki.</p>
      ) : isImage ? (
        <img
          src={url}
          alt={row.file_name}
          className="mx-auto max-h-72 max-w-full rounded-lg border border-slate-200 object-contain"
        />
      ) : isPdf ? (
        <iframe
          title={row.file_name}
          src={url}
          className="h-80 w-full rounded-lg border border-slate-200 bg-slate-50"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-slate-600">
          <FileText className="h-10 w-10" aria-hidden />
          <p className="text-sm">Hakiki haipatikani kwa aina hii ya faili.</p>
        </div>
      )}

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#123C69] hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Fungua kwenye kichupo kipya
        </a>
      ) : null}
    </div>
  );
}
