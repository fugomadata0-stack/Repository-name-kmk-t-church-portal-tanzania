import { usePortal } from "../../context/PortalContext";

/** Hitilafu ya mtandao / DB wakati wa kusoma portal_directory_profiles — siyo “hujasajiliwa”. */
export function PortalDirectoryLoadError() {
  const { signOut, refreshPortalAccess, authBusy } = usePortal();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-xl font-bold text-[#0f1e46]">Hitilafu ya kusoma wasifu wa mfumo</h1>
        <p className="mt-4 text-base text-slate-700">
          Hatukuweza kupakia wasifu wako wa kitengo (RBAC). Hii kwa kawaida ni tatizo la muunganisho au seva —{" "}
          <strong>siyo</strong> kwamba akaunti yako haijasajiliwa. Jaribu tena au wasiliana na msimamizi ikiwa linaendelea.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void refreshPortalAccess()}
            disabled={authBusy}
            className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-50"
          >
            Jaribu tena
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Toka
          </button>
        </div>
      </div>
    </div>
  );
}
