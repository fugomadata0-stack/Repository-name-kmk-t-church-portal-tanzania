import { usePortal } from "../../context/PortalContext";
import { AuthSupportStrip } from "./AuthSupportStrip";
import { WhatsAppSupportButton } from "./WhatsAppSupportButton";

/** Akaunti imeingia lakini hakuna wasifu wa kitengo ulioidhinishwa. */
export function ProfileGateBlocked() {
  const { signOut, authUser } = usePortal();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200/80 px-4 py-12">
      <div className="auth-enterprise-card w-full max-w-lg p-8 text-center shadow-xl">
        <h1 className="text-xl font-bold text-[#0f1e46]">Ufikiaji haujasajiliwa / Access pending</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-700">
          Akaunti yako haijaidhinishwa na msimamizi. Wasiliana na timu ya msaada ili kuunganisha akaunti yako na jukumu linalofaa.
        </p>
        {authUser?.email ? (
          <p className="mt-3 text-sm text-slate-500">
            Akaunti / Account: <span className="font-medium text-slate-800">{authUser.email}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <WhatsAppSupportButton context="approval_support" label="Wasiliana WhatsApp" variant="primary" />
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Toka / Sign out
          </button>
        </div>
        <div className="mt-6 text-left">
          <AuthSupportStrip context="approval_support" compact />
        </div>
      </div>
    </div>
  );
}
