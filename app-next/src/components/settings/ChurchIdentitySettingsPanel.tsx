import { useCallback, useEffect, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import type { ChurchIdentityRow } from "../../services/settingsTablesService";
import { fetchChurchIdentity, saveChurchIdentity } from "../../services/settingsTablesService";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";

const empty: Omit<ChurchIdentityRow, "id"> = {
  official_church_name: "",
  country: "Tanzania",
  headquarters: "",
  main_phone: "",
  main_email: "",
  postal_address: "",
  website_url: "",
  vision: "",
  mission: "",
  core_values: "",
};

export function ChurchIdentitySettingsPanel() {
  const { pushToast, reportError } = usePortal();
  const [form, setForm] = useState<Omit<ChurchIdentityRow, "id">>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchChurchIdentity();
      if (row) setForm({ ...empty, ...row });
      else setForm(empty);
    } catch (e) {
      reportError(e, "Utambulisho wa kanisa — pakua");
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
      await saveChurchIdentity(form);
      pushToast("Utambulisho wa kanisa umehifadhiwa.", "success");
    } catch (err) {
      reportError(err, "Utambulisho wa kanisa — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-[#0f1e46] to-[#1e3a6e] p-5 text-white shadow-lg">
        <div>
          <h2 className="text-xl font-bold">Utambulisho wa Kanisa</h2>
          <p className="text-sm text-blue-100">Jedwali: church_identity (Supabase)</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Pakia upya
        </button>
      </header>
      {loading ? (
        <p className="text-slate-600">Inapakia kutoka Supabase…</p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          {(
            [
              ["official_church_name", "Jina rasmi la kanisa"],
              ["country", "Nchi"],
              ["headquarters", "Makao makuu"],
              ["main_phone", "Simu kuu"],
              ["main_email", "Barua pepe kuu"],
              ["postal_address", "Anwani ya posta"],
              ["website_url", "Tovuti (URL)"],
            ] as const satisfies ReadonlyArray<readonly [keyof Omit<ChurchIdentityRow, "id" | "vision" | "mission" | "core_values">, string]>
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
          {(["vision", "mission", "core_values"] as const).map((key) => (
            <label key={key} className="grid gap-1 text-sm font-medium text-slate-800">
              {key === "vision" ? "Dira" : key === "mission" ? "Lengo" : "Thamani kuu"}
              <textarea
                className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="justify-self-start rounded-xl bg-blue-900 px-6 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Inahifadhi…" : "Hifadhi kwenye Supabase"}
          </button>
        </form>
      )}
    </section>
  );
}
