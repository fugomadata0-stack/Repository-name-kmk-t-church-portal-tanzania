import { useCallback, useEffect, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import {
  ensureDeveloperProfileSeed,
  fetchDeveloperProfile,
  replaceDeveloperPhoto,
  updateDeveloperProfile,
} from "../../services/developerProfileService";
import type { DeveloperProfileRecord } from "../../types";

export function DeveloperProfilePanel() {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule } = usePortal();
  const canSave = canPortalCreateModule("developer") || canPortalEditModule("developer");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DeveloperProfileRecord | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [poBox, setPoBox] = useState("");
  const [bio, setBio] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  const load = useCallback(async () => {
    if (!getSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let row = await fetchDeveloperProfile();
      if (!row) row = await ensureDeveloperProfileSeed();
      setProfile(row);
      setFullName(row.full_name);
      setEmail(row.email);
      setPhone(row.phone);
      setAddress(row.address);
      setPoBox(row.po_box);
      setBio(row.bio);
    } catch (err) {
      reportError(err, "Developer — kusoma wasifu");
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayPhoto = profile?.photo_url || null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getSupabase() || !profile || !canSave) return;
    setSaving(true);
    try {
      const updated = await updateDeveloperProfile(profile.id, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        po_box: poBox.trim(),
        bio: bio.trim(),
      });
      setProfile(updated);
      pushToast("Wasifu umehifadhiwa.", "success");
    } catch (err) {
      reportError(err, "Developer — kuhifadhi wasifu");
    } finally {
      setSaving(false);
    }
  };

  if (!getSupabase()) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 text-sm text-slate-700">
        Sanidi <code className="rounded bg-white px-1">VITE_SUPABASE_URL</code> na{" "}
        <code className="rounded bg-white px-1">VITE_SUPABASE_ANON_KEY</code> ili kuona wasifu wa developer.
      </section>
    );
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" aria-hidden />
        <p className="text-sm font-medium">Inapakia wasifu…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 text-white">
          <h2 className="text-lg font-bold">Wasifu wa Developer</h2>
          <p className="text-xs text-slate-300">Rekodi moja — taarifa za wasifu wa kiufundi</p>
        </div>
        <div className="grid gap-6 p-4 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-44 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt={`Picha ya ${fullName.trim() || "developer"}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Hakuna picha</div>
              )}
              {photoBusy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" aria-hidden />
                </div>
              ) : null}
            </div>
            {canSave ? (
              <label
                className={`w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-900 hover:bg-blue-100 ${photoBusy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
              >
                Chagua picha — huhifadhiwa mara moja kwenye Storage
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={photoBusy}
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    const input = ev.target;
                    if (!f || !profile || !canSave) return;
                    setPhotoBusy(true);
                    void replaceDeveloperPhoto(f, profile.id, profile.photo_url)
                      .then((row) => {
                        setProfile(row);
                        pushToast("Picha imehifadhiwa kwenye developer-photos.", "success");
                      })
                      .catch((err) => reportError(err, "Developer — picha"))
                      .finally(() => {
                        setPhotoBusy(false);
                        input.value = "";
                      });
                  }}
                />
              </label>
            ) : null}
            <p className="max-w-[220px] text-center text-[10px] text-slate-500">
              Bucket: <code className="rounded bg-slate-100 px-1">developer-photos</code> — URL iko kwenye rekodi ya{" "}
              <code className="rounded bg-slate-100 px-1">developer_profile.photo_url</code>.
            </p>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Jina kamili
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!canSave}
                required
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Barua pepe
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!canSave}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Simu
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!canSave}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Anwani
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!canSave}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              S.L.P / P.O. Box
              <input
                value={poBox}
                onChange={(e) => setPoBox(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!canSave}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Wasifu (bio)
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!canSave}
              />
            </label>
          </div>
        </div>
        {canSave ? (
          <div className="flex justify-end border-t border-slate-100 px-4 py-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Inahifadhi…" : "Hifadhi wasifu"}
            </button>
          </div>
        ) : (
          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Unaweza kutazama tu — uhariri ni kwa super_admin.</p>
        )}
      </article>
    </form>
  );
}
