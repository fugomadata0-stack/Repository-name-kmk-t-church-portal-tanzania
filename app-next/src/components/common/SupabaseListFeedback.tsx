import { HAKUNA_DATA_BADO_SW } from "../../lib/supabaseUiMessages";

type Props = {
  loading: boolean;
  /** Hitilafu ya swala la Supabase — onyesha ujumbe wa kiwango kimoja. */
  loadError: string | null;
  /** Orodha tupu baada ya swala lenye mafanikio. */
  isEmpty: boolean;
  className?: string;
};

/**
 * Maoni ya orodha kutoka Supabase: hitilafu wazi, au hali tupu halisi, si kuficha kwa [] kimya.
 * `loadError` kawaida weka `SUPABASE_QUERY_ERROR_SW` kutoka `supabaseUiMessages`.
 */
export function SupabaseListFeedback(props: Props) {
  const { loading, loadError, isEmpty, className = "" } = props;
  if (loading) return null;
  if (loadError) {
    return (
      <div
        className={`rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900 shadow-sm ${className}`}
        role="alert"
      >
        {loadError}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 ${className}`}>
        {HAKUNA_DATA_BADO_SW}
      </div>
    );
  }
  return null;
}
