import type { ReactNode } from "react";
import { ModalScrollLayer } from "./ModalScrollLayer";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  /** Disable actions while async @ onConfirm runs */
  confirmLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Maudhui ya ziada chini ya ujumbe (mf. textarea). */
  extra?: ReactNode;
}

export function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLoading = false,
  confirmLabel = "Futa",
  cancelLabel = "Ghairi",
  extra,
}: Props) {
  if (!open) return null;
  const busy = confirmLoading;
  return (
    <ModalScrollLayer onBackdropClick={onCancel} maxWidthClass="max-w-md">
      <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {extra ? <div className="mt-3">{extra}</div> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            aria-busy={busy}
            className="inline-flex min-w-[7rem] items-center justify-center rounded-lg bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {busy ? "Inasubiri…" : confirmLabel}
          </button>
        </div>
      </div>
    </ModalScrollLayer>
  );
}
