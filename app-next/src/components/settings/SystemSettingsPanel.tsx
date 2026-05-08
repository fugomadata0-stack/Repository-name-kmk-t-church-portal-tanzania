import { useCallback, useEffect, useState } from "react";
import type { SystemSettingsRow } from "../../services/settingsTablesService";
import { fetchSystemSettings, saveSystemSettings } from "../../services/settingsTablesService";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";

const empty: Omit<SystemSettingsRow, "id"> = {
  system_name: "",
  short_name: "",
  motto: "",
  official_description: "",
  timezone: "Africa/Dar_es_Salaam",
  default_date_format: "DD/MM/YYYY",
  default_currency: "TZS",
  status: "active",
};

export function SystemSettingsPanel() {
  const { pushToast, reportError } = usePortal();
  const [form, setForm] = useState<Omit<SystemSettingsRow, "id">>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchSystemSettings();
      if (row) setForm({ ...empty, ...row });
      else setForm(empty);
    } catch (e) {
      reportError(e, "Mipangilio ya mfumo — pakua");
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
      await saveSystemSettings(form);
      pushToast("Mipangilio ya mfumo yamehifadhiwa.", "success");
    } catch (err) {
      reportError(err, "Mipangilio ya mfumo — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-blue-200 bg-white p-5 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-[#0f1e46]">Mipangilio ya jumla ya mfumo</h2>
          <p className="text-sm text-slate-600">Jedwali: system_settings (Supabase)</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
        >
          Pakia upya
        </button>
      </header>
      {loading ? (
        <p className="text-slate-600">Inapakia…</p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow md:grid-cols-2">
          {(
            [
              ["system_name", "Jina la mfumo"],
              ["short_name", "Jina fupi"],
              ["motto", "Kauli mbiu"],
              ["timezone", "Timezone"],
              ["default_date_format", "Muundo wa tarehe"],
              ["default_currency", "Sarafu"],
              ["status", "Hali (active/inactive)"],
            ] as const satisfies ReadonlyArray<readonly [keyof Omit<SystemSettingsRow, "id" | "official_description">, string]>
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
            Maelezo rasmi
            <textarea
              className="min-h-[100px] rounded-xl border border-slate-200 px-3 py-2"
              value={form.official_description}
              onChange={(e) => setForm((f) => ({ ...f, official_description: e.target.value }))}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#0f1e46] px-6 py-2.5 font-semibold text-white md:col-span-2 disabled:opacity-50"
          >
            {saving ? "Inahifadhi…" : "Hifadhi"}
          </button>
        </form>
      )}
    </section>
  );
}
