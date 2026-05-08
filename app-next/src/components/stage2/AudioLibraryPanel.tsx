import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Mic2, Plus, Trash2, Pencil, Search } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { mbToBytes, UPLOAD_LIMITS_MB, validateSelectedFile } from "../../lib/fileUploadGuard";
import { stage2GradHeader } from "../../lib/stage2Theme";
import {
  deleteAudio,
  fetchAudios,
  removeAudioFileFromStorage,
  upsertAudio,
  uploadAudioFile,
} from "../../services/stage2/audiosService";
import type { ChurchAudioRecord } from "../../types";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { ConfirmModal } from "../common/ConfirmModal";
import { GlassPanel, MotionCard } from "./Stage2Motion";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";
import { checkRequiredMediaBuckets } from "../../services/mediaHealthService";
const AUDIO_MAX_BYTES = mbToBytes(UPLOAD_LIMITS_MB.audio);

export function AudioLibraryPanel(props: { highlightRecordId?: string | null }) {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canAdd = canPortalCreateModule("audio_library");
  const canEdit = canPortalEditModule("audio_library");
  const canDel = canPortalDeleteModule("audio_library");

  const [rows, setRows] = useState<ChurchAudioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ChurchAudioRecord | null>(null);
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
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
      setRows(await fetchAudios());
    } catch (e) {
      reportError(e, "Audio — orodha");
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
    return `${r.title} ${r.audio_url}`.toLowerCase().includes(q);
  });

  const save = async () => {
    if (!getSupabase()) return;
    const t = title.trim();
    if (!t) {
      pushToast("Kichwa kinahitajika.", "error");
      return;
    }
    if (!editing && !audioFile) {
      pushToast("Chagua faili la sauti.", "error");
      return;
    }
    setSaving(true);
    let orphanAudioUrl: string | null = null;
    try {
      let audioUrl = editing?.audio_url ?? "";
      const prevAudioUrl = editing?.audio_url ?? "";
      if (audioFile) {
        audioUrl = await uploadAudioFile(audioFile);
        orphanAudioUrl = audioUrl;
      }
      const saved = await upsertAudio(editing ? { id: editing.id, title: t, audio_url: audioUrl } : { title: t, audio_url: audioUrl });
      orphanAudioUrl = null;
      if (audioFile && editing?.id && prevAudioUrl && prevAudioUrl !== audioUrl) {
        await removeAudioFileFromStorage(prevAudioUrl).catch(() => {});
      }
      setRows((p) => [saved, ...p.filter((x) => x.id !== saved.id)]);
      pushToast("Sauti imehifadhiwa.", "success");
      window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
      setModal(false);
      setAudioFile(null);
    } catch (e) {
      if (orphanAudioUrl) await removeAudioFileFromStorage(orphanAudioUrl).catch(() => {});
      pushToast("Imeshindikana kupakia faili.", "error");
      reportError(e, "Audio — hifadhi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!delId) return;
    try {
      const row = rows.find((r) => r.id === delId);
      if (row?.audio_url) await removeAudioFileFromStorage(row.audio_url).catch(() => {});
      await deleteAudio(delId);
      setRows((p) => p.filter((x) => x.id !== delId));
      pushToast("Imefutwa.", "success");
      window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
      setDelId(null);
    } catch (e) {
      reportError(e, "Audio — futa");
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
            <Mic2 className="h-8 w-8 opacity-90" />
            <div>
              <h2 className="text-xl font-bold">Maktaba ya Sauti</h2>
              <p className="text-sm text-white/85">Cheza mstari wa sauti, pakua faili.</p>
            </div>
          </div>
          {canAdd ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setTitle("");
                setAudioFile(null);
                setModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm hover:bg-white/25"
            >
              <Plus className="h-4 w-4" />
              Ongeza sauti
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
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportRowsToExcel("KMKT-Audio", ["Title", "Audio URL", "Date"], filteredRows.map((r) => [r.title, r.audio_url, r.created_at]))}>
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportTableToPdf("KMK(T) Audio Report", "KMKT-Audio", ["Title", "Audio URL", "Date"], filteredRows.map((r) => [r.title, r.audio_url, r.created_at]))}>PDF</button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => openPrintableTable("KMK(T) Audio Report", ["Title", "Audio URL", "Date"], filteredRows.map((r) => [r.title, r.audio_url, r.created_at]))}>Print</button>
      </div>

      {loading ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border bg-white/80 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B3C5D] border-t-transparent" />
          <p className="text-sm text-slate-600">Inapakia sauti…</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filteredRows.map((a) => (
            <MotionCard key={a.id} className={props.highlightRecordId === a.id ? "ring-2 ring-[#D4AF37]" : ""}>
              <GlassPanel className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B3C5D] to-[#134b72] text-[#D4AF37] shadow-inner">
                      <Mic2 className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0B3C5D]">{a.title}</h3>
                      <audio controls className="mt-3 h-10 w-full max-w-md" src={a.audio_url}>
                        <track kind="captions" />
                      </audio>
                    </div>
                  </div>
                  <a
                    href={a.audio_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-[#D4AF37]/60 bg-[#D4AF37]/10 px-3 py-2 text-xs font-semibold text-[#0B3C5D] hover:bg-[#D4AF37]/20"
                  >
                    <Download className="h-4 w-4" />
                    Pakua
                  </a>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {canEdit ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold text-[#0B3C5D]"
                      onClick={() => {
                        setEditing(a);
                        setTitle(String(a.title ?? ""));
                        setAudioFile(null);
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
                      onClick={() => setDelId(a.id)}
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

      {modal ? (
        <ModalScrollLayer onBackdropClick={() => setModal(false)} maxWidthClass="max-w-md">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-2xl border border-amber-200 bg-[#FDFBF7] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0B3C5D]">{editing ? "Hariri sauti" : "Sauti mpya"}</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                Kichwa *
                <input className="rounded-xl border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Faili la sauti *
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setAudioFile(null);
                      return;
                    }
                    const err = validateSelectedFile(f, {
                      allowedExtensions: [".mp3", ".wav", ".m4a", ".ogg"],
                      maxBytes: AUDIO_MAX_BYTES,
                      allowedMimePrefixes: ["audio/"],
                      labelSw: "faili la sauti",
                    });
                    if (err) {
                      pushToast(err, "error");
                      setAudioFile(null);
                      e.currentTarget.value = "";
                      return;
                    }
                    setAudioFile(f);
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
          </motion.div>
        </ModalScrollLayer>
      ) : null}

      <ConfirmModal open={!!delId} title="Futa sauti?" message="Faili litafutwa kwenye hifadhi." onCancel={() => setDelId(null)} onConfirm={() => void onDelete()} />
    </div>
  );
}
