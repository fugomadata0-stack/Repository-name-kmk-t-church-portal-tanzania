import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  Loader2,
  Pencil,
  Radio,
  Share2,
  Trash2,
  Video,
  CalendarClock,
  Plus,
  Search,
  Download,
} from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { stage2GradHeader } from "../../lib/stage2Theme";
import {
  deleteLiveStream,
  fetchLiveStreams,
  normalizeEmbedUrl,
  upsertLiveStream,
} from "../../services/stage3/liveStreamsService";
import type { LiveStreamRecord } from "../../types";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ConfirmModal } from "../common/ConfirmModal";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { GlassPanel, MotionCard } from "../stage2/Stage2Motion";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow animate-pulse">
      <Radio className="h-3 w-3" />
      LIVE
    </span>
  );
}

function countdownLabel(iso: string | null): string {
  if (!iso) return "Ratiba haijawekwa";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Imefika muda wa kuanza";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `${days}d ${hours}h ${m}m`;
  if (hours > 0) return `${hours}h ${m}m`;
  return `${m}m`;
}

export function LiveStreamPanel(props: { submodule?: string }) {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canAdd = canPortalCreateModule("live_stream");
  const canEdit = canPortalEditModule("live_stream");
  const canDelete = canPortalDeleteModule("live_stream");

  const [rows, setRows] = useState<LiveStreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<LiveStreamRecord | null>(null);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("YouTube");
  const [streamUrl, setStreamUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"scheduled" | "live" | "ended">("scheduled");
  const [isLive, setIsLive] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [preacher, setPreacher] = useState("");
  const [eventLink, setEventLink] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
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
      setRows(await fetchLiveStreams());
    } catch (e) {
      reportError(e, "Live Stream — orodha");
      setRows([]);
      setLoadError(SUPABASE_QUERY_ERROR_SW);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const liveNow = useMemo(() => rows.filter((r) => r.is_live), [rows]);
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.title} ${r.platform} ${r.description}`.toLowerCase().includes(q));
  }, [rows, query]);

  const upcoming = useMemo(() => {
    const list = rows.filter((r) => !r.is_live && r.scheduled_at).sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
    return props.submodule?.includes("Ratiba") ? list : list.slice(0, 12);
  }, [rows, props.submodule]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setPlatform("YouTube");
    setStreamUrl("");
    setEmbedUrl("");
    setDescription("");
    setStatus("scheduled");
    setIsLive(false);
    setScheduledAt("");
    setEndedAt("");
    setThumbnailUrl("");
    setPreacher("");
    setEventLink("");
    setCategory("");
    setIsPublic(false);
    setModal(true);
  };

  const openEdit = (r: LiveStreamRecord) => {
    setEditing(r);
    setTitle(String(r.title ?? ""));
    setPlatform(r.platform || "YouTube");
    setStreamUrl(String(r.stream_url ?? ""));
    setEmbedUrl(String(r.embed_url ?? ""));
    setDescription(String(r.description ?? ""));
    setStatus((r.status ?? "scheduled") as "scheduled" | "live" | "ended");
    setIsLive(r.is_live);
    setScheduledAt(r.scheduled_at?.slice(0, 16) ?? "");
    setEndedAt(r.ended_at?.slice(0, 16) ?? "");
    setThumbnailUrl(String(r.thumbnail_url ?? ""));
    setPreacher(String(r.preacher ?? ""));
    setEventLink(String(r.event_link ?? ""));
    setCategory(String(r.category ?? ""));
    setIsPublic(Boolean(r.is_public));
    setModal(true);
  };

  const save = async () => {
    const t = title.trim();
    const su = streamUrl.trim();
    if (!t || !su) {
      pushToast("Jina na kiungo cha tazama vinahitajika.", "error");
      return;
    }
    const emb = normalizeEmbedUrl(platform, su, embedUrl.trim());
    setSaving(true);
    try {
      const saved = await upsertLiveStream(
        editing
          ? {
              id: editing.id,
              title: t,
              platform,
              stream_url: su,
              embed_url: emb,
              status,
              description,
              is_live: isLive,
              scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
              ended_at: endedAt ? new Date(endedAt).toISOString() : null,
              thumbnail_url: thumbnailUrl || null,
              preacher,
              event_link: eventLink,
              category,
              is_public: isPublic,
            }
          : {
              title: t,
              platform,
              stream_url: su,
              embed_url: emb,
              status,
              description,
              is_live: isLive,
              scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
              ended_at: endedAt ? new Date(endedAt).toISOString() : null,
              thumbnail_url: thumbnailUrl || null,
              preacher,
              event_link: eventLink,
              category,
              is_public: isPublic,
            }
      );
      setRows((prev) => {
        if (editing?.id) return prev.map((x) => (x.id === saved.id ? saved : x));
        return [saved, ...prev];
      });
      pushToast("Imehifadhiwa.", "success");
      dispatchPortalReloadMetrics();
      setModal(false);
    } catch (e) {
      reportError(e, "Live Stream — hifadhi");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      pushToast("Kiungo kimenakiliwa.", "success");
    } catch {
      pushToast("Imeshindikana kunakili kiungo.", "error");
    }
  };

  const onDelete = async () => {
    if (!delId) return;
    setDelBusy(true);
    try {
      await deleteLiveStream(delId);
      setRows((prev) => prev.filter((x) => x.id !== delId));
      pushToast("Imefutwa.", "success");
      dispatchPortalReloadMetrics();
      setDelId(null);
    } catch (e) {
      reportError(e, "Live Stream — futa");
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className={`rounded-2xl p-6 text-white shadow-xl ${stage2GradHeader}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/90">Stage 3</p>
            <h2 className="mt-1 text-2xl font-bold">Live Stream</h2>
            <p className="mt-2 max-w-3xl text-sm text-blue-50/95">
              Simamia maisha ya kanisa — YouTube / Facebook embed, LIVE, na ratiba ya mbele.
            </p>
          </div>
          {canAdd ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25"
            >
              <Plus className="h-4 w-4" />
              Ongeza msemo
            </button>
          ) : null}
        </div>
      </header>

      <SupabaseListFeedback loading={loading} loadError={loadError} isEmpty={rows.length === 0} />
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="grid min-w-[220px] flex-1 gap-1 text-xs font-semibold text-slate-700">
          Tafuta
          <span className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-lg border px-7 py-2 text-sm" />
          </span>
        </label>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => setQuery("")}>Safisha vichujio</button>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportRowsToExcel("KMKT-Livestreams", ["Title", "Platform", "Status", "Public", "Scheduled"], filteredRows.map((r) => [r.title, r.platform, r.status ?? "scheduled", r.is_public ? "Yes" : "No", r.scheduled_at ?? ""]))}>
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportTableToPdf("KMK(T) Livestream Report", "KMKT-Livestreams", ["Title", "Platform", "Status", "Public", "Scheduled"], filteredRows.map((r) => [r.title, r.platform, r.status ?? "scheduled", r.is_public ? "Yes" : "No", r.scheduled_at ?? ""]))}>PDF</button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => openPrintableTable("KMK(T) Livestream Report", ["Title", "Platform", "Status", "Public", "Scheduled"], filteredRows.map((r) => [r.title, r.platform, r.status ?? "scheduled", r.is_public ? "Yes" : "No", r.scheduled_at ?? ""]))}>Print</button>
      </div>

      {liveNow.length > 0 ? (
        <GlassPanel className="overflow-hidden p-0">
          <div className="bg-gradient-to-r from-red-900/90 to-[#0B3C5D] px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Video className="h-5 w-5" />
              Inayoendelea sasa
              <LiveBadge />
            </div>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {liveNow.map((r) => (
              <div key={r.id} className="overflow-hidden rounded-2xl border border-white/40 bg-black/80 shadow-lg">
                {r.embed_url.trim() ? (
                  <div className="aspect-video w-full">
                    <iframe title={r.title} src={r.embed_url} className="h-full w-full" allowFullScreen />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center text-sm text-white/70">Hakuna embed URL</div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 px-3 py-2 text-white">
                  <span className="font-semibold">{r.title}</span>
                  <button
                    type="button"
                    onClick={() => copyLink(r.stream_url)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Nakili kiungo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      ) : null}

      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Inapakia…
        </div>
      ) : rows.length === 0 ? (
        <GlassPanel className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-10 text-center">
          <Radio className="h-12 w-12 text-[#0B3C5D]/35" />
          <p className="text-lg font-semibold text-[#0B3C5D]">Hakuna msemo wa live bado</p>
          <p className="text-sm text-slate-600">Ongeza kiungo cha YouTube au Facebook na weka LIVE au ratiba.</p>
        </GlassPanel>
      ) : (
        <div className="space-y-4">
          {props.submodule?.includes("Ratiba") ? (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#0B3C5D]">
                <CalendarClock className="h-4 w-4" />
                Ratiba ijayo
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <AnimatePresence>
                  {upcoming.map((r) => (
                    <MotionCard key={`up-${r.id}`}>
                      <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                        <p className="font-semibold text-slate-900">{r.title}</p>
                        <p className="text-xs text-slate-500">
                          {r.scheduled_at
                            ? new Date(r.scheduled_at).toLocaleString("sw-TZ", { dateStyle: "full", timeStyle: "short" })
                            : "—"}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-amber-700">Countdown: {countdownLabel(r.scheduled_at)}</p>
                      </div>
                    </MotionCard>
                  ))}
                </AnimatePresence>
              </div>
              {upcoming.length === 0 ? <p className="text-sm text-slate-500">Hakuna ratiba iliyowekwa.</p> : null}
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#0B3C5D]">Orodha yote</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {filteredRows.map((r) => (
                  <MotionCard key={r.id}>
                    <div className="flex h-full flex-col rounded-2xl border border-white/40 bg-white/85 p-4 shadow backdrop-blur">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{r.title}</p>
                          <p className="text-xs text-slate-500">{r.platform}</p>
                          <div className="mt-1 flex gap-1">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{r.status ?? "scheduled"}</span>
                            {r.is_public ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Public</span> : null}
                          </div>
                        </div>
                        {r.is_live ? <LiveBadge /> : null}
                      </div>
                      <p className="mt-2 line-clamp-3 text-xs text-slate-600">{r.description || "—"}</p>
                      <div className="mt-auto flex flex-wrap gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() => copyLink(r.stream_url)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Nakili
                        </button>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Hariri
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => setDelId(r.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Futa
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </MotionCard>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>
      )}

      {modal ? (
        <ModalScrollLayer onBackdropClick={() => setModal(false)} maxWidthClass="max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl"
          >
            <h3 className="text-lg font-bold">{editing ? "Hariri msemo" : "Msemo mpya"}</h3>
            <div className="mt-3 grid gap-2">
              <label className="text-xs font-medium">
                Jina
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium">
                Jukwaa
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option>YouTube</option>
                  <option>Facebook</option>
                  <option>Nyingine</option>
                </select>
              </label>
              <label className="text-xs font-medium">
                Kiungo cha kutazama (ushiriki)
                <input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium">
                Embed URL (hiari — utajengwa kiotomatiki kwa YouTube)
                <input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium">
                Maelezo
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium">
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value as "scheduled" | "live" | "ended")} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option value="scheduled">scheduled</option>
                  <option value="live">live</option>
                  <option value="ended">ended</option>
                </select>
              </label>
              <label className="text-xs font-medium">
                Thumbnail URL
                <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium">
                Preacher/Speaker
                <input value={preacher} onChange={(e) => setPreacher(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium">
                Event Link
                <input value={eventLink} onChange={(e) => setEventLink(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium">
                Category
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} />
                LIVE sasa
              </label>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Public visibility
              </label>
              <label className="text-xs font-medium">
                Ratiba (hiari)
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium">
                Mwisho wa stream (hiari)
                <input
                  type="datetime-local"
                  value={endedAt}
                  onChange={(e) => setEndedAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(false)} className="rounded-xl border px-4 py-2 text-sm">
                Ghairi
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </motion.div>
        </ModalScrollLayer>
      ) : null}

      <ConfirmModal
        open={!!delId}
        title="Futa msemo?"
        message="Utaondoa kiungo hiki kabisa."
        confirmLoading={delBusy}
        onCancel={() => setDelId(null)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
