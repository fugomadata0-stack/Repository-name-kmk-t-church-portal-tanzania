import { useEffect, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import type { PortalCategoryItem, PortalCustomFieldItem } from "../../types";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";

export function SiteTaxonomyPanel({ mode }: { mode: "categories" | "custom_fields" }) {
  const { site, saveSite, pushToast, reportError, refreshSite } = usePortal();
  const [categories, setCategories] = useState<PortalCategoryItem[]>([]);
  const [fields, setFields] = useState<PortalCustomFieldItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCategories(site.categories?.length ? [...site.categories] : []);
    setFields(site.custom_fields?.length ? [...site.custom_fields] : []);
  }, [site.categories, site.custom_fields]);

  async function saveCategories() {
    const valid = categories.filter((c) => c.name.trim() !== "");
    if (categories.length > 0 && valid.length === 0) {
      pushToast("Jina la kundi linahitajika — ondoa safu tupu au jaza jina.", "error");
      return;
    }
    setSaving(true);
    try {
      await saveSite({ categories: valid });
      pushToast("Makundi yamehifadhiwa kwenye Supabase.", "success");
    } catch (e) {
      reportError(e, "Makundi — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  async function saveFields() {
    const partial = fields.some((f) => (f.label.trim() || f.field_key.trim()) && (!f.label.trim() || !f.field_key.trim()));
    if (partial) {
      pushToast("Kila uwanja lazima uwe na lebo na field_key (slug) wakati mmoja.", "error");
      return;
    }
    const valid = fields.filter((f) => f.label.trim() && f.field_key.trim());
    setSaving(true);
    try {
      await saveSite({ custom_fields: valid });
      pushToast("Custom fields zimehifadhiwa kwenye Supabase.", "success");
    } catch (e) {
      reportError(e, "Custom fields — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  function addCategory() {
    setCategories((c) => [...c, { id: `c-${Date.now()}`, name: "" }]);
  }

  function addField() {
    setFields((f) => [...f, { id: `f-${Date.now()}`, label: "", field_key: "" }]);
  }

  if (mode === "categories") {
    return (
      <section className="space-y-4">
        <SettingsSupabaseBanner />
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow">
          <div>
            <h2 className="text-xl font-bold text-[#0f1e46]">Makundi</h2>
            <p className="text-sm text-slate-600">site_settings.categories → Supabase</p>
            <p className="mt-1 max-w-xl text-xs text-emerald-800">
              Makundi haya huunganishwa na kidokezo cha kategoria kwenye Fedha na uchujaji wa Mapato — ongeza bila kikomo; haijalishi idadi ya safu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshSite()}
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Pakia upya
          </button>
        </header>
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow">
          {categories.map((row, i) => (
            <div key={row.id} className="flex flex-wrap gap-2">
              <input
                placeholder="Jina la kundi"
                className="min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm"
                value={row.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setCategories((prev) => prev.map((x, j) => (j === i ? { ...x, name: v } : x)));
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-rose-200 px-2 text-sm text-rose-700"
                onClick={() => setCategories((prev) => prev.filter((_, j) => j !== i))}
              >
                Ondoa
              </button>
            </div>
          ))}
          <button type="button" className="rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-900" onClick={addCategory}>
            Ongeza kundi
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveCategories()}
            className="ml-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "…" : "Hifadhi makundi"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow">
        <div>
          <h2 className="text-xl font-bold text-[#0f1e46]">Custom fields</h2>
          <p className="text-sm text-slate-600">site_settings.custom_fields → Supabase</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshSite()}
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800"
        >
          Pakia upya
        </button>
      </header>
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow">
        {fields.map((row, i) => (
          <div key={row.id} className="flex flex-wrap gap-2">
            <input
              placeholder="Lebo"
              className="min-w-[140px] rounded-lg border px-3 py-2 text-sm"
              value={row.label}
              onChange={(e) => {
                const v = e.target.value;
                setFields((prev) => prev.map((x, j) => (j === i ? { ...x, label: v } : x)));
              }}
            />
            <input
              placeholder="field_key (slug)"
              className="min-w-[140px] rounded-lg border px-3 py-2 text-sm"
              value={row.field_key}
              onChange={(e) => {
                const v = e.target.value;
                setFields((prev) => prev.map((x, j) => (j === i ? { ...x, field_key: v } : x)));
              }}
            />
            <button
              type="button"
              className="rounded-lg border border-rose-200 px-2 text-sm text-rose-700"
              onClick={() => setFields((prev) => prev.filter((_, j) => j !== i))}
            >
              Ondoa
            </button>
          </div>
        ))}
        <button type="button" className="rounded-lg border border-blue-300 px-3 py-2 text-sm" onClick={addField}>
          Ongeza uwanja
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveFields()}
          className="ml-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "…" : "Hifadhi fields"}
        </button>
      </div>
    </section>
  );
}
