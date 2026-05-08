/** Hakuna moduli yenye can_view — wasifu wa kitengo upo lakini matrix ni tupu kwa mtumiaji. */
export function NoModuleAccessNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50/90 p-6 text-center text-slate-800">
      <p className="font-semibold text-[#0f1e46]">Huna ruhusa ya moduli yoyote</p>
      <p className="mt-2 text-sm text-slate-600">
        Wasifu wako uko hai lakini jukumu halijapewa uwezo wa kuona moduli. Msimamizi aangalie matrix ya ruhusa kwa nafasi yako.
      </p>
    </div>
  );
}
