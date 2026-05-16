import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  File,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Search,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { safeIncludes, safeLower } from "../../lib/safe";
import { getSupabase } from "../../lib/supabaseClient";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { STAGE2_COLORS, stage2GradHeader } from "../../lib/stage2Theme";
import { mbToBytes, validateSelectedFile } from "../../lib/fileUploadGuard";
import {
  deleteFileManagerItem,
  fetchFileManagerItems,
  slugCategory,
  uploadChurchFile,
  upsertFileManagerItem,
} from "../../services/stage3/fileManagerService";
import type { ChurchFileStorageBucket, FileManagerItemRecord } from "../../types";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ConfirmModal } from "../common/ConfirmModal";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { GlassPanel, MotionCard } from "../stage2/Stage2Motion";

const BUCKETS: { id: ChurchFileStorageBucket; label: string; hint: string }[] = [
  { id: "church-files", label: "Nyaraka", hint: "PDF, Word, Excel…" },
  { id: "church-images", label: "Picha", hint: "JPG, PNG, WebP…" },
  { id: "church-media", label: "Media", hint: "Video / Sauti" },
  { id: "portal-uploads", label: "Portal uploads", hint: "Faili za jumla (kikomo cha juu)" },
  { id: "certificates", label: "Hati / vyeti", hint: "PDF, picha, DOC/DOCX" },
];
const FILE_MAX_BY_BUCKET: Record<ChurchFileStorageBucket, number> = {
  "church-files": mbToBytes(200),
  "church-images": mbToBytes(50),
  "church-media": mbToBytes(800),
  "portal-uploads": mbToBytes(250),
  "certificates": mbToBytes(150),
};

function fileIcon(mime: string) {
  const m = safeLower(mime);
  if (m.startsWith("image/")) return ImageIcon;
  if (m.startsWith("video/")) return Video;
  if (m.startsWith("audio/")) return File;
  if (m.includes("pdf") || m.includes("word") || m.includes("document") || m.includes("text")) return FileText;
  return File;
}

export function FileManagerPanel() {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canAdd = canPortalCreateModule("file_manager") || canPortalEditModule("file_manager");
  const canEdit = canPortalEditModule("file_manager");
  const canDelete = canPortalDeleteModule("file_manager");

  const [rows, setRows] = useState<FileManagerItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState<ChurchFileStorageBucket>("church-files");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState("Jumla");
  const [editRow, setEditRow] = useState<FileManagerItemRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [del, setDel] = useState<FileManagerItemRecord | null>(null);
  const [delBusy, setDelBusy] = useState(false);
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
      setRows(await fetchFileManagerItems());
    } catch (e) {
      reportError(e, "File Manager — orodha");
      setRows([]);
      setLoadError(SUPABASE_QUERY_ERROR_SW);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.category?.trim()) s.add(r.category.trim());
    });
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = safeLower(search).trim();
    return rows.filter((r) => {
      if (r.bucket_name !== bucket) return false;
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
      if (!q) return true;
      return safeIncludes(`${r.title ?? ""} ${r.description ?? ""} ${r.category ?? ""}`, q);
    });
  }, [rows, bucket, categoryFilter, search]);

  const onPickFile = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !getSupabase()) return;
    if (!canAdd) {
      pushToast("Huna ruhusa ya kupakia faili (file manager).", "error");
      return;
    }
    const allowedByBucket: Record<ChurchFileStorageBucket, string[]> = {
      "church-files": [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt", ".zip", ".rar"],
      "church-images": [".jpg", ".jpeg", ".jfif", ".png", ".webp", ".gif", ".heic", ".heif", ".avif", ".svg"],
      "church-media": [".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac", ".mp4", ".webm", ".mov", ".mkv"],
      "portal-uploads": [
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".csv",
        ".txt",
        ".zip",
        ".rar",
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".mp4",
        ".webm",
        ".mp3",
        ".wav",
      ],
      "certificates": [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".doc", ".docx"],
    };
    const err = validateSelectedFile(file, {
      allowedExtensions: allowedByBucket[bucket],
      maxBytes: FILE_MAX_BY_BUCKET[bucket],
      labelSw: "faili",
    });
    if (err) {
      pushToast(err, "error");
      return;
    }
    setUploading(true);
    setUploadPct(0);
    try {
      const { filePath, publicUrl, mime } = await uploadChurchFile(bucket, file, newCategory, setUploadPct);
      const title = file.name.replace(/\.[^/.]+$/, "") || file.name;
      const saved = await upsertFileManagerItem({
        title,
        bucket_name: bucket,
        file_url: publicUrl,
        file_path: filePath,
        file_type: mime,
        category: slugCategory(newCategory) === "jumla" ? "Jumla" : newCategory.trim(),
        description: "",
      });
      setRows((prev) => [saved, ...prev]);
      pushToast("Faili imepakiwa.", "success");
    } catch (e) {
      reportError(e, "File Manager — pakia");
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  };

  const saveMeta = async () => {
    if (!editRow || !canEdit) return;
    try {
      const saved = await upsertFileManagerItem({
        id: editRow.id,
        title: editTitle.trim() || editRow.title,
        bucket_name: editRow.bucket_name,
        file_url: editRow.file_url,
        file_path: editRow.file_path,
        file_type: editRow.file_type,
        category: editCategory.trim() || "Jumla",
        description: editDescription,
      });
      setRows((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      pushToast("Metadata imesasishwa.", "success");
      setEditRow(null);
    } catch (e) {
      reportError(e, "File Manager — hifadhi");
    }
  };

  const onDelete = async () => {
    if (!del) return;
    setDelBusy(true);
    try {
      await deleteFileManagerItem(del);
      setRows((prev) => prev.filter((x) => x.id !== del.id));
      pushToast("Faili imefutwa.", "success");
      setDel(null);
    } catch (e) {
      reportError(e, "File Manager — futa");
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className={`rounded-2xl p-6 text-white shadow-xl ${stage2GradHeader}`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/90">Stage 3</p>
        <h2 className="mt-1 text-2xl font-bold">File Manager</h2>
        <p className="mt-2 max-w-3xl text-sm text-blue-50/95">
          Faili halisi kwenye Supabase Storage — pakua, tazama, futa, na panga kwa kategoria.
        </p>
      </header>

      <SupabaseListFeedback loading={loading} loadError={loadError} isEmpty={rows.length === 0} />

      <GlassPanel className="p-4">
        <div className="flex flex-wrap gap-2">
          {BUCKETS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBucket(b.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                bucket === b.id ? "bg-[#0B3C5D] text-white shadow" : "bg-white/90 text-slate-700 hover:bg-white"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{BUCKETS.find((b) => b.id === bucket)?.hint}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-12 md:items-end">
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-3">
            Kategoria (folda)
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="mfano: Mahubiri"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-4">
            Tafuta
            <span className="relative flex">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
                placeholder="Jina, maelezo…"
              />
            </span>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-3">
            Chuja kategoria
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "Zote" : c}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2 flex md:justify-end">
            <label className="inline-flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#D4AF37]/60 bg-[#FDFBF7] px-4 py-2 text-center text-sm font-semibold text-[#0B3C5D] hover:bg-amber-50 disabled:opacity-50">
              <Upload className="mx-auto h-5 w-5" />
              Pakia faili
              <input
                type="file"
                className="hidden"
                disabled={!canAdd || uploading}
                onChange={(e) => void onPickFile(e.target.files)}
              />
            </label>
          </div>
        </div>

        {uploadPct != null && (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full bg-gradient-to-r from-[#0B3C5D] to-[#D4AF37]"
                initial={{ width: 0 }}
                animate={{ width: `${uploadPct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {uploading ? `Inapakia… ${uploadPct}%` : "Imekamilika."}
            </p>
          </div>
        )}
      </GlassPanel>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Inapakia faili…
        </div>
      ) : filtered.length === 0 ? (
        <GlassPanel className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-10 text-center text-slate-600">
          <FolderOpen className="h-14 w-14 text-[#0B3C5D]/40" />
          <p className="text-lg font-semibold text-[#0B3C5D]">Hakuna faili bado</p>
          <p className="max-w-md text-sm">Chagua bucket, weka kategoria, kisha pakia faili ya kwanza.</p>
        </GlassPanel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filtered.map((r) => {
              const Icon = fileIcon(r.file_type);
              return (
                <MotionCard key={r.id} className="h-full">
                  <div className="flex h-full flex-col rounded-2xl border border-white/40 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow"
                          style={{ background: `linear-gradient(135deg, ${STAGE2_COLORS.navy}, #134b72)` }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="line-clamp-2 font-semibold text-slate-900">{r.title || "Bila jina"}</p>
                          <p className="text-xs text-slate-500">{r.category || "Jumla"}</p>
                        </div>
                      </div>
                    </div>
                    {r.description ? <p className="mt-2 line-clamp-2 text-xs text-slate-600">{r.description}</p> : null}
                    <p className="mt-2 text-[10px] text-slate-400">
                      {new Date(r.created_at).toLocaleString("sw-TZ", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-3">
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Pakua / fungua
                      </a>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditRow(r);
                            setEditTitle(r.title);
                            setEditDescription(r.description);
                            setEditCategory(r.category);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Metadata
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => setDel(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Futa
                        </button>
                      ) : null}
                    </div>
                  </div>
                </MotionCard>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {editRow ? (
        <ModalScrollLayer onBackdropClick={() => setEditRow(null)} maxWidthClass="max-w-md">
          <GlassPanel className="w-full p-5">
            <h3 className="text-lg font-bold text-slate-900">Hariri metadata</h3>
            <p className="text-xs text-slate-500">Jina la onyesho, kategoria, maelezo (haijihamishi faili ya hifadhi).</p>
            <div className="mt-3 grid gap-2">
              <label className="text-xs font-medium text-slate-700">
                Jina
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Kategoria
                <input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Maelezo
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditRow(null)} className="rounded-xl border px-4 py-2 text-sm">
                Ghairi
              </button>
              <button
                type="button"
                onClick={() => void saveMeta()}
                className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-semibold text-white"
              >
                Hifadhi
              </button>
            </div>
          </GlassPanel>
        </ModalScrollLayer>
      ) : null}

      <ConfirmModal
        open={!!del}
        title="Futa faili?"
        message="Faili itafutwa kutoka hifadhi na orodha."
        confirmLabel="Futa"
        confirmLoading={delBusy}
        onCancel={() => setDel(null)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
