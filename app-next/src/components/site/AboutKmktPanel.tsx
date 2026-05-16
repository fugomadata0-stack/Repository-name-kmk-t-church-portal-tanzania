import { useEffect, useRef, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { uploadSitePublicAsset } from "../../lib/siteAssetsUpload";
import { getSupabase } from "../../lib/supabaseClient";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { matrixCanPublishAbout } from "../../utils/matrixPermissions";
import type { AboutKmktState } from "../../types";

export function AboutKmktPanel() {
  const { about, saveAbout, publishAbout, loading, logAudit, pushToast, reportError, matrixByModule } = usePortal();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [form, setForm] = useState<AboutKmktState>(about);
  const [uploadBusy, setUploadBusy] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(about);
  }, [about]);

  const canPublish = matrixCanPublishAbout(matrixByModule);

  async function handleSave() {
    await saveAbout(form);
    await logAudit("about_kmkt_save", "about_kmkt", form.id, { published: form.published });
  }

  async function uploadAboutAsset(field: "logo_url" | "hero_image_url", file: File) {
    if (!getSupabase()) {
      pushToast("Weka VITE_SUPABASE_* kwenye .env.local.", "error");
      return;
    }
    if (!canPublish) return;
    setUploadBusy(true);
    try {
      const prefix = field === "logo_url" ? "about/logo" : "about/hero";
      const url = await uploadSitePublicAsset(prefix, file);
      setForm((f) => ({ ...f, [field]: url }));
      await saveAbout({ [field]: url });
      await logAudit("about_kmkt_image_upload", "about_kmkt", form.id, { field });
      pushToast("Picha imehifadhiwa kwenye Supabase.", "success");
    } catch (e) {
      reportError(e, "Kuhusu KMKT — picha");
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-[#0f1e46] via-[#1a3a7a] to-[#0f2744] p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Kuhusu KMKT</p>
        <h2 className="mt-1 text-2xl font-bold">Taarifa za Kanisa (hariri & chapisha)</h2>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">
          Rekodi zote zinahifadhiwa kwenye jedwali `about_kmkt`. Huthibitisha chapisho kabla ya kuifanya hai kwa umma (published).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("edit")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "edit" ? "bg-amber-500 text-slate-900" : "bg-white/10"}`}
          >
            Hariri
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "preview" ? "bg-amber-500 text-slate-900" : "bg-white/10"}`}
          >
            Hakiki kabla ya chapisho
          </button>
        </div>
      </header>

      {tab === "preview" ? (
        <article className="rounded-2xl border border-slate-200 bg-[#fefdfb] p-8 shadow-xl">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-200 pb-4">
              <div>
                <h1 className="text-3xl font-extrabold text-[#0f1e46]">{form.church_name}</h1>
                <p className="text-sm font-semibold text-amber-700">{form.abbreviation}</p>
              </div>
              {form.logo_url ? (
                <div className="relative h-16 w-[min(100%,180px)] max-w-[180px] shrink-0">
                  <ResponsiveLazyImage
                    src={form.logo_url}
                    alt="Logo"

                    className="absolute inset-0 h-full w-full object-cover"
                    width={180}
                    height={64}

                    loading="lazy"
                  />
                </div>
              ) : null}
            </div>
            {form.motto ? <p className="text-lg italic text-slate-700">&ldquo;{form.motto}&rdquo;</p> : null}
            <section>
              <h3 className="font-bold text-[#0f1e46]">Dira</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{form.vision || "—"}</p>
            </section>
            <section>
              <h3 className="font-bold text-[#0f1e46]">Lengo</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{form.mission || "—"}</p>
            </section>
            <section>
              <h3 className="font-bold text-[#0f1e46]">Thamani kuu</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{form.core_values || "—"}</p>
            </section>
            <section>
              <h3 className="font-bold text-[#0f1e46]">Historia</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{form.history || "—"}</p>
            </section>
            <section>
              <h3 className="font-bold text-[#0f1e46]">Malengo</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{form.objectives || "—"}</p>
            </section>
            <section className="grid gap-2 md:grid-cols-2">
              <div>
                <h3 className="font-bold text-[#0f1e46]">Makao Makuu</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{form.headquarters || "—"}</p>
              </div>
              <div>
                <h3 className="font-bold text-[#0f1e46]">Mawasiliano</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{form.contacts || "—"}</p>
              </div>
            </section>
            <section>
              <h3 className="font-bold text-[#0f1e46]">Ujumbe wa uongozi</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{form.leadership_message || "—"}</p>
            </section>
            <section>
              <h3 className="font-bold text-[#0f1e46]">Aya ya Biblia</h3>
              <p className="text-slate-700 whitespace-pre-wrap italic">{form.bible_verse || "—"}</p>
            </section>
            <p className="text-xs text-slate-500">
              Hali: <strong>{form.status}</strong> • Chapisho: <strong>{form.published ? "Ndiyo" : "Hapana"}</strong>
            </p>
          </div>
        </article>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(
            [
              ["church_name", "Jina la Kanisa Kamili"],
              ["abbreviation", "Fupi / abbreviation"],
              ["motto", "Kauli mbiu"],
              ["headquarters", "Makao Makuu"],
              ["contacts", "Mawasiliano"],
              ["logo_url", "Logo (URL)"],
              ["hero_image_url", "Hero (URL)"],
            ] as const satisfies ReadonlyArray<
              readonly [
                keyof Pick<
                  AboutKmktState,
                  "church_name" | "abbreviation" | "motto" | "headquarters" | "contacts" | "logo_url" | "hero_image_url"
                >,
                string,
              ]
            >
          ).map(([key, label]) => (
            <label key={key} className="grid gap-1 text-sm">
              <span className="font-semibold text-slate-700">{label}</span>
              <div className="flex flex-wrap gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
                {key === "logo_url" && (
                  <>
                    <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadAboutAsset("logo_url", f);
                      e.target.value = "";
                    }} />
                    <button
                      type="button"
                      disabled={!canPublish || uploadBusy || loading}
                      onClick={() => logoFileRef.current?.click()}
                      className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Pakia logo
                    </button>
                  </>
                )}
                {key === "hero_image_url" && (
                  <>
                    <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadAboutAsset("hero_image_url", f);
                      e.target.value = "";
                    }} />
                    <button
                      type="button"
                      disabled={!canPublish || uploadBusy || loading}
                      onClick={() => heroFileRef.current?.click()}
                      className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Pakia hero
                    </button>
                  </>
                )}
              </div>
            </label>
          ))}
          {(
            [
              ["vision", "Dira"],
              ["mission", "Lengo"],
              ["core_values", "Thamani kuu"],
              ["history", "Historia"],
              ["objectives", "Malengo"],
              ["leadership_message", "Ujumbe wa uongozi"],
              ["bible_verse", "Aya ya Biblia"],
            ] as const satisfies ReadonlyArray<
              readonly [
                keyof Pick<
                  AboutKmktState,
                  "vision" | "mission" | "core_values" | "history" | "objectives" | "leadership_message" | "bible_verse"
                >,
                string,
              ]
            >
          ).map(([key, label]) => (
            <label key={key} className="grid gap-1 text-sm lg:col-span-2">
              <span className="font-semibold text-slate-700">{label}</span>
              <textarea
                className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Hali</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof f.status }))}
            >
              <option value="draft">Rasimu</option>
              <option value="active">Hai</option>
              <option value="inactive">Si hai</option>
            </select>
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSave()}
          className="rounded-xl bg-gradient-to-r from-blue-800 to-blue-950 px-6 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          Hifadhi mabadiliko
        </button>
        {canPublish && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => void publishAbout(true)}
              className="rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-50"
            >
              Chapisha (live)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void publishAbout(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Ondoa chapisho
            </button>
          </>
        )}
      </div>
    </section>
  );
}
