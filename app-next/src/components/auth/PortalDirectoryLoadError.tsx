import { usePortal } from "../../context/PortalContext";
import { AuthSupportStrip } from "./AuthSupportStrip";
import { WhatsAppSupportButton } from "./WhatsAppSupportButton";

/** Hitilafu ya mtandao / DB wakati wa kusoma portal_directory_profiles — siyo “hujasajiliwa”. */
export function PortalDirectoryLoadError() {
  const { signOut, refreshPortalAccess, authBusy } = usePortal();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200/80 px-4 py-12">
      <div className="auth-enterprise-card w-full max-w-lg p-8 text-center shadow-xl">
        <h1 className="text-xl font-bold text-[#0f1e46]">Hitilafu ya kusoma wasifu / Profile load error</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-700">
          Hatukuweza kupakia wasifu wako wa kitengo. Hii kwa kawaida ni tatizo la muunganisho —{" "}
          <strong>siyo</strong> kwamba akaunti yako haijasajiliwa. Jaribu tena au wasiliana na msaada.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void refreshPortalAccess()}
            disabled={authBusy}
            className="rounded-xl bg-[#0B1F3A] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123C69] disabled:opacity-50"
          >
            {authBusy ? "Inajaribu…" : "Jaribu tena / Retry"}
          </button>
          <WhatsAppSupportButton context="login_help" label="Pata Msaada" variant="subtle" />
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Toka / Sign out
          </button>
        </div>
        <div className="mt-6 text-left">
          <AuthSupportStrip context="login_help" compact />
        </div>
      </div>
    </div>
  );
}
