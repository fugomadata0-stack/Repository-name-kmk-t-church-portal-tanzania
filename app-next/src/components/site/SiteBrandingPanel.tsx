import { useRef, useState } from "react";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";
import { usePortal } from "../../context/PortalContext";
import { uploadSitePublicAsset } from "../../lib/siteAssetsUpload";
import { getSupabase } from "../../lib/supabaseClient";
import { SettingsSupabaseBanner } from "../settings/SettingsSupabaseBanner";
import { matrixCanManageSiteAssets } from "../../utils/matrixPermissions";

function galleryAsUrls(gallery: unknown[]): string[] {
  return gallery
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object" && "url" in x) return String((x as { url: unknown }).url ?? "");
      return "";
    })
    .filter((u) => u.startsWith("http"));
}

export function SiteBrandingPanel() {
  const { site, saveSite, pushToast, reportError, loading, logAudit, matrixByModule } = usePortal();
  const heroRef = useRef<HTMLInputElement>(null);
  const crossRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [crossPreview, setCrossPreview] = useState<string | null>(null);
  const [manualHero, setManualHero] = useState("");
  const [manualCross, setManualCross] = useState("");
  const [manualGalleryUrl, setManualGalleryUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const allowed = matrixCanManageSiteAssets(matrixByModule);
  const galleryUrls = galleryAsUrls(site.gallery || []);

  async function upload(kind: "hero" | "cross", file: File) {
    const previewUrl = URL.createObjectURL(file);
    if (kind === "hero") setHeroPreview(previewUrl);
    else setCrossPreview(previewUrl);

    if (!getSupabase()) {
      pushToast("Weka VITE_SUPABASE_* kwenye .env.local kupakia moja kwa moja.", "error");
      return;
    }
    setBusy(true);
    try {
      const publicUrl = await uploadSitePublicAsset(kind, file);
      if (kind === "hero") await saveSite({ hero_image_url: publicUrl });
      else await saveSite({ cross_image_url: publicUrl });
      await logAudit("site_image_upload", "site_settings", site.id, { kind });
      pushToast("Picha imepakuliwa na kuunganishwa kwenye Supabase.", "success");
    } catch (e) {
      reportError(e, "Branding — picha kuu/msalaba");
    } finally {
      setBusy(false);
    }
  }

  async function addGalleryFiles(files: FileList | null) {
    if (!files?.length || !getSupabase()) {
      if (!getSupabase()) pushToast("Muunganisho wa Supabase unahitajika kwa gallery.", "error");
      return;
    }
    setBusy(true);
    try {
      const next = [...galleryUrls];
      for (const file of Array.from(files)) {
        const url = await uploadSitePublicAsset("gallery", file);
        next.push(url);
      }
      await saveSite({ gallery: next });
      await logAudit("site_gallery_upload", "site_settings", site.id, { count: files.length });
      pushToast("Picha za gallery zimeongezwa.", "success");
    } catch (e) {
      reportError(e, "Branding — gallery faili");
    } finally {
      setBusy(false);
    }
  }

  async function addGalleryUrl() {
    const u = manualGalleryUrl.trim();
    if (!u.startsWith("http")) {
      pushToast("Weka URL kamili inayoanza na https://", "error");
      return;
    }
    setBusy(true);
    try {
      await saveSite({ gallery: [...galleryUrls, u] });
      setManualGalleryUrl("");
      pushToast("URL imeongezwa kwenye gallery.", "success");
    } catch (e) {
      reportError(e, "Branding — gallery URL");
    } finally {
      setBusy(false);
    }
  }

  async function removeGalleryUrl(url: string) {
    setBusy(true);
    try {
      await saveSite({ gallery: galleryUrls.filter((x) => x !== url) });
      pushToast("Picha imeondolewa orodha.", "success");
    } catch (e) {
      reportError(e, "Branding — ondoa gallery");
    } finally {
      setBusy(false);
    }
  }

  async function applyManualHeroCross() {
    setBusy(true);
    try {
      const patch: { hero_image_url?: string; cross_image_url?: string } = {};
      if (manualHero.trim().startsWith("http")) patch.hero_image_url = manualHero.trim();
      if (manualCross.trim().startsWith("http")) patch.cross_image_url = manualCross.trim();
      if (Object.keys(patch).length === 0) {
        pushToast("Weka angalau URL moja halali (https).", "info");
        setBusy(false);
        return;
      }
      await saveSite(patch);
      setManualHero("");
      setManualCross("");
      pushToast("URL za picha zimesasishwa.", "success");
    } catch (e) {
      reportError(e, "Branding — URL za mkono");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <SettingsSupabaseBanner />
      <header className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-[#0a1628] via-[#132952] to-[#1e3a6e] p-6 text-white shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Mipangilio ya juu</p>
        <h2 className="mt-1 text-2xl font-bold">Tovuti — Hero, Msalaba &amp; Gallery</h2>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          Data iko kwenye jedwali <code className="rounded bg-white/10 px-1">site_settings</code> (JSON gallery). Faili ziko{" "}
          <code className="rounded bg-white/10 px-1">site-assets</code> (hero/, cross/, gallery/).
        </p>
      </header>

      {!allowed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Huna ruhusa ya kurekebisha picha hizi. Mawasiliano na Chief Admin au Super Admin.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg backdrop-blur">
          <h3 className="text-lg font-bold text-slate-900">Picha ya Hero (kilele)</h3>
          <p className="text-sm text-slate-500">Inaonekana kwenye kilele cha dashibodi.</p>
          <div className="relative mt-4 aspect-[21/9] overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-200 to-slate-100">
            {heroPreview || site.hero_image_url ? (
              <ResponsiveLazyImage
                src={(heroPreview || site.hero_image_url)!}
                alt="Hero"

                className="absolute inset-0 h-full w-full object-cover"
                width={2100}
                height={900}
                loading="eager"
                fetchpriority="high"
              />
            ) : (
              <div className="flex h-full min-h-[8rem] items-center justify-center text-sm text-slate-500">Hakuna picha — pakia hero</div>
            )}
          </div>
          <input
            ref={heroRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && allowed) void upload("hero", f);
              e.target.value = "";
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!allowed || loading || busy}
              onClick={() => heroRef.current?.click()}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-700 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
            >
              Pakia Hero
            </button>
            <button
              type="button"
              disabled={!allowed || loading || busy}
              onClick={() => void saveSite({ hero_image_url: "" })}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Ondoa URL
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg backdrop-blur">
          <h3 className="text-lg font-bold text-slate-900">Picha ya Msalaba (upande wa kulia)</h3>
          <p className="text-sm text-slate-500">Cross image juu ya dashibodi / hero.</p>
          <div className="mt-4 flex justify-end">
            <div className="relative h-40 w-40 overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-inner">
              {crossPreview || site.cross_image_url ? (
                <ResponsiveLazyImage
                  src={(crossPreview || site.cross_image_url)!}
                  alt="Cross"

                  className="absolute inset-0 h-full w-full object-contain p-2"
                  width={160}
                  height={160}
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-2 text-center text-xs text-slate-400">Msalaba — pakia picha</div>
              )}
            </div>
          </div>
          <input
            ref={crossRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && allowed) void upload("cross", f);
              e.target.value = "";
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!allowed || loading || busy}
              onClick={() => crossRef.current?.click()}
              className="rounded-lg bg-gradient-to-r from-blue-800 to-blue-950 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
            >
              Pakia Msalaba
            </button>
            <button
              type="button"
              disabled={!allowed || loading || busy}
              onClick={() => void saveSite({ cross_image_url: "" })}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Ondoa URL
            </button>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-md">
        <h3 className="text-lg font-bold text-slate-900">Bandika URL moja kwa moja (bila kupakia faili)</h3>
        <p className="text-sm text-slate-500">Inatumika pia ikiwa unatumia CDN au picha zilizohifadhiwa kwingine.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Hero URL</span>
            <input
              value={manualHero}
              onChange={(e) => setManualHero(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="https://..."
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Msalaba URL</span>
            <input
              value={manualCross}
              onChange={(e) => setManualCross(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="https://..."
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!allowed || loading || busy}
          onClick={() => void applyManualHeroCross()}
          className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Tumia URL hizi kwenye tovuti
        </button>
      </article>

      <article className="rounded-2xl border border-amber-200/80 bg-[#fffefb] p-5 shadow-lg">
        <h3 className="text-lg font-bold text-[#0f1e46]">Gallery ya dashibodi</h3>
        <p className="text-sm text-slate-600">Orodha ya URL zinazohifadhiwa kwenye `site_settings.gallery`.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void addGalleryFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={!allowed || loading || busy}
            onClick={() => galleryRef.current?.click()}
            className="rounded-xl bg-gradient-to-r from-indigo-700 to-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Pakia picha (moja au zaidi)
          </button>
          <input
            value={manualGalleryUrl}
            onChange={(e) => setManualGalleryUrl(e.target.value)}
            className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="https://... au bandika URL ya picha"
          />
          <button
            type="button"
            disabled={!allowed || loading || busy}
            onClick={() => void addGalleryUrl()}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            Ongeza URL
          </button>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {galleryUrls.length === 0 ? (
            <li className="text-sm text-slate-500">Hakuna picha za gallery bado.</li>
          ) : (
            galleryUrls.map((url) => (
              <li key={url} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ResponsiveLazyImage
                  src={url}
                  alt="Picha ya gallery"

                  className="aspect-video w-full rounded-t-xl bg-slate-100 object-cover"
                  width={1280}
                  height={720}
                  loading="lazy"
                />
                <div className="flex items-center justify-between gap-2 p-2">
                  <a href={url} target="_blank" rel="noreferrer" className="truncate text-xs text-blue-700 underline">
                    fungua
                  </a>
                  <button
                    type="button"
                    disabled={!allowed || busy}
                    onClick={() => void removeGalleryUrl(url)}
                    className="text-xs font-semibold text-rose-600 disabled:opacity-50"
                  >
                    Ondoa
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </article>
    </section>
  );
}
