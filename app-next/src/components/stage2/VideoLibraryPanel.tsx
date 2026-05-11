import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Plus, Trash2, Pencil, Video as VideoIcon, Search, Download } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { mbToBytes, UPLOAD_LIMITS_MB, validateSelectedFile } from "../../lib/fileUploadGuard";
import { stage2GradHeader } from "../../lib/stage2Theme";
import {
  deleteVideo,
  fetchVideos,
  removeVideoThumbnailIfStored,
  upsertVideo,
  uploadVideoThumbnail,
  toEmbedUrl,
} from "../../services/stage2/videosService";
import type { ChurchVideoRecord } from "../../types";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { ConfirmModal } from "../common/ConfirmModal";
import { GlassPanel, MotionCard } from "./Stage2Motion";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";
import { checkRequiredMediaBuckets } from "../../services/mediaHealthService";
const IMAGE_MAX_BYTES = mbToBytes(UPLOAD_LIMITS_MB.images);

export function VideoLibraryPanel(props: { highlightRecordId?: string | null }) {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canAdd = canPortalCreateModule("video_library");
  const canEdit = canPortalEditModule("video_library");
  const canDel = canPortalDeleteModule("video_library");

  const [rows, setRows] = useState<ChurchVideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [player, setPlayer] = useState<ChurchVideoRecord | null>(null);
  const [editing, setEditing] = useState<ChurchVideoRecord | null>(null);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
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
      setRows(await fetchVideos());
    } catch (e) {
      reportError(e, "Video — orodha");
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
  const filteredRows = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${r.title} ${r.video_url}`.toLowerCase().includes(q);
  });

  const save = async () => {
    if (!getSupabase()) return;
    const t = title.trim();
    const u = videoUrl.trim();
    if (!t || !u) {
      pushToast("Kichwa na kiungo vinahitajika.", "error");
      return;
    }
    setSaving(true);
    let orphanThumbUrl: string | null = null;
    try {
      let thumb = editing?.thumbnail_url ?? null;
      const prevThumb = editing?.thumbnail_url ?? null;
      if (thumbFile && editing?.id) {
        thumb = await uploadVideoThumbnail(thumbFile, editing.id);
        orphanThumbUrl = thumb;
      }
      const saved = await upsertVideo(
        editing
          ? { id: editing.id, title: t, video_url: u, thumbnail_url: thumb ?? editing.thumbnail_url }
          : { title: t, video_url: u, thumbnail_url: null }
      );
      orphanThumbUrl = null;
      if (thumbFile && editing?.id && prevThumb && prevThumb !== thumb) {
        await removeVideoThumbnailIfStored(prevThumb).catch(() => {});
      }
      if (thumbFile && !editing?.id) {
        const url = await uploadVideoThumbnail(thumbFile, saved.id);
        orphanThumbUrl = url;
        const next = await upsertVideo({ id: saved.id, title: saved.title, video_url: saved.video_url, thumbnail_url: url });
        orphanThumbUrl = null;
        setRows((p) => [next, ...p.filter((x) => x.id !== next.id)]);
      } else {
        setRows((p) => [saved, ...p.filter((x) => x.id !== saved.id)]);
      }
      pushToast("Video imehifadhiwa.", "success");
      dispatchPortalReloadMetrics();
      setModal(false);
      setThumbFile(null);
    } catch (e) {
      if (orphanThumbUrl) await removeVideoThumbnailIfStored(orphanThumbUrl).catch(() => {});
      pushToast("Imeshindikana kupakia faili.", "error");
      reportError(e, "Video — hifadhi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!delId) return;
    try {
      const row = rows.find((r) => r.id === delId);
      if (row?.thumbnail_url) await removeVideoThumbnailIfStored(row.thumbnail_url).catch(() => {});
      await deleteVideo(delId);
      setRows((p) => p.filter((x) => x.id !== delId));
      pushToast("Imefutwa.", "success");
      dispatchPortalReloadMetrics();
      setDelId(null);
      setPlayer(null);
    } catch (e) {
      reportError(e, "Video — futa");
    }
  };

  if (!getSupabase()) {
    return <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 text-sm">Sanidi Supabase.</section>;
  }

  return (
    <div className="space-y-6">
      <header className={`rounded-2xl ${stage2GradHeader} px-6 py-5 text-white shadow-lg`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <VideoIcon className="h-8 w-8 opacity-90" />
            <div>
              <h2 className="text-xl font-bold">Maktaba ya Video</h2>
              <p className="text-sm text-white/85">YouTube / Vimeo — kicheko cha vidundo na thumbnail.</p>
            </div>
          </div>
          {canAdd ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setTitle("");
                setVideoUrl("");
                setThumbFile(null);
                setModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm hover:bg-white/25"
            >
              <Plus className="h-4 w-4" />
              Ongeza video
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
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-lg border px-7 py-2 text-sm" placeholder="Tafuta..." />
        </label>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => setQuery("")}>Safisha vichujio</button>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportRowsToExcel("KMKT-Videos", ["Title", "Video URL", "Date"], filteredRows.map((r) => [r.title, r.video_url, r.created_at]))}>
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportTableToPdf("KMK(T) Video Report", "KMKT-Videos", ["Title", "Video URL", "Date"], filteredRows.map((r) => [r.title, r.video_url, r.created_at]))}>PDF</button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => openPrintableTable("KMK(T) Video Report", ["Title", "Video URL", "Date"], filteredRows.map((r) => [r.title, r.video_url, r.created_at]))}>Print</button>
      </div>

      {loading ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border bg-white/80 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B3C5D] border-t-transparent" />
          <p className="text-sm text-slate-600">Inapakia video…</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((v) => (
            <MotionCard key={v.id} className={props.highlightRecordId === v.id ? "ring-2 ring-[#D4AF37]" : ""}>
              <GlassPanel className="overflow-hidden p-0">
                <button type="button" className="relative block w-full" onClick={() => setPlayer(v)}>
                  <div className="aspect-video bg-slate-900">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover opacity-95" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0B3C5D] to-black text-white/80">
                        <Play className="h-16 w-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-90 transition-opacity hover:bg-black/45">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D4AF37] text-[#0B3C5D] shadow-lg">
                        <Play className="h-7 w-7 fill-current" />
                      </span>
                    </div>
                  </div>
                  <div className="p-4 text-left">
                    <p className="line-clamp-2 font-semibold text-[#0B3C5D]">{v.title}</p>
                  </div>
                </button>
                <div className="flex flex-wrap gap-2 border-t px-4 py-3">
                  {canEdit ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold text-[#0B3C5D]"
                      onClick={() => {
                        setEditing(v);
                        setTitle(String(v.title ?? ""));
                        setVideoUrl(String(v.video_url ?? ""));
                        setThumbFile(null);
                        setModal(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      Hariri
                    </button>
                  ) : null}
                  {canDel ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                      onClick={() => setDelId(v.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Futa
                    </button>
                  ) : null}
                </div>
              </GlassPanel>
            </MotionCard>
          ))}
        </div>
      )}

      {player ? (
        <ModalScrollLayer
          onBackdropClick={() => setPlayer(null)}
          maxWidthClass="max-w-4xl"
          overlayClassName="fixed inset-0 z-[70] overflow-y-auto overflow-x-hidden bg-black/70 px-4 py-10 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl"
          >
            <div className="aspect-video w-full bg-black">
              <iframe title={player.title} src={toEmbedUrl(player.video_url)} className="h-full w-full" allowFullScreen />
            </div>
            <div className="bg-[#0B3C5D] px-4 py-3 text-center text-sm font-semibold text-white">{player.title}</div>
          </motion.div>
        </ModalScrollLayer>
      ) : null}

      {modal ? (
        <ModalScrollLayer onBackdropClick={() => setModal(false)} maxWidthClass="max-w-md">
          <div className="w-full rounded-2xl border border-amber-200 bg-[#FDFBF7] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0B3C5D]">{editing ? "Hariri video" : "Video mpya"}</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                Kichwa *
                <input className="rounded-xl border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Kiungo cha YouTube/Vimeo *
                <input className="rounded-xl border px-3 py-2" placeholder="https://..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Thumbnail (si lazima)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setThumbFile(null);
                      return;
                    }
                    const err = validateSelectedFile(f, {
                      allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
                      maxBytes: IMAGE_MAX_BYTES,
                      allowedMimePrefixes: ["image/"],
                      labelSw: "thumbnail",
                    });
                    if (err) {
                      pushToast(err, "error");
                      setThumbFile(null);
                      e.currentTarget.value = "";
                      return;
                    }
                    setThumbFile(f);
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

      <ConfirmModal open={!!delId} title="Futa video?" message="Rekodi itafutwa." onCancel={() => setDelId(null)} onConfirm={() => void onDelete()} />
    </div>
  );
}
