import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Wrench, ShieldCheck, RefreshCw } from "lucide-react";
import { getSupabase } from "../../lib/supabaseClient";

type MaintenanceSettings = { enabled: boolean; message: string };
const DEFAULT_MESSAGE = "Tovuti na mfumo wetu kwa sasa unafanyiwa maboresho ya kiufundi ili kuboresha utendaji, usalama na ubora wa huduma. Kwa muda huu, baadhi ya huduma zinaweza kutopatikana. Tunaomba radhi kwa usumbufu wowote. Tafadhali jaribu tena baada ya muda mfupi.";

function isPrivileged(role: unknown): boolean {
  const value = String(role ?? "").trim().toLowerCase().replace(/[ -]/g, "_");
  return ["super_admin","super_administrator","chief_admin","chief_administrator","national_admin","national_administrator","developer","system_admin","system_administrator","office_admin","office_administrator"].includes(value);
}

export function GlobalMaintenanceGate({ role, profileRole, authenticated, children }: {
  role?: unknown; profileRole?: unknown; authenticated: boolean; children: ReactNode;
}) {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [checking, setChecking] = useState(true);
  const privileged = authenticated && (isPrivileged(role) || isPrivileged(profileRole));

  const load = useCallback(async () => {
    const client = getSupabase();
    if (!client) { setSettings(null); setChecking(false); return; }
    try {
      const { data, error } = await client.rpc("get_public_maintenance_status");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setSettings({ enabled: Boolean(row?.maintenance_enabled), message: String(row?.maintenance_message ?? "").trim() });
    } catch {
      // Fail open during DB/API outage; avoid a permanent public lockout.
      setSettings(null);
    } finally { setChecking(false); }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    const onVisibility = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  if (privileged || checking || !settings?.enabled) return <>{children}</>;
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#081323] px-4 py-10 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur">
        <div className="px-6 py-10 sm:px-10 sm:py-14 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-400/10 ring-1 ring-amber-300/25">
            <Wrench className="h-9 w-9 text-amber-300" aria-hidden="true" />
          </div>
          <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-amber-300">SYSTEM MAINTENANCE</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tunaboresha huduma zetu.</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-200">{settings.message || DEFAULT_MESSAGE}</p>
          <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
            <p className="font-semibold text-white">Tafadhali jaribu tena baada ya muda mfupi.</p>
            <p className="mt-2 text-sm text-slate-300">Tunajitahidi kuhakikisha unapata huduma bora, salama na yenye ufanisi zaidi.</p>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => { setChecking(true); void load(); }} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#10223a] transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-[#081323]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Jaribu tena
            </button>
            <a href="/?maintenance-admin-login=1" className="inline-flex items-center rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">Developer / Admin access</a>
          </div>
          <div className="mt-9 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Asante kwa uvumilivu na imani yako.</div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
      </section>
    </main>
  );
}
