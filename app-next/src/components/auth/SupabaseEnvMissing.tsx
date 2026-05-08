import { validateSupabaseEnv } from "../../lib/supabaseClient";

/**
 * Ujumbe wazi wakati VITE_SUPABASE_* hazipo — hakuna data ya uongo, mfumo hauendi bila Supabase.
 */
export function SupabaseEnvMissing() {
  const v = validateSupabaseEnv();
  const detail = v.ok ? "Thamani za mazingira zinakosekana." : v.message;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg" role="alert">
        <h1 className="text-xl font-bold text-rose-900">Imeshindikana kuwasiliana na seva (Supabase)</h1>
        <p className="mt-3 text-sm text-slate-700">
          Mfumo huu unategemea Supabase pekee. Hakuna data ya ndani wala mfano. Sanidi mazingira kisha jaribu tena.
        </p>
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-800">
          {detail}
        </p>
        <p className="mt-4 text-xs text-slate-600">
          Weka <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> na{" "}
          <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> kwenye{" "}
          <code className="rounded bg-slate-100 px-1">app-next/.env.local</code> (au mazingira ya Vercel), kisha anzisha upya
          seva.
        </p>
      </div>
    </div>
  );
}
