import { useCallback, useEffect, useMemo, useState } from "react";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { PremiumTable } from "../common/PremiumTable";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { deleteSermon, fetchSermons, upsertSermon } from "../../services/sermonsService";
import type { SermonMediaType, SermonRecord } from "../../types";
import { ModalScrollLayer } from "../common/ModalScrollLayer";

export function SermonsPanel(props: { highlightRecordId?: string | null }) {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canAdd = canPortalCreateModule("mahubiri");
  const canEdit = canPortalEditModule("mahubiri");
  const canDelete = canPortalDeleteModule("mahubiri");

  const [rows, setRows] = useState<SermonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SermonRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [preacherFilter, setPreacherFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [title, setTitle] = useState("");
  const [preacher, setPreacher] = useState("");
  const [date, setDate] = useState("");
  const [scripture, setScripture] = useState("");
  const [mediaType, setMediaType] = useState<SermonMediaType>("video");
  const [mediaUrl, setMediaUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
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
      setRows(await fetchSermons());
    } catch (err) {
      reportError(err, "Mahubiri — orodha");
      setRows([]);
      setLoadError(SUPABASE_QUERY_ERROR_SW);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const preachers = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.preacher?.trim()) s.add(r.preacher.trim());
    });
    return ["ALL", ...Array.from(s).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (preacherFilter !== "ALL" && r.preacher !== preacherFilter) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [rows, preacherFilter, dateFrom, dateTo]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setPreacher("");
    setDate(new Date().toISOString().slice(0, 10));
    setScripture("");
    setMediaType("video");
    setMediaUrl("");
    setDescription("");
    setModalOpen(true);
  };

  const openEdit = (r: SermonRecord) => {
    setEditing(r);
    setTitle(String(r.title ?? ""));
    setPreacher(String(r.preacher ?? ""));
    setDate(r.date?.slice(0, 10) ?? "");
    setScripture(String(r.scripture ?? ""));
    setMediaType(r.media_type ?? "video");
    setMediaUrl(String(r.media_url ?? ""));
    setDescription(String(r.description ?? ""));
    setModalOpen(true);
  };

  const saveModal = async () => {
    if (!getSupabase()) return;
    const t = title.trim();
    const u = mediaUrl.trim();
    if (!t || !u) {
      pushToast("Kichwa na kiungo cha media vinahitajika.", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertSermon(
        editing
          ? {
              id: editing.id,
              title: t,
              preacher: preacher.trim(),
              date,
              scripture: scripture.trim(),
              media_type: mediaType,
              media_url: u,
              description: description.trim(),
            }
          : {
              title: t,
              preacher: preacher.trim(),
              date,
              scripture: scripture.trim(),
              media_type: mediaType,
              media_url: u,
              description: description.trim(),
            }
      );
      setRows((prev) =>
        editing ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]
      );
      pushToast(editing ? "Mahubiri yamehifadhiwa." : "Mahubiri yameongezwa.", "success");
      setModalOpen(false);
    } catch (err) {
      reportError(err, "Mahubiri — kuhifadhi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <SupabaseListFeedback loading={loading} loadError={loadError} isEmpty={rows.length === 0} />
      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="mb-2 text-xs font-semibold text-slate-600">Chuja</p>
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Mhubiri
            <select
              value={preacherFilter}
              onChange={(e) => setPreacherFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            >
              {preachers.map((p) => (
                <option key={p} value={p}>
                  {p === "ALL" ? "Wote" : p}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Tarehe kutoka
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Tarehe hadi
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" />
          </label>
          <button
            type="button"
            className="self-end rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
            onClick={() => {
              setPreacherFilter("ALL");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Safisha chujio
          </button>
        </div>
      </section>

      <PremiumTable<SermonRecord>
        title="Mahubiri"
        subtitle="Sauti au video (kiungo cha YouTube / sauti)"
        rows={filteredRows}
        columns={[
          { key: "title", label: "Kichwa" },
          { key: "preacher", label: "Mhubiri" },
          { key: "date", label: "Tarehe" },
          { key: "scripture", label: "Neno / funguo" },
          { key: "media_type", label: "Aina" },
          {
            key: "media_url",
            label: "Kiungo",
            render: (r) => (
              <a href={r.media_url} target="_blank" rel="noreferrer" className="max-w-[220px] truncate font-medium text-blue-700 underline">
                {r.media_url}
              </a>
            ),
          },
          { key: "description", label: "Maelezo" },
        ]}
        onAdd={canAdd ? openCreate : undefined}
        onEdit={canEdit ? (r) => openEdit(r) : undefined}
        onDelete={
          canDelete
            ? async (id) => {
                try {
                  await deleteSermon(id);
                  setRows((p) => p.filter((x) => x.id !== id));
                  pushToast("Mahubiri yamefutwa.", "success");
                } catch (err) {
                  reportError(err, "Mahubiri — kufuta");
                }
              }
            : undefined
        }
        canAdd={canAdd}
        canEdit={canEdit}
        canDelete={canDelete}
        isLoading={loading}
        highlightRowId={props.highlightRecordId ?? null}
        exportBasename="mahubiri"
      />

      {modalOpen ? (
        <ModalScrollLayer onBackdropClick={() => setModalOpen(false)} maxWidthClass="max-w-lg">
          <div className="w-full rounded-2xl border border-purple-200 bg-white p-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{editing ? "Hariri mahubiri" : "Ongeza mahubiri"}</h3>
            <div className="mt-3 grid gap-2">
              <label className="grid gap-1 text-xs">
                Kichwa
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" required />
              </label>
              <label className="grid gap-1 text-xs">
                Mhubiri
                <input value={preacher} onChange={(e) => setPreacher(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Tarehe
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Neno / funguo
                <input value={scripture} onChange={(e) => setScripture(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Aina ya media
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as SermonMediaType)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="video">Video</option>
                  <option value="audio">Sauti</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                Kiungo (URL)
                <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" placeholder="https://..." required />
              </label>
              <label className="grid gap-1 text-xs">
                Maelezo
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setModalOpen(false)} disabled={saving}>
                Ghairi
              </button>
              <button
                type="button"
                className="rounded-lg bg-purple-800 px-3 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void saveModal()}
                disabled={saving}
              >
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </div>
        </ModalScrollLayer>
      ) : null}
    </div>
  );
}
