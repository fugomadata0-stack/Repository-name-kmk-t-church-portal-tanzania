interface Props {
  title: string;
  subtitle: string;
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

export function ModuleHeader({ title, subtitle, onAdd, canAdd = true, addDisabled = false, actionButtons = [] }: Props) {
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
  };
  return (
    <div className="rounded-2xl border border-[#123C69]/40 bg-gradient-to-r from-[#0B1F3A] via-[#0f2744] to-[#123C69] p-4 text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white drop-shadow-sm">{title}</h2>
          <p className="mt-0.5 text-sm font-medium text-slate-100">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
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
