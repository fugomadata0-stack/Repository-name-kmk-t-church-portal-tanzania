import { useCallback, useEffect, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import type { BrandingSettingsRow } from "../../services/settingsTablesService";
import { fetchBrandingSettings, saveBrandingSettings } from "../../services/settingsTablesService";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";

const empty: Omit<BrandingSettingsRow, "id"> = {
  logo: "",
  favicon: "",
  primary_color: "#1a4ec3",
  secondary_color: "#12254e",
  accent_color: "#d8b14a",
  hero_bg: "",
  jesus_image: "",
  bible_image: "",
  church_image: "",
  theme_mode: "dark",
  footer_text: "",
};

export function BrandingTablePanel() {
  const { pushToast, reportError } = usePortal();
  const [form, setForm] = useState<Omit<BrandingSettingsRow, "id">>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchBrandingSettings();
      if (row) setForm({ ...empty, ...row });
      else setForm(empty);
    } catch (e) {
      reportError(e, "Branding jedwali — pakua");
      setForm(empty);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveBrandingSettings(form);
      pushToast("Branding imehifadhiwa.", "success");
    } catch (err) {
      reportError(err, "Branding jedwali — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-slate-900 to-blue-950 p-5 text-white shadow-lg">
        <div>
          <h2 className="text-xl font-bold">Logo &amp; Branding</h2>
          <p className="text-sm text-amber-100">Jedwali: branding_settings (Supabase)</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-amber-300/50 bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Pakia upya
        </button>
      </header>
      {loading ? (
        <p className="text-slate-600">Inapakia…</p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-md md:grid-cols-2">
          {(
            [
              ["logo", "Logo (URL)"],
              ["favicon", "Favicon (URL)"],
              ["primary_color", "Rangi ya msingi"],
              ["secondary_color", "Rangi ya pili"],
              ["accent_color", "Rangi ya msingi (accent)"],
              ["hero_bg", "Hero background (URL)"],
              ["jesus_image", "Picha Jesus (URL)"],
              ["bible_image", "Biblia (URL)"],
              ["church_image", "Kanisa (URL)"],
              ["theme_mode", "Hali ya mandhari (dark/light)"],
            ] as const satisfies ReadonlyArray<readonly [keyof Omit<BrandingSettingsRow, "id" | "footer_text">, string]>
          ).map(([key, label]) => (
            <label key={key} className="grid gap-1 text-sm font-medium text-slate-800">
              {label}
              <input
                className="rounded-xl border border-slate-200 px-3 py-2"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="grid gap-1 text-sm font-medium text-slate-800 md:col-span-2">
            Maandishi ya chini (footer)
            <textarea
              className="min-h-[72px] rounded-xl border border-slate-200 px-3 py-2"
              value={form.footer_text}
              onChange={(e) => setForm((f) => ({ ...f, footer_text: e.target.value }))}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-2.5 font-semibold text-white md:col-span-2 disabled:opacity-50"
          >
            {saving ? "Inahifadhi…" : "Hifadhi branding"}
          </button>
        </form>
      )}
    </section>
  );
}
