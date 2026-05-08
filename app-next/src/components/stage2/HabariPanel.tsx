import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Pencil, Plus, Trash2, Search, Download, Eye } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { validateSelectedFile } from "../../lib/fileUploadGuard";
import { stage2GradHeader } from "../../lib/stage2Theme";
import {
  deleteNewsPost,
  fetchNewsPosts,
  removeNewsImageIfStored,
  upsertNewsPost,
  uploadNewsFeaturedImage,
} from "../../services/stage2/newsService";
import type { NewsPostRecord } from "../../types";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { ConfirmModal } from "../common/ConfirmModal";
import { GlassPanel, MotionCard } from "./Stage2Motion";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";
import { checkSupabaseMediaLink } from "../../services/mediaHealthService";
const IMAGE_MAX_BYTES = 6 * 1024 * 1024;

export function HabariPanel(props: { highlightRecordId?: string | null }) {
  const { reportError, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canAdd = canPortalCreateModule("habari");
  const canEdit = canPortalEditModule("habari");
  const canDel = canPortalDeleteModule("habari");

  const [rows, setRows] = useState<NewsPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<NewsPostRecord | null>(null);
  const [editing, setEditing] = useState<NewsPostRecord | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [isPublic, setIsPublic] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
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
      setRows(await fetchNewsPosts());
    } catch (e) {
      reportError(e, "Habari — orodha");
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

  const filtered = rows.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${r.title} ${r.category} ${r.content}`.toLowerCase().includes(q);
  });

  const save = async () => {
    if (!getSupabase()) return;
    const t = title.trim();
    const b = content.trim();
    if (!t || !b) {
      pushToast("Kichwa na maelezo yanahitajika.", "error");
      return;
    }
    setSaving(true);
    let orphanImageUrl: string | null = null;
    try {
      let imageUrl = editing?.image_url ?? null;
      const prevImageUrl = editing?.image_url ?? null;
      if (imgFile) {
        imageUrl = await uploadNewsFeaturedImage(imgFile);
        orphanImageUrl = imageUrl;
      }
      const saved = await upsertNewsPost(
        editing
          ? {
              id: editing.id,
              title: t,
              content: b,
              category,
              image_url: imageUrl ?? editing.image_url,
              slug,
              summary,
              author,
              status,
              is_public: isPublic,
              featured,
              publish_date: publishDate || null,
            }
          : { title: t, content: b, category, image_url: imageUrl, slug, summary, author, status, is_public: isPublic, featured, publish_date: publishDate || null }
      );
      orphanImageUrl = null;
      if (imgFile && editing?.id && prevImageUrl && prevImageUrl !== imageUrl) {
        await removeNewsImageIfStored(prevImageUrl).catch(() => {});
      }
      setRows((p) => [saved, ...p.filter((x) => x.id !== saved.id)]);
      pushToast("Habari imehifadhiwa.", "success");
      window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
      setModal(false);
      setImgFile(null);
    } catch (e) {
      if (orphanImageUrl) await removeNewsImageIfStored(orphanImageUrl).catch(() => {});
      reportError(e, "Habari — hifadhi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!delId) return;
    try {
      const row = rows.find((r) => r.id === delId);
      if (row?.image_url) await removeNewsImageIfStored(row.image_url).catch(() => {});
      await deleteNewsPost(delId);
      setRows((p) => p.filter((x) => x.id !== delId));
      pushToast("Imefutwa.", "success");
      window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
      setDelId(null);
      setDetail(null);
    } catch (e) {
      reportError(e, "Habari — futa");
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
            <Newspaper className="h-8 w-8 opacity-90" />
            <div>
              <h2 className="text-xl font-bold">Habari na Matangazo</h2>
              <p className="text-sm text-white/85">Arifa za kanisa — maandishi na picha ya kichwa.</p>
            </div>
          </div>
          {canAdd ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setTitle("");
                setSlug("");
                setSummary("");
                setContent("");
                setCategory("");
                setAuthor("");
                setStatus("draft");
                setIsPublic(false);
                setFeatured(false);
                setPublishDate("");
                setImgFile(null);
                setModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm hover:bg-white/25"
            >
              <Plus className="h-4 w-4" />
              Andika habari
            </button>
          ) : null}
        </div>
      </header>

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
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => { setQuery(""); setStatusFilter("ALL"); }}>
          Safisha vichujio
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportRowsToExcel("KMKT-Habari", ["Title", "Category", "Status", "Public", "Published"], filtered.map((r) => [r.title, r.category, r.status ?? "draft", r.is_public ? "Yes" : "No", r.publish_date ?? ""]))}>
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => exportTableToPdf("KMK(T) Habari Report", "KMKT-Habari", ["Title", "Category", "Status", "Public", "Published"], filtered.map((r) => [r.title, r.category, r.status ?? "draft", r.is_public ? "Yes" : "No", r.publish_date ?? ""]))}>
          PDF
        </button>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => openPrintableTable("KMK(T) Habari Report", ["Title", "Category", "Status", "Public", "Published"], filtered.map((r) => [r.title, r.category, r.status ?? "draft", r.is_public ? "Yes" : "No", r.publish_date ?? ""]))}>
          Print
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border bg-white/80 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B3C5D] border-t-transparent" />
          <p className="text-sm text-slate-600">Inapakia habari…</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((r) => (
            <MotionCard key={r.id} className={props.highlightRecordId === r.id ? "ring-2 ring-[#D4AF37]" : ""}>
              <GlassPanel className="overflow-hidden">
                <button type="button" className="block w-full text-left" onClick={() => setDetail(r)}>
                  {r.image_url ? (
                    <div className="aspect-[21/9] max-h-48 w-full overflow-hidden bg-slate-100">
                      <img src={r.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="flex aspect-[21/9] max-h-48 items-center justify-center bg-gradient-to-br from-[#0B3C5D] to-[#134b72] text-white/90">
                      <Newspaper className="h-12 w-12" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">{r.category || "Habari"}</p>
                    <div className="mt-1 flex gap-1">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{r.status ?? "draft"}</span>
                      {r.is_public ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Public</span> : null}
                      {r.featured ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Featured</span> : null}
                    </div>
                    <h3 className="mt-1 line-clamp-2 text-lg font-bold text-[#0B3C5D]">{r.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">{r.content}</p>
                  </div>
                </button>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
                  {canEdit ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold text-[#0B3C5D]"
                      onClick={() => {
                        setEditing(r);
                        setTitle(String(r.title ?? ""));
                        setSlug(String(r.slug ?? ""));
                        setSummary(String(r.summary ?? ""));
                        setContent(String(r.content ?? ""));
                        setCategory(String(r.category ?? ""));
                        setAuthor(String(r.author ?? ""));
                        setStatus((r.status ?? "draft") as "draft" | "published" | "archived");
                        setIsPublic(Boolean(r.is_public));
                        setFeatured(Boolean(r.featured));
                        setPublishDate(r.publish_date ? String(r.publish_date).slice(0, 16) : "");
                        setImgFile(null);
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
                      onClick={() => setDelId(r.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Futa
                    </button>
                  ) : null}
                  {canEdit ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-800"
                      onClick={async () => {
                        const next = r.status === "published" ? "draft" : "published";
                        const updated = await upsertNewsPost({
                          id: r.id,
                          title: r.title,
                          content: r.content,
                          category: r.category,
                          image_url: r.image_url,
                          slug: r.slug,
                          summary: r.summary,
                          author: r.author,
                          status: next,
                          is_public: next === "published" ? true : r.is_public,
                          featured: r.featured,
                          publish_date: next === "published" ? new Date().toISOString() : r.publish_date ?? null,
                        });
                        setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                        window.dispatchEvent(new CustomEvent("kmt-portal-reload-metrics"));
                        pushToast(next === "published" ? "Habari imechapishwa." : "Habari imeondolewa kwenye chapisho.", "success");
                      }}
                    >
                      <Eye className="h-3 w-3" />
                      {r.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                  ) : null}
                </div>
              </GlassPanel>
            </MotionCard>
          ))}
        </div>
      )}

      {detail ? (
        <ModalScrollLayer onBackdropClick={() => setDetail(null)} maxWidthClass="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl border border-amber-200 bg-[#FDFBF7] p-6 shadow-2xl"
          >
            {detail.image_url ? (
              <img src={detail.image_url} alt="" className="mb-4 max-h-64 w-full rounded-xl object-cover" />
            ) : null}
            <p className="text-xs font-semibold text-[#D4AF37]">{detail.category || "Habari"}</p>
            <h3 className="mt-2 text-2xl font-bold text-[#0B3C5D]">{detail.title}</h3>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{detail.content}</div>
            <button type="button" className="mt-6 rounded-xl border px-4 py-2 text-sm" onClick={() => setDetail(null)}>
              Funga
            </button>
          </motion.div>
        </ModalScrollLayer>
      ) : null}

      {modal ? (
        <ModalScrollLayer onBackdropClick={() => setModal(false)} maxWidthClass="max-w-lg">
          <div className="w-full rounded-2xl border border-amber-200 bg-[#FDFBF7] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0B3C5D]">{editing ? "Hariri habari" : "Habari mpya"}</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                Kichwa *
                <input className="rounded-xl border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Kategoria
                <input className="rounded-xl border px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Slug
                <input className="rounded-xl border px-3 py-2" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Summary
                <textarea className="min-h-[80px] rounded-xl border px-3 py-2" value={summary} onChange={(e) => setSummary(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Author
                <input className="rounded-xl border px-3 py-2" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Status
                <select className="rounded-xl border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published" | "archived")}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Publish date
                <input type="datetime-local" className="rounded-xl border px-3 py-2" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Public visibility
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                Featured news
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Maelezo *
                <textarea className="min-h-[140px] rounded-xl border px-3 py-2" value={content} onChange={(e) => setContent(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Picha ya kichwa (si lazima)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setImgFile(null);
                      return;
                    }
                    const err = validateSelectedFile(f, {
                      allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
                      maxBytes: IMAGE_MAX_BYTES,
                      labelSw: "picha ya kichwa",
                    });
                    if (err) {
                      pushToast(err, "error");
                      setImgFile(null);
                      e.currentTarget.value = "";
                      return;
                    }
                    setImgFile(f);
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

      <ConfirmModal open={!!delId} title="Futa habari?" message="Rekodi itaondolewa kabisa." onCancel={() => setDelId(null)} onConfirm={() => void onDelete()} />
    </div>
  );
}
