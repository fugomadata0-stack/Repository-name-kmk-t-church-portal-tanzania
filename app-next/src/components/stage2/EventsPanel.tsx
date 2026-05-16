import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Plus, Trash2, Pencil, ImagePlus, Megaphone, BellRing, Search, Download } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { validateSelectedFile } from "../../lib/fileUploadGuard";
import { STAGE2_COLORS, stage2GradHeader } from "../../lib/stage2Theme";
import {
  deleteEvent,
  fetchEvents,
  removeEventPosterIfStored,
  uploadEventPoster,
  upsertEvent,
} from "../../services/stage2/eventsService";
import { writeCommunicationPrefill } from "../../services/communicationsService";
import type { ChurchEventRecord } from "../../types";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { ConfirmModal } from "../common/ConfirmModal";
import { GlassPanel, MotionCard } from "./Stage2Motion";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";
import { checkSupabaseMediaLink } from "../../services/mediaHealthService";

const ACCEPT_POSTER = "image/jpeg,image/png,image/webp,image/gif";
const POSTER_MAX_BYTES = 6 * 1024 * 1024;

export function EventsPanel(props: { submodule?: string; highlightRecordId?: string | null }) {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule, canPortalViewModule } =
    usePortal();
  const canComms = canPortalViewModule("communications");
  const canAdd = canPortalCreateModule("events");
  const canEdit = canPortalEditModule("events");
  const canDelete = canPortalDeleteModule("events");

  const [rows, setRows] = useState<ChurchEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ChurchEventRecord | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [status, setStatus] = useState<"upcoming" | "ongoing" | "completed" | "cancelled">("upcoming");
  const [isPublic, setIsPublic] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<string>("");

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
      setRows(await fetchEvents());
    } catch (e) {
      reportError(e, "Matukio — orodha");
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
      const st = await checkSupabaseMediaLink();
      setLinkStatus(st.message);
    })();
  }, []);

  const sorted = useMemo(() => {
    const list = [...rows]
      .filter((r) => {
        if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return `${r.title} ${r.location} ${r.description}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.event_date < b.event_date ? 1 : -1));
    if (props.submodule?.includes("Kalenda")) {
      return list.sort((a, b) => (a.event_date > b.event_date ? 1 : -1));
    }
    return list;
  }, [rows, props.submodule, query, statusFilter]);
  const byMonth = useMemo(() => {
    if (!props.submodule?.includes("Kalenda")) return [];
    const map = new Map<string, ChurchEventRecord[]>();
    for (const r of sorted) {
      const key = (r.event_date || "").slice(0, 7) || "Nyingine";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [props.submodule, sorted]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setEventDate(new Date().toISOString().slice(0, 10));
    setEventTime("");
    setLocation("");
    setOrganizer("");
    setSpeaker("");
    setStatus("upcoming");
    setIsPublic(false);
    setPosterFile(null);
    setModal(true);
  };

  const openEdit = (r: ChurchEventRecord) => {
    setEditing(r);
    setTitle(String(r.title ?? ""));
    setDescription(String(r.description ?? ""));
    setEventDate(r.event_date?.slice(0, 10) ?? "");
    setEventTime(r.event_time ?? "");
    setLocation(String(r.location ?? ""));
    setOrganizer(String(r.organizer ?? ""));
    setSpeaker(String(r.speaker ?? ""));
    setStatus((r.status ?? "upcoming") as "upcoming" | "ongoing" | "completed" | "cancelled");
    setIsPublic(Boolean(r.is_public));
    setPosterFile(null);
    setModal(true);
  };

  const save = async () => {
    if (!getSupabase()) return;
    const t = title.trim();
    if (!t || !eventDate) {
      pushToast("Jina na tarehe vinahitajika.", "error");
      return;
    }
    setSaving(true);
    let orphanPosterUrl: string | null = null;
    try {
      let posterUrl = editing?.poster_url ?? null;
      const prevPosterUrl = editing?.poster_url ?? null;
      if (posterFile && editing?.id) {
        posterUrl = await uploadEventPoster(posterFile, editing.id);
        orphanPosterUrl = posterUrl;
      }
      const saved = await upsertEvent(
        editing
          ? {
              id: editing.id,
              title: t,
              description,
              event_date: eventDate,
              event_time: eventTime || null,
              location,
              organizer,
              speaker,
              status,
              is_public: isPublic,
              poster_url: posterUrl ?? editing.poster_url,
            }
          : {
              title: t,
              description,
              event_date: eventDate,
              event_time: eventTime || null,
              location,
              organizer,
              speaker,
              status,
              is_public: isPublic,
              poster_url: null,
            }
      );
      orphanPosterUrl = null;
      if (posterFile && editing?.id && prevPosterUrl && prevPosterUrl !== posterUrl) {
        await removeEventPosterIfStored(prevPosterUrl).catch(() => {});
      }
      if (posterFile && !editing?.id) {
        const url = await uploadEventPoster(posterFile, saved.id);
        orphanPosterUrl = url;
        const again = await upsertEvent({
          id: saved.id,
          title: saved.title,
          description: saved.description,
          event_date: saved.event_date,
          event_time: saved.event_time || null,
          location: saved.location,
          organizer: saved.organizer,
          speaker: saved.speaker,
          status: saved.status,
          is_public: saved.is_public,
          poster_url: url,
        });
        orphanPosterUrl = null;
        setRows((prev) => {
          const next = prev.filter((x) => x.id !== again.id);
          return [again, ...next];
        });
      } else {
        setRows((prev) => {
          const next = prev.filter((x) => x.id !== saved.id);
          return [saved, ...next];
        });
      }
      pushToast("Tukio limehifadhiwa.", "success");
      dispatchPortalReloadMetrics();
      setModal(false);
    } catch (e) {
      if (orphanPosterUrl) await removeEventPosterIfStored(orphanPosterUrl).catch(() => {});
      reportError(e, "Matukio — hifadhi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!delId || !getSupabase()) return;
    setDelBusy(true);
    try {
      const row = rows.find((r) => r.id === delId);
      if (row?.poster_url) await removeEventPosterIfStored(row.poster_url).catch(() => {});
      await deleteEvent(delId);
      setRows((p) => p.filter((x) => x.id !== delId));
      pushToast("Tukio limefutwa.", "success");
      dispatchPortalReloadMetrics();
      setDelId(null);
    } catch (e) {
      reportError(e, "Matukio — futa");
    } finally {
      setDelBusy(false);
    }
  };

  if (!getSupabase()) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 text-sm text-slate-700">
        Sanidi Supabase ili kutumia Matukio.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl ${stage2GradHeader} px-6 py-5 text-white shadow-lg`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Matukio ya Kanisa</h2>
            <p className="text-sm text-white/85">Kalenda, poster, na maelezo — data halisi kutoka Supabase.</p>
          </div>
          {canAdd ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm hover:bg-white/25"
            >
              <Plus className="h-4 w-4" />
              Ongeza tukio
            </button>
          ) : null}
        </div>
      </motion.header>

      <SupabaseListFeedback loading={loading} loadError={loadError} isEmpty={rows.length === 0} />
      {linkStatus ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">{linkStatus}</div> : null}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="grid min-w-[220px] flex-1 gap-1 text-xs font-semibold text-slate-700">
          Tafuta
          <span className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-lg border px-7 py-2 text-sm" />
          </span>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="ALL">Zote</option>
            <option value="upcoming">upcoming</option>
            <option value="ongoing">ongoing</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => { setQuery(""); setStatusFilter("ALL"); }}>
          Safisha vichujio
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportRowsToExcel("KMKT-Matukio", ["Title", "Date", "Location", "Status", "Public"], sorted.map((r) => [r.title, r.event_date, r.location, r.status ?? "upcoming", r.is_public ? "Yes" : "No"]))}>
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportTableToPdf("KMK(T) Matukio Report", "KMKT-Matukio", ["Title", "Date", "Location", "Status", "Public"], sorted.map((r) => [r.title, r.event_date, r.location, r.status ?? "upcoming", r.is_public ? "Yes" : "No"]))}>
          PDF
        </button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => openPrintableTable("KMK(T) Matukio Report", ["Title", "Date", "Location", "Status", "Public"], sorted.map((r) => [r.title, r.event_date, r.location, r.status ?? "upcoming", r.is_public ? "Yes" : "No"]))}>
          Print
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B3C5D] border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Inapakia matukio…</p>
        </div>
      ) : (
        <motion.div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((ev) => (
            <MotionCard
              key={ev.id}
              className={
                props.highlightRecordId === ev.id ? "ring-2 ring-[#D4AF37] ring-offset-2" : ""
              }
            >
              <GlassPanel className="overflow-hidden">
                <div className="relative aspect-[16/10] bg-slate-200">
                  {ev.poster_url ? (
                    <ResponsiveLazyImage
                      src={ev.poster_url}
                      alt={ev.title ? `Bango: ${ev.title}` : "Bango la tukio"}

                      className="absolute inset-0 h-full w-full object-cover"
                      width={1280}
                      height={800}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <CalendarDays className="h-14 w-14 opacity-40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B3C5D]/90 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">{ev.event_date}</p>
                    <p className="line-clamp-2 text-sm font-bold">{ev.title}</p>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <p className="line-clamp-3 text-sm text-slate-600">{ev.description || "—"}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{ev.status ?? "upcoming"}</span>
                    {ev.is_public ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Public</span> : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" style={{ color: STAGE2_COLORS.navy }} />
                    <span className="line-clamp-1">{ev.location || "Mahali hajajazwa"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {canComms ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            writeCommunicationPrefill({
                              title: `Kumbusho: ${ev.title}`,
                              message: `Tukio: ${ev.title}\nTarehe: ${ev.event_date}\nMahali: ${ev.location || "—"}\n\n${ev.description || ""}`.trim(),
                              channel: "both",
                              target_type: "event_participants",
                              target_group: ev.id,
                            });
                            window.dispatchEvent(
                              new CustomEvent("kmt-portal-navigate", {
                                detail: { moduleKey: "communications", submodule: "Compose" },
                              })
                            );
                            pushToast("Mawasiliano — kumbusho limeandaliwa.", "info");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/80 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          <BellRing className="h-3.5 w-3.5" />
                          Kumbusho
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            writeCommunicationPrefill({
                              title: `Tukio jipya: ${ev.title}`,
                              message: `Tukio: ${ev.title}\nTarehe: ${ev.event_date}\nMahali: ${ev.location || "—"}`.trim(),
                              channel: "sms",
                              target_type: "members",
                            });
                            window.dispatchEvent(
                              new CustomEvent("kmt-portal-navigate", {
                                detail: { moduleKey: "communications", submodule: "Compose" },
                              })
                            );
                            pushToast("Mawasiliano — tangazo limeandaliwa.", "info");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#0B3C5D]/30 bg-[#0B3C5D]/5 px-2 py-1 text-xs font-semibold text-[#0B3C5D] hover:bg-[#0B3C5D]/10"
                        >
                          <Megaphone className="h-3.5 w-3.5" />
                          Arifu waumini
                        </button>
                      </>
                    ) : null}
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openEdit(ev)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-[#0B3C5D] hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Hariri
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => setDelId(ev.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Futa
                      </button>
                    ) : null}
                  </div>
                </div>
              </GlassPanel>
            </MotionCard>
          ))}
        </motion.div>
      )}
      {props.submodule?.includes("Kalenda") ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#0B1F3A]">Calendar-style view</h3>
          <div className="mt-2 space-y-3">
            {byMonth.map(([month, items]) => (
              <div key={month} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{month}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {items.map((it) => (
                    <div key={it.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
                      <p className="font-semibold text-slate-900">{it.title}</p>
                      <p className="text-slate-600">{it.event_date}{it.event_time ? ` ${it.event_time}` : ""} • {it.location || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {modal ? (
        <ModalScrollLayer onBackdropClick={() => setModal(false)} maxWidthClass="max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-2xl border border-amber-200/80 bg-[#FDFBF7] p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#0B3C5D]">{editing ? "Hariri tukio" : "Tukio jipya"}</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Kichwa *
                <input className="rounded-xl border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Tarehe *
                <input type="date" className="rounded-xl border px-3 py-2" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Muda
                <input type="time" className="rounded-xl border px-3 py-2" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Mahali
                <input className="rounded-xl border px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Organizer
                <input className="rounded-xl border px-3 py-2" value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Speaker/Guest
                <input className="rounded-xl border px-3 py-2" value={speaker} onChange={(e) => setSpeaker(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Status
                <select className="rounded-xl border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as "upcoming" | "ongoing" | "completed" | "cancelled")}>
                  <option value="upcoming">upcoming</option>
                  <option value="ongoing">ongoing</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Public visibility
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Maelezo
                <textarea className="min-h-[88px] rounded-xl border px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" style={{ color: STAGE2_COLORS.gold }} />
                  Poster
                </span>
                <input
                  type="file"
                  accept={ACCEPT_POSTER}
                  className="text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setPosterFile(null);
                      return;
                    }
                    const err = validateSelectedFile(f, {
                      allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
                      maxBytes: POSTER_MAX_BYTES,
                      labelSw: "poster",
                    });
                    if (err) {
                      pushToast(err, "error");
                      setPosterFile(null);
                      e.currentTarget.value = "";
                      return;
                    }
                    setPosterFile(f);
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
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-md"
                style={{ background: `linear-gradient(90deg, ${STAGE2_COLORS.navy}, #134b72)` }}
              >
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </motion.div>
        </ModalScrollLayer>
      ) : null}

      <ConfirmModal
        open={!!delId}
        title="Futa tukio?"
        message="Hatua hii haiwezi kutenduliwa."
        onCancel={() => setDelId(null)}
        onConfirm={onDelete}
        confirmLoading={delBusy}
      />
    </div>
  );
}
