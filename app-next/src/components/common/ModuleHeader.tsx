interface Props {
  title: string;
  subtitle: string;
  /** Rudi: false inapoonyesha tayari hali ya kwanza (sawia na Topbar) */
  canBack?: boolean;
  onAdd?: () => void;
  canAdd?: boolean;
  /** Fumbatia Ongeza wakati fomu/madoido yako wazi */
  addDisabled?: boolean;
  actionButtons?: {
    key: string;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    disabledMessage?: string;
  }[];
}

export function ModuleHeader({
  title,
  subtitle,
  canBack = true,
  onAdd,
  canAdd = true,
  addDisabled = false,
  actionButtons = [],
}: Props) {
  const goBack = () => {
    if (!canBack) return;
    window.dispatchEvent(new Event("kmt-portal-submodule-back"));
  };
  return (
    <div className="rounded-2xl border border-[#123C69]/40 bg-gradient-to-r from-[#0B1F3A] via-[#0f2744] to-[#123C69] p-4 text-white shadow-xl sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 pr-1">
          <h2 className="break-words text-xl font-bold leading-relaxed text-white drop-shadow-sm sm:text-2xl">{title}</h2>
          <p className="mt-1.5 break-words text-sm font-medium leading-relaxed text-slate-100/95">{subtitle}</p>
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={goBack}
            disabled={!canBack}
            title={canBack ? undefined : "Tayari uko kwenye Dashibodi."}
            className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Rudi Nyuma
          </button>
          {canAdd && (
            <button
              type="button"
              onClick={onAdd}
              disabled={addDisabled || !onAdd}
              className="rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold text-[#0B1F3A] shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ongeza
            </button>
          )}
          {actionButtons.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled || !action.onClick}
              title={action.disabled ? action.disabledMessage ?? "Kitendo hiki hakipatikani sasa." : undefined}
              className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
