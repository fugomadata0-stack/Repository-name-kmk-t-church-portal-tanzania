import { usePortal } from "../../context/PortalContext";

/** Akaunti imeingia lakini hakuna wasifu wa kitengo ulioidhinishwa. */
export function ProfileGateBlocked() {
  const { signOut, authUser } = usePortal();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-xl font-bold text-[#0f1e46]">Ufikiaji haujasajiliwa</h1>
        <p className="mt-4 text-base text-slate-700">
          Akaunti yako haijaidhinishwa na msimamizi. Tafadhali wasiliana na msimamizi wa mfumo ili kuunganisha akaunti yako na jukumu linalofaa kwenye orodha ya watumiaji.
        </p>
        {authUser?.email ? (
          <p className="mt-3 text-sm text-slate-500">
            Akaunti: <span className="font-medium text-slate-800">{authUser.email}</span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-8 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Toka
        </button>
      </div>
    </div>
  );
}
