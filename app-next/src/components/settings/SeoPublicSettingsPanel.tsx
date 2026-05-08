import { useEffect, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { uploadSitePublicAsset } from "../../lib/siteAssetsUpload";
import { getSupabase } from "../../lib/supabaseClient";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";
import type { SiteSettingsState } from "../../types";

function emptyDraft(s: SiteSettingsState): SiteSettingsState {
  return {
    ...s,
    social_links: { ...s.social_links },
  };
}

export function SeoPublicSettingsPanel() {
  const { site, saveSite, pushToast, reportError, loading, logAudit, canPortalEditModule } = usePortal();
  const allowed = canPortalEditModule("mipangilio");
  const [draft, setDraft] = useState<SiteSettingsState>(() => emptyDraft(site));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(emptyDraft(site));
  }, [site]);

  async function applyAll() {
    if (!allowed) return;
    setSaving(true);
    try {
      await saveSite({
        meta_title: draft.meta_title,
        meta_description: draft.meta_description,
        og_image_url: draft.og_image_url,
        canonical_base_url: draft.canonical_base_url,
        maintenance_mode: draft.maintenance_mode,
        maintenance_message: draft.maintenance_message,
        social_links: { ...draft.social_links },
        favicon_url: draft.favicon_url,
        privacy_policy_url: draft.privacy_policy_url,
        terms_of_service_url: draft.terms_of_service_url,
        cookies_notice_url: draft.cookies_notice_url,
        support_url: draft.support_url,
      });
      await logAudit("site_seo_public_save", "site_settings", site.id, { maintenance: draft.maintenance_mode });
    } catch (e) {
      reportError(e, "SEO — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFaviconFile(file: File) {
    if (!getSupabase()) {
      pushToast("Weka VITE_SUPABASE_* kwenye .env.local.", "error");
      return;
    }
    if (!allowed) return;
    setSaving(true);
    try {
      const url = await uploadSitePublicAsset("favicon", file);
      setDraft((d) => ({ ...d, favicon_url: url }));
      await saveSite({ favicon_url: url });
      pushToast("Favicon imehifadhiwa.", "success");
    } catch (e) {
      reportError(e, "SEO — favicon");
    } finally {
      setSaving(false);
    }
  }

  async function uploadOg(file: File) {
    if (!getSupabase()) {
      pushToast("Weka VITE_SUPABASE_* kwenye .env.local.", "error");
      return;
    }
    if (!allowed) return;
    setSaving(true);
    try {
      const url = await uploadSitePublicAsset("og", file);
      setDraft((d) => ({ ...d, og_image_url: url }));
      await saveSite({ og_image_url: url });
      pushToast("Picha ya OG imehifadhiwa.", "success");
    } catch (e) {
      reportError(e, "SEO — OG");
    } finally {
      setSaving(false);
    }
  }

  const sl = (k: keyof SiteSettingsState["social_links"], v: string) =>
    setDraft((d) => ({ ...d, social_links: { ...d.social_links, [k]: v } }));

  return (
    <div className="space-y-6">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-[#0a1628] via-[#0c4a6e] to-[#0f2744] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Umma &amp; SEO</p>
        <h2 className="mt-1 text-2xl font-bold">SEO, mitandao, na matengenezoe</h2>
        <p className="mt-2 max-w-3xl text-sm text-cyan-100">
          Hifadhiwa kwenye <code className="rounded bg-white/10 px-1">site_settings</code> — SEO, OG, matengenezoe, mitandao, favicon, viungo vya sheria, msaada, na bango la kuki (kuki inategemea ujumbe uliowekwa hapa).
        </p>
      </header>

      {!allowed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Huna ruhusa ya kuhariri. Badilisha jukumu (Topbar) au wasiliana na admin.</div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h3 className="text-lg font-bold text-[#0f1e46]">SEO &amp; kichwa cha kivinjari</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Meta title (kichwa cha tab)</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={draft.meta_title}
              onChange={(e) => setDraft((d) => ({ ...d, meta_title: e.target.value }))}
              disabled={!allowed}
              placeholder="Mfano: KMT — Kanisa la Kristo Tanzania"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Meta description</span>
            <textarea
              className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2"
              value={draft.meta_description}
              onChange={(e) => setDraft((d) => ({ ...d, meta_description: e.target.value }))}
              disabled={!allowed}
              placeholder="Muhtasari mfupi unaonekana utafutaji / kushiriki"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">URL ya picha ya Open Graph (og:image)</span>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2"
                value={draft.og_image_url}
                onChange={(e) => setDraft((d) => ({ ...d, og_image_url: e.target.value }))}
                disabled={!allowed}
                placeholder="https://..."
              />
              <input
                type="file"
                accept="image/*"
                className="max-w-[200px] text-sm"
                disabled={!allowed || saving}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadOg(f);
                  e.target.value = "";
                }}
              />
            </div>
            <span className="text-xs text-slate-500">Pakia picha 1200×630 inapendekezwa kwa kushiriki mitandao.</span>
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Canonical / base URL (tovuti kuu)</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={draft.canonical_base_url}
              onChange={(e) => setDraft((d) => ({ ...d, canonical_base_url: e.target.value }))}
              disabled={!allowed}
              placeholder="https://kmkt.or.tz"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50/80 p-6 shadow-lg">
        <h3 className="text-lg font-bold text-amber-950">Hali ya matengenezoe</h3>
        <p className="text-sm text-amber-900/90">Watumiaji wataona bango jekundu juu ya portal. Admins bado wanaweza kufanya kazi.</p>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-950">
          <input
            type="checkbox"
            checked={draft.maintenance_mode}
            onChange={(e) => setDraft((d) => ({ ...d, maintenance_mode: e.target.checked }))}
            disabled={!allowed}
            className="h-4 w-4 rounded border-amber-400"
          />
          Weka hali ya matengenezoe
        </label>
        <label className="mt-3 grid gap-1 text-sm">
          <span className="font-medium text-amber-950">Ujumbe</span>
          <textarea
            className="min-h-[72px] rounded-xl border border-amber-200 bg-white px-3 py-2"
            value={draft.maintenance_message}
            onChange={(e) => setDraft((d) => ({ ...d, maintenance_message: e.target.value }))}
            disabled={!allowed}
            placeholder="Mfano: Tovuti inasasishwa hadi saa 6 mchana…"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-[#fffefb] p-6 shadow-lg">
        <h3 className="text-lg font-bold text-[#0f1e46]">Viunganishi vya mitandao (vya umma)</h3>
        <p className="text-sm text-slate-600">Hifadhiwa kama JSON — tumia URL kamili (https://…)</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(
            [
              ["whatsapp", "WhatsApp (URL)"],
              ["facebook", "Facebook"],
              ["youtube", "YouTube"],
              ["instagram", "Instagram"],
              ["twitter_x", "X (Twitter)"],
              ["email_public", "Barua pepe ya umma"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">{label}</span>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2"
                value={draft.social_links[k]}
                onChange={(e) => sl(k, e.target.value)}
                disabled={!allowed}
                placeholder="https://..."
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h3 className="text-lg font-bold text-[#0f1e46]">Favicon &amp; viungo vya kisheria / msaada</h3>
        <p className="text-sm text-slate-600">Favicon inaonekana kwenye tab; viungo hivi vinaonekana chini ya ukurasa (footer).</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Favicon (URL)</span>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2"
                value={draft.favicon_url}
                onChange={(e) => setDraft((d) => ({ ...d, favicon_url: e.target.value }))}
                disabled={!allowed}
                placeholder="https://... (au pakia .ico / .png / .svg)"
              />
              <input
                type="file"
                accept="image/*,.ico"
                className="max-w-[200px] text-sm"
                disabled={!allowed || saving}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFaviconFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            <span className="text-xs text-slate-500">Chaguo: picha 32×32 au 64×64; SVG inapendekezwa.</span>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Sera ya faragha</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={draft.privacy_policy_url}
              onChange={(e) => setDraft((d) => ({ ...d, privacy_policy_url: e.target.value }))}
              disabled={!allowed}
              placeholder="https://..."
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Masharti ya matumizi</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={draft.terms_of_service_url}
              onChange={(e) => setDraft((d) => ({ ...d, terms_of_service_url: e.target.value }))}
              disabled={!allowed}
              placeholder="https://..."
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Maelezo ya kuki (URL ya ukurasa)</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={draft.cookies_notice_url}
              onChange={(e) => setDraft((d) => ({ ...d, cookies_notice_url: e.target.value }))}
              disabled={!allowed}
              placeholder="https://... (unganisha kwenye “Soma zaidi” katika bango la kuki)"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Msaada / desk ya tiketi</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={draft.support_url}
              onChange={(e) => setDraft((d) => ({ ...d, support_url: e.target.value }))}
              disabled={!allowed}
              placeholder="https://..."
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!allowed || saving || loading}
          onClick={() => void applyAll()}
          className="rounded-xl bg-gradient-to-r from-cyan-700 to-blue-900 px-8 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          {saving || loading ? "Inahifadhi…" : "Hifadhi mipangilio hii yote"}
        </button>
      </div>
    </div>
  );
}
