import { useCallback, useId, useState, type CSSProperties, type DragEvent } from "react";
import type { StorageUploadProgress } from "../../lib/enterpriseStorageUpload";
import { PORTAL_DOCUMENT_FILE_GUARD } from "../../lib/enterpriseStorageUpload";
import { validateSelectedFile } from "../../lib/fileUploadGuard";

const DEFAULT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type EnterpriseDocumentUploadProps = {
  label?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  accept?: string;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  onValidationError?: (message: string) => void;
  uploading?: boolean;
  progress?: StorageUploadProgress | null;
  onRetry?: () => void;
  lastError?: string | null;
};

export function EnterpriseDocumentUpload({
  label = "Chagua faili la nyaraka",
  hint,
  disabled = false,
  required = false,
  accept = DEFAULT_ACCEPT,
  selectedFile,
  onFileChange,
  onValidationError,
  uploading = false,
  progress = null,
  onRetry,
  lastError = null,
}: EnterpriseDocumentUploadProps) {
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);

  const pickFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      const err = validateSelectedFile(file, PORTAL_DOCUMENT_FILE_GUARD);
      if (err) {
        onFileChange(null);
        onValidationError?.(err);
        return;
      }
      onFileChange(file);
    },
    [disabled, onFileChange, onValidationError]
  );

  const percent = progress?.percent ?? 0;
  const maxMb = Math.round(PORTAL_DOCUMENT_FILE_GUARD.maxBytes / (1024 * 1024));

  return (
    <label className="grid gap-1 text-xs font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <div
        className={`rounded-lg border border-dashed p-3 text-xs transition-colors ${
          dragOver ? "border-blue-500 bg-blue-50/50" : "border-slate-300 bg-slate-50"
        } ${disabled ? "opacity-60" : ""}`}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          pickFile(e.dataTransfer.files?.[0]);
        }}
      >
        <p className="text-slate-600">
          Buruta faili hapa au bofya browse (PDF, Office, picha, TXT, ZIP — hadi {maxMb}MB).
        </p>
        <input
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled || uploading}
          className="mt-2 block w-full text-sm"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {selectedFile ? (
          <p className="mt-2 font-medium text-slate-800">
            {selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        ) : null}
        {uploading ? (
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-[#0B1F3A] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(4, percent))}%` } as CSSProperties}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-600">
              {progress?.phase === "uploading" ? `Inapakia… ${Math.round(percent)}%` : "Inaandaa…"}
            </p>
          </div>
        ) : null}
        {lastError ? (
          <p className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-800" role="alert">
            {lastError}
          </p>
        ) : null}
        {onRetry && lastError ? (
          <button
            type="button"
            className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-[#0B1F3A]"
            onClick={onRetry}
            disabled={uploading}
          >
            Jaribu tena
          </button>
        ) : null}
      </div>
      {hint ? <span className="font-normal text-slate-500">{hint}</span> : null}
    </label>
  );
}
