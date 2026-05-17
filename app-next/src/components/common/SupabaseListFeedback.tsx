import { HAKUNA_DATA_BADO_SW } from "../../lib/supabaseUiMessages";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";
import { PortalListSkeleton } from "./PortalSkeleton";

type Props = {
  loading: boolean;
  loadError: string | null;
  isEmpty: boolean;
  className?: string;
  tone?: "default" | "gentle";
  emptyMessage?: string;
  showSkeleton?: boolean;
  onRetry?: () => void;
};

export function SupabaseListFeedback(props: Props) {
  const {
    loading,
    loadError,
    isEmpty,
    className = "",
    tone = "gentle",
    emptyMessage = HAKUNA_DATA_BADO_SW,
    showSkeleton = true,
    onRetry,
  } = props;

  if (loading) {
    if (!showSkeleton) return null;
    return <PortalListSkeleton className={className} />;
  }

  if (loadError) {
    const errClass =
      tone === "gentle"
        ? "border-amber-200/90 bg-amber-50/90 text-amber-950"
        : "border-rose-200 bg-rose-50 text-rose-900";
    return (
      <div
        className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${errClass} ${className}`}
        role="alert"
        aria-live="polite"
      >
        <p className="font-medium">{userFacingQueryError(loadError)}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-lg border border-current/25 bg-white/80 px-3 py-1.5 text-xs font-semibold hover:bg-white"
          >
            Jaribu tena
          </button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 ${className}`}
        role="status"
      >
        {emptyMessage}
      </div>
    );
  }

  return null;
}
