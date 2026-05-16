import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3x3, ImagePlus, Pencil, Plus, Trash2, X, Search, Download } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { mbToBytes, UPLOAD_LIMITS_MB, validateSelectedFile } from "../../lib/fileUploadGuard";
import { STAGE2_COLORS, stage2GradHeader } from "../../lib/stage2Theme";
import {
  deleteGalleryImage,
  fetchGalleryImages,
  removeGalleryFileFromStorage,
  uploadGalleryImage,
  upsertGalleryImage,
} from "../../services/stage2/galleryService";
import type { GalleryImageRecord } from "../../types";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { ConfirmModal } from "../common/ConfirmModal";
import { GlassPanel, MotionCard } from "./Stage2Motion";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";
import { checkRequiredMediaBuckets } from "../../services/mediaHealthService";
const IMAGE_MAX_BYTES = mbToBytes(UPLOAD_LIMITS_MB.images);

export function GalleryPanel(props: { highlightRecordId?: string | null }) {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canAdd = canPortalCreateModule("gallery");
  const canEdit = canPortalEditModule("gallery");
  const canDel = canPortalDeleteModule("gallery");

  const [rows, setRows] = useState<GalleryImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [preview, setPreview] = useState<GalleryImageRecord | null>(null);
  const [editing, setEditing] = useState<GalleryImageRecord | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [catFilter, setCatFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [missingBuckets, setMissingBuckets] = useState<string[]>([]);
  const [delId, setDelId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getSupabase()) {
      setRows([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await fetchGalleryImages());
    } catch (e) {
      reportError(e, "Gallery — orodha");
      setRows([]);
      setLoadError(SUPABASE_QUERY_ERROR_SW);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void (async () => {
      const health = await checkRequiredMediaBuckets();
      setMissingBuckets(health.missing);
    })();
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.category?.trim()) s.add(r.category.trim());
    });
    return ["ALL", ...Array.from(s).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (catFilter !== "ALL" && (r.category ?? "") !== catFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${r.title} ${r.category}`.toLowerCase().includes(q);
    });
  }, [rows, catFilter, query]);

  const save = async () => {
    if (!getSupabase()) return;
    const t = title.trim();
    if (!t) {
      pushToast("Kichwa kinahitajika.", "error");
      return;
    }
    if (!editing && !file) {
      pushToast("Chagua picha.", "error");
      return;
    }
    setSaving(true);
    let orphanGalleryUrl: string | null = null;
    try {
      let imageUrl = editing?.image_url ?? "";
      const prevUrl = editing?.image_url ?? "";
      if (file) {
        const up = await uploadGalleryImage(file);
        imageUrl = up.publicUrl;
        orphanGalleryUrl = imageUrl;
      }
      const saved = await upsertGalleryImage(
        editing ? { id: editing.id, title: t, category, image_url: imageUrl } : { title: t, category, image_url: imageUrl }
      );
      orphanGalleryUrl = null;
      if (file && editing?.id && prevUrl && prevUrl !== imageUrl) {
        await removeGalleryFileFromStorage(prevUrl).catch(() => {});
      }
      setRows((p) => [saved, ...p.filter((x) => x.id !== saved.id)]);
      pushToast("Picha imehifadhiwa.", "success");
      dispatchPortalReloadMetrics();
      setModal(false);
      setFile(null);
    } catch (e) {
      if (orphanGalleryUrl) await removeGalleryFileFromStorage(orphanGalleryUrl).catch(() => {});
      pushToast("Imeshindikana kupakia faili.", "error");
      reportError(e, "Gallery — hifadhi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!delId || !getSupabase()) return;
    try {
      const row = rows.find((r) => r.id === delId);
      if (row?.image_url) await removeGalleryFileFromStorage(row.image_url).catch(() => {});
      await deleteGalleryImage(delId);
      setRows((p) => p.filter((x) => x.id !== delId));
      pushToast("Imefutwa.", "success");
      dispatchPortalReloadMetrics();
      setDelId(null);
      setPreview(null);
    } catch (e) {
      reportError(e, "Gallery — futa");
    }
  };

  if (!getSupabase()) {
    return <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 text-sm">Sanidi Supabase.</section>;
  }

  return (
    <div className="space-y-6">
      <header className={`rounded-2xl ${stage2GradHeader} px-6 py-5 text-white shadow-lg`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Gallery</h2>
            <p className="text-sm text-white/85">Picha za matukio, ibada, vijana — grid ya kisasa.</p>
          </div>
          {canAdd ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setTitle("");
                setCategory("");
                setFile(null);
                setModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm hover:bg-white/25"
            >
              <Plus className="h-4 w-4" />
              Ongeza picha
            </button>
          ) : null}
        </div>
      </header>

      <SupabaseListFeedback loading={loading} loadError={loadError} isEmpty={rows.length === 0} />
      {missingBuckets.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          Buckets hazipo: {missingBuckets.join(", ")}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 p-3 backdrop-blur-sm">
        <Grid3x3 className="h-4 w-4" style={{ color: STAGE2_COLORS.navy }} />
        <span className="text-sm font-semibold text-slate-700">Kategoria:</span>
        <select
          className="rounded-lg border px-3 py-1.5 text-sm"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="relative ml-2 min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-lg border px-7 py-2 text-sm" placeholder="Tafuta..." />
        </label>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => { setCatFilter("ALL"); setQuery(""); }}>
          Safisha vichujio
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportRowsToExcel("KMKT-Gallery", ["Title", "Category", "Date"], filtered.map((r) => [r.title, r.category, r.created_at]))}>
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportTableToPdf("KMK(T) Gallery Report", "KMKT-Gallery", ["Title", "Category", "Date"], filtered.map((r) => [r.title, r.category, r.created_at]))}>
          PDF
        </button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => openPrintableTable("KMK(T) Gallery Report", ["Title", "Category", "Date"], filtered.map((r) => [r.title, r.category, r.created_at]))}>
          Print
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border bg-white/80 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B3C5D] border-t-transparent" />
          <p className="text-sm text-slate-600">Inapakia picha…</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r) => (
            <MotionCard key={r.id} className={props.highlightRecordId === r.id ? "ring-2 ring-[#D4AF37]" : ""}>
              <button type="button" onClick={() => setPreview(r)} className="block w-full text-left">
                <GlassPanel className="overflow-hidden p-0">
                  <div className="relative aspect-square bg-slate-100">
                    <ResponsiveLazyImage
                      src={r.image_url}
                      alt={r.title ? `Picha: ${r.title}` : "Picha ya gallery"}

                      className="absolute inset-0 h-full w-full object-cover"
                      width={1200}
                      height={1200}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent opacity-90" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="line-clamp-2 text-sm font-bold">{r.title}</p>
                      {r.category ? (
                        <span className="mt-1 inline-block rounded-full bg-[#D4AF37]/90 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#0B3C5D]">
                          {r.category}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </GlassPanel>
              </button>
              <div className="mt-2 flex flex-wrap gap-2 px-1">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(r);
                      setTitle(String(r.title ?? ""));
                      setCategory(String(r.category ?? ""));
                      setFile(null);
                      setModal(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold text-[#0B3C5D]"
                  >
                    <Pencil className="h-3 w-3" />
                    Hariri
                  </button>
                ) : null}
                {canDel ? (
                  <button
                    type="button"
                    onClick={() => setDelId(r.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    Futa
                  </button>
                ) : null}
              </div>
            </MotionCard>
          ))}
        </div>
      )}

      <AnimatePresence>
        {preview ? (
          <ModalScrollLayer
            key={preview.id}
            onBackdropClick={() => setPreview(null)}
            maxWidthClass="max-w-4xl"
            overlayClassName="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-black/75 px-4 py-10 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
              className="relative w-full overflow-auto rounded-2xl border border-white/20 bg-[#FDFBF7] p-2 shadow-2xl"
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                onClick={() => setPreview(null)}
              >
                <X className="h-5 w-5" />
              </button>
              <ResponsiveLazyImage
                src={preview.image_url}
                alt={preview.title ? `Picha: ${preview.title}` : "Picha"}

                className="min-h-[48vh] w-full rounded-xl bg-slate-100 object-contain"

                width={1600}
                height={1200}

                loading="lazy"
              />
              <p className="p-4 text-center font-semibold text-[#0B3C5D]">{preview.title}</p>
            </motion.div>
          </ModalScrollLayer>
        ) : null}
      </AnimatePresence>

      {modal ? (
        <ModalScrollLayer onBackdropClick={() => setModal(false)} maxWidthClass="max-w-md">
          <div className="w-full rounded-2xl border border-amber-200 bg-[#FDFBF7] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0B3C5D]">{editing ? "Hariri picha" : "Picha mpya"}</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                Kichwa *
                <input className="rounded-xl border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Kategoria
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="matukio, ibada, vijana…"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" /> Faili
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setFile(null);
                      return;
                    }
                    const err = validateSelectedFile(f, {
                      allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
                      maxBytes: IMAGE_MAX_BYTES,
                      allowedMimePrefixes: ["image/"],
                      labelSw: "picha",
                    });
                    if (err) {
                      pushToast(err, "error");
                      setFile(null);
                      e.currentTarget.value = "";
                      return;
                    }
                    setFile(f);
                  }}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="rounded-xl border px-4 py-2 text-sm" onClick={() => setModal(false)} disabled={saving}>
                Ghairi
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-xl bg-[#0B3C5D] px-5 py-2 text-sm font-semibold text-white"
              >
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </div>
        </ModalScrollLayer>
      ) : null}

      <ConfirmModal open={!!delId} title="Futa picha?" message="Faili litafutwa kwenye hifadhi pia." onCancel={() => setDelId(null)} onConfirm={() => void onDelete()} />
    </div>
  );
}
