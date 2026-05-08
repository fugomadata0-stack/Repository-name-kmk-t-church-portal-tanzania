import type { SiteSettingsState } from "../../types";

export function MaintenanceBanner({ site }: { site: SiteSettingsState }) {
  if (!site.maintenance_mode || !site.maintenance_message?.trim()) return null;
  return (
    <div
      role="status"
      className="border-b border-amber-400 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 px-4 py-3 text-center text-sm font-medium text-amber-950 shadow-inner"
    >
      <span className="font-bold uppercase tracking-wide">Matengenezoe</span>
      <span className="mx-2 text-amber-800">·</span>
      {site.maintenance_message.trim()}
    </div>
  );
}
