import { useCallback, useId, useRef, useState, type DragEvent } from "react";
import type { StorageUploadProgress } from "../../lib/enterpriseStorageUpload";
import { ResponsiveLazyImage } from "./ResponsiveLazyImage";

export type EnterpriseImageUploadProps = {
  label: string;
  hint?: string;
  currentUrl?: string | null;
  alt: string;
  disabled?: boolean;
  accept?: string;
  previewClassName?: string;
  onUpload: (file: File, onProgress: (p: StorageUploadProgress) => void, signal: AbortSignal) => Promise<string>;
  onSuccess?: (publicUrl: string) => void;
  onError?: (message: string) => void;
};

export function EnterpriseImageUpload({
  label,
  hint,
  currentUrl,
  alt,
  disabled = false,
  accept = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/svg+xml,image/avif,.heic,.heif,.svg,.avif",
  previewClassName = "relative h-44 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner",
  onUpload,
  onSuccess,
  onError,
}: EnterpriseImageUploadProps) {
  const inputId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<StorageUploadProgress | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const displayUrl = preview || currentUrl || null;

  const runUpload = useCallback(
    async (file: File) => {
      if (disabled || busy) return;
      setLastError(null);
      setBusy(true);
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      try {
        const publicUrl = await onUpload(file, setProgress, ac.signal);
        setPreview(publicUrl);
        onSuccess?.(publicUrl);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        setPreview(currentUrl ?? null);
        onError?.(msg);
      } finally {
        URL.revokeObjectURL(objectUrl);
        setBusy(false);
        setProgress(null);
        abortRef.current = null;
      }
    },
    [busy, currentUrl, disabled, onError, onSuccess, onUpload]
  );

  const onPick = (file: File | undefined) => {
    if (!file || disabled) return;
    void runUpload(file);
  };

  const cancel = () => {
    abortRef.current?.abort();
    setBusy(false);
    setProgress(null);
    setPreview(currentUrl ?? null);
  };

  const percent = progress?.percent ?? 0;
  const speedLabel =
    progress?.bytesPerSecond && progress.bytesPerSecond > 0
      ? `${Math.round(progress.bytesPerSecond / 1024)} KB/s`
      : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${previewClassName} ${dragOver ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          onPick(e.dataTransfer.files?.[0]);
        }}
      >
        {displayUrl ? (
          <ResponsiveLazyImage
            src={displayUrl}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover"
            width={352}
            height={352}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-slate-500">
            <span className="text-2xl opacity-40" aria-hidden>
              +
            </span>
            <span>Buruta picha au bofya chini</span>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 px-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" aria-hidden />
            <div className="w-full max-w-[140px]">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-800 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(4, percent))}%` }}
                />
              </div>
              <p className="mt-1 text-center text-[10px] font-medium text-slate-700">
                {progress?.phase === "optimizing"
                  ? "Inaboresha picha…"
                  : progress?.phase === "uploading"
                    ? `Inapakia… ${Math.round(percent)}%`
                    : "Inakamilisha…"}
                {speedLabel ? ` · ${speedLabel}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sitisha
            </button>
          </div>
        ) : null}
      </div>

      {!disabled ? (
        <label
          htmlFor={inputId}
          className={`w-full max-w-[220px] rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-900 hover:bg-blue-100 ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        >
          {label}
          <input
            id={inputId}
            type="file"
            accept={accept}
            className="hidden"
            disabled={busy}
            onChange={(ev) => {
              onPick(ev.target.files?.[0]);
              ev.target.value = "";
            }}
          />
        </label>
      ) : null}

      {hint ? <p className="max-w-[240px] text-center text-[10px] text-slate-500">{hint}</p> : null}
      {lastError ? (
        <p className="max-w-[240px] rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-center text-[10px] text-rose-800" role="alert">
          {lastError}
        </p>
      ) : null}
    </div>
  );
}
