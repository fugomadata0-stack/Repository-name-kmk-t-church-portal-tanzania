import { useCallback, useEffect, useMemo, useState } from "react";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { PremiumTable } from "../common/PremiumTable";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { mbToBytes, UPLOAD_LIMITS_MB, validateSelectedFile } from "../../lib/fileUploadGuard";
import {
  deleteChurchDocument,
  fetchChurchDocuments,
  insertChurchDocument,
  removeChurchDocumentFileFromStorage,
  updateChurchDocument,
  uploadChurchDocumentFile,
} from "../../services/portalDocumentsService";
import type { ChurchDocumentRecord } from "../../types";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";
import { safeLower } from "../../lib/safe";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";

const ACCEPT =
  ".pdf,.doc,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOC_MAX_BYTES = mbToBytes(UPLOAD_LIMITS_MB.documents);

function extOk(name: string) {
  const low = safeLower(name);
  return low.endsWith(".pdf") || low.endsWith(".doc") || low.endsWith(".docx") || low.endsWith(".xlsx");
}

function fileTypeLabel(url: string) {
  const low = safeLower(url);
  if (low.endsWith(".pdf")) return "PDF";
  if (low.endsWith(".doc") || low.endsWith(".docx")) return "DOC/DOCX";
  if (low.endsWith(".xlsx")) return "XLSX";
  return "Nyingine";
}

const DOCUMENTS_EXCEL_HEADERS = [
  "S/N",
  "Kichwa",
  "Kategoria",
  "Idara",
  "Uploader",
  "Dayosisi/Tawi",
  "Aina",
  "Status",
  "Maelezo",
  "Tarehe",
  "Kiungo",
];
const DOCUMENTS_PDF_HEADERS = [
  "S/N",
  "Kichwa",
  "Kategoria",
  "Idara",
  "Uploader",
  "Dayosisi/Tawi",
  "Aina",
  "Status",
  "Maelezo",
  "Tarehe",
];

export function ChurchDocumentsPanel(props: { highlightRecordId?: string | null }) {
  const { pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule, canPortalExportModule } = usePortal();
  const canAdd = canPortalCreateModule("documents");
  const canEdit = canPortalEditModule("documents");
  const canDelete = canPortalDeleteModule("documents");
  const canExport = canPortalExportModule("documents");

  const [rows, setRows] = useState<ChurchDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ChurchDocumentRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [uploaderFilter, setUploaderFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [docType, setDocType] = useState("");
  const [department, setDepartment] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [branch, setBranch] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const dispatchMetricsReload = useCallback(() => {
    dispatchPortalReloadMetrics();
  }, []);

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
      const list = await fetchChurchDocuments();
      setRows(list);
    } catch (err) {
      console.error("[Documents:load]", err);
      setRows([]);
      setLoadError(SUPABASE_QUERY_ERROR_SW);
      pushToast("Imeshindikana kupakua nyaraka.", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.category?.trim()) s.add(r.category.trim());
    });
    return ["ALL", ...Array.from(s).sort()];
  }, [rows]);

  const uploaderOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const v = String((r as ChurchDocumentRecord & { uploaded_by?: string }).uploaded_by ?? "").trim();
      if (v) s.add(v);
    });
    return ["ALL", ...Array.from(s).sort()];
  }, [rows]);

  const departmentOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const v = String(r.department ?? "").trim();
      if (v) s.add(v);
    });
    return ["ALL", ...Array.from(s).sort()];
  }, [rows]);

  const branchOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const v = String(r.branch ?? "").trim();
      if (v) s.add(v);
    });
    return ["ALL", ...Array.from(s).sort()];
  }, [rows]);

  const debouncedSearchFilter = useDebouncedValue(searchFilter, 220);

  const filteredRows = useMemo(() => {
    const q = safeLower(debouncedSearchFilter.trim());
    return rows.filter((r) => {
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
      if (typeFilter !== "ALL" && fileTypeLabel(r.file_url) !== typeFilter) return false;
      if (statusFilter !== "ALL" && String(r.status ?? "") !== statusFilter) return false;
      const uploader = String((r as ChurchDocumentRecord & { uploaded_by?: string }).uploaded_by ?? "").trim() || "—";
      if (uploaderFilter !== "ALL" && uploader !== uploaderFilter) return false;
      if (departmentFilter !== "ALL" && String(r.department ?? "").trim() !== departmentFilter) return false;
      if (branchFilter !== "ALL" && String(r.branch ?? "").trim() !== branchFilter) return false;
      const date10 = String(r.created_at ?? "").slice(0, 10);
      if (startDateFilter && (!date10 || date10 < startDateFilter)) return false;
      if (endDateFilter && (!date10 || date10 > endDateFilter)) return false;
      if (!q) return true;
      return safeLower(`${r.title} ${r.category} ${r.description} ${r.file_url}`).includes(q);
    });
  }, [
    rows,
    categoryFilter,
    typeFilter,
    statusFilter,
    uploaderFilter,
    departmentFilter,
    branchFilter,
    startDateFilter,
    endDateFilter,
    debouncedSearchFilter,
  ]);

  const clearAllFilters = useCallback(() => {
    setSearchFilter("");
    setCategoryFilter("ALL");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setUploaderFilter("ALL");
    setDepartmentFilter("ALL");
    setBranchFilter("ALL");
    setStartDateFilter("");
    setEndDateFilter("");
    pushToast("Vichujio vimesafishwa.", "success");
  }, [pushToast]);

  const exportRows = useMemo(
    () =>
      filteredRows.map((r, i) => ({
        sn: i + 1,
        title: r.title || "—",
        category: r.category || "—",
        department: r.department || "—",
        uploadedBy: r.uploaded_by || "—",
        branch: r.branch || "—",
        type: fileTypeLabel(r.file_url),
        status: String(r.status ?? "Active"),
        description: r.description || "—",
        createdAt: r.created_at ? new Date(r.created_at).toLocaleString() : "—",
        fileUrl: r.file_url || "—",
      })),
    [filteredRows]
  );

  const docAnalytics = useMemo(() => {
    const total = filteredRows.length;
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const uploadedThisMonth = filteredRows.filter((r) => String(r.created_at ?? "").slice(0, 7) === ym).length;
    const pdfCount = filteredRows.filter((r) => fileTypeLabel(r.file_url) === "PDF").length;
    const wordCount = filteredRows.filter((r) => fileTypeLabel(r.file_url) === "DOC/DOCX").length;
    const imageCount = filteredRows.filter((r) => {
      const low = safeLower(String(r.file_url ?? ""));
      return [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) => low.endsWith(ext));
    }).length;
    const archivedCount = filteredRows.filter((r) => String(r.status ?? "").toLowerCase() === "archived").length;
    const pendingCount = filteredRows.filter((r) => String(r.status ?? "").toLowerCase() === "pending").length;
    const recentUploads = [...filteredRows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5).length;
    const mostDownloaded = [...filteredRows]
      .map((r) => ({
        title: r.title || "—",
        downloads: Number((r as ChurchDocumentRecord & { download_count?: unknown }).download_count ?? 0) || 0,
      }))
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 5);
    const byCategory = Object.entries(
      filteredRows.reduce<Record<string, number>>((acc, row) => {
        const k = row.category?.trim() || "Nyingine";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));
    const byType = Object.entries(
      filteredRows.reduce<Record<string, number>>((acc, row) => {
        const k = fileTypeLabel(row.file_url);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));
    const monthlyTrend = Object.entries(
      filteredRows.reduce<Record<string, number>>((acc, row) => {
        const k = String(row.created_at ?? "").slice(0, 7) || "N/A";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([month, uploads]) => ({ month, uploads }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
    return { total, uploadedThisMonth, pdfCount, wordCount, imageCount, archivedCount, pendingCount, recentUploads, mostDownloaded, byCategory, byType, monthlyTrend };
  }, [filteredRows]);
  const filterSummary = `Category: ${categoryFilter} | Type: ${typeFilter} | Dept: ${departmentFilter} | Status: ${statusFilter} | UploadedBy: ${uploaderFilter} | Branch: ${branchFilter} | Date: ${startDateFilter || "ALL"} - ${endDateFilter || "ALL"}`;

  const exportExcel = useCallback(async () => {
    await exportRowsToExcel(
      `KMKT_ORODHA_YA_NYARAKA_${new Date().toISOString().slice(0, 10)}`,
      DOCUMENTS_EXCEL_HEADERS,
      exportRows.map((r) => [
        r.sn,
        r.title,
        r.category,
        r.department,
        r.uploadedBy,
        r.branch,
        r.type,
        r.status,
        r.description,
        r.createdAt,
        r.fileUrl,
      ]),
      { reportTitle: "ORODHA YA NYARAKA", filterSummary, sheetName: "Nyaraka" }
    );
  }, [exportRows, filterSummary]);

  const exportPdf = useCallback(async () => {
    await exportTableToPdf(
      "ORODHA YA NYARAKA",
      `KMKT_ORODHA_YA_NYARAKA_${new Date().toISOString().slice(0, 10)}`,
      DOCUMENTS_PDF_HEADERS,
      exportRows.map((r) => [
        r.sn,
        r.title,
        r.category,
        r.department,
        r.uploadedBy,
        r.branch,
        r.type,
        r.status,
        r.description,
        r.createdAt,
      ]),
      { filterSummary, showSignatureLine: true }
    );
  }, [exportRows, filterSummary]);

  const printDocuments = useCallback(() => {
    openPrintableTable(
      "ORODHA YA NYARAKA",
      DOCUMENTS_PDF_HEADERS,
      exportRows.map((r) => [
        r.sn,
        r.title,
        r.category,
        r.department,
        r.uploadedBy,
        r.branch,
        r.type,
        r.status,
        r.description,
        r.createdAt,
      ]),
      { filterSummary }
    );
  }, [exportRows, filterSummary]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setCategory("");
    setDocType("");
    setDepartment("");
    setUploadedBy("");
    setBranch("");
    setDescription("");
    setFile(null);
    setUploadProgress(0);
    setLastFailedFile(null);
    setModalOpen(true);
  };

  const openEdit = (r: ChurchDocumentRecord) => {
    setEditing(r);
    setTitle(String(r.title ?? ""));
    setCategory(String(r.category ?? ""));
    setDocType(String(r.type ?? ""));
    setDepartment(String(r.department ?? ""));
    setUploadedBy(String(r.uploaded_by ?? ""));
    setBranch(String(r.branch ?? ""));
    setDescription(String(r.description ?? ""));
    setFile(null);
    setUploadProgress(0);
    setLastFailedFile(null);
    setModalOpen(true);
  };

  const selectDocumentFile = useCallback(
    (picked: File | null) => {
      if (!picked) {
        setFile(null);
        return;
      }
      const err = validateSelectedFile(picked, {
        allowedExtensions: [".pdf", ".doc", ".docx", ".xlsx"],
        maxBytes: DOC_MAX_BYTES,
        allowedMimePrefixes: ["application/pdf", "application/msword", "application/vnd.openxmlformats", "application/octet-stream"],
        labelSw: "faili la nyaraka",
      });
      if (err) {
        pushToast(err, "error");
        setFile(null);
        return;
      }
      setFile(picked);
      setLastFailedFile(null);
      setUploadProgress(0);
    },
    [pushToast]
  );

  const saveModal = async () => {
    if (!getSupabase() || saving) return;
    const t = title.trim();
    if (!t) {
      pushToast("Jina la nyaraka linahitajika.", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        let nextUrl = editing.file_url;
        if (file) {
          if (!extOk(file.name)) {
            pushToast("Chagua faili la PDF, DOC, DOCX, au XLSX.", "error");
            setSaving(false);
            return;
          }
          setUploading(true);
          setUploadProgress(25);
          const { publicUrl } = await uploadChurchDocumentFile(file);
          setUploadProgress(75);
          const prevUrl = editing.file_url;
          nextUrl = publicUrl;
          try {
            const saved = await updateChurchDocument(editing.id, {
              title: t,
              category: category.trim(),
              type: docType.trim(),
              department: department.trim(),
              uploaded_by: uploadedBy.trim(),
              branch: branch.trim(),
              description: description.trim(),
              file_url: nextUrl,
            });
            if (prevUrl && prevUrl !== nextUrl) {
              await removeChurchDocumentFileFromStorage(prevUrl).catch(() => {});
            }
            setRows((prev) => prev.map((x) => (x.id === editing.id ? saved : x)));
            setUploadProgress(100);
          } catch (updErr) {
            await removeChurchDocumentFileFromStorage(publicUrl).catch(() => {});
            throw updErr;
          } finally {
            setUploading(false);
          }
        } else {
          const saved = await updateChurchDocument(editing.id, {
            title: t,
            category: category.trim(),
            type: docType.trim(),
            department: department.trim(),
            uploaded_by: uploadedBy.trim(),
            branch: branch.trim(),
            description: description.trim(),
          });
          setRows((prev) => prev.map((x) => (x.id === editing.id ? saved : x)));
        }
        pushToast("Nyaraka imehifadhiwa.", "success");
        dispatchMetricsReload();
      } else {
        if (!file || !extOk(file.name)) {
          pushToast("Chagua faili la PDF, DOC, DOCX, au XLSX.", "error");
          setSaving(false);
          return;
        }
        setUploading(true);
        setUploadProgress(25);
        const { publicUrl } = await uploadChurchDocumentFile(file);
        setUploadProgress(75);
        try {
          const saved = await insertChurchDocument({
            title: t,
            category: category.trim(),
            type: docType.trim(),
            department: department.trim(),
            uploaded_by: uploadedBy.trim(),
            branch: branch.trim(),
            file_url: publicUrl,
            description: description.trim(),
          });
          setRows((prev) => [saved, ...prev]);
          setUploadProgress(100);
          pushToast("Nyaraka imeongezwa.", "success");
          dispatchMetricsReload();
        } catch (insertErr) {
          await removeChurchDocumentFileFromStorage(publicUrl).catch(() => {});
          throw insertErr;
        } finally {
          setUploading(false);
        }
      }
      setModalOpen(false);
      setFile(null);
      setLastFailedFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Imeshindikana kuhifadhi nyaraka.";
      pushToast(msg || "Imeshindikana kuhifadhi nyaraka.", "error");
      console.error("[Documents:saveModal]", err);
      if (file) setLastFailedFile(file);
    } finally {
      setSaving(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-3">
      <SupabaseListFeedback loading={loading} loadError={loadError} isEmpty={rows.length === 0} />
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Tafuta
            <input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Tafuta kichwa/maelezo..." className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Kategoria
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "Zote" : c}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Aina ya faili
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
              {["ALL", "PDF", "DOC/DOCX", "XLSX", "Nyingine"].map((t) => (
                <option key={t} value={t}>
                  {t === "ALL" ? "Zote" : t}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
              {["ALL", "Active"].map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "Zote" : s}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Uploader
            <select value={uploaderFilter} onChange={(e) => setUploaderFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
              {uploaderOptions.map((u) => (
                <option key={u} value={u}>
                  {u === "ALL" ? "Wote" : u}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Idara
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d === "ALL" ? "Zote" : d}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Dayosisi / Tawi
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  {b === "ALL" ? "Zote" : b}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Tarehe kuanzia
            <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Tarehe hadi
            <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={clearAllFilters} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#0B1F3A] shadow-sm hover:bg-slate-50">
            Safisha Vichujio
          </button>
          <button type="button" onClick={() => void exportExcel()} disabled={!canExport} title={!canExport ? "Huna ruhusa ya kufanya kitendo hiki" : undefined} className="rounded-xl border border-[#D4AF37] bg-amber-50 px-3 py-2 text-sm font-semibold text-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-50">
            Excel
          </button>
          <button type="button" onClick={() => void exportPdf()} disabled={!canExport} title={!canExport ? "Huna ruhusa ya kufanya kitendo hiki" : undefined} className="rounded-xl bg-[#0B1F3A] px-3 py-2 text-sm font-semibold text-[#D4AF37] shadow-md disabled:cursor-not-allowed disabled:opacity-50">
            PDF
          </button>
          <button type="button" onClick={printDocuments} disabled={!canExport} title={!canExport ? "Huna ruhusa ya kufanya kitendo hiki" : undefined} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-50">
            Chapisha
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow"><p className="text-xs font-semibold text-slate-600">Total Documents</p><p className="text-lg font-bold text-[#0B1F3A]">{docAnalytics.total}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow"><p className="text-xs font-semibold text-slate-600">Uploaded This Month</p><p className="text-lg font-bold text-[#0B1F3A]">{docAnalytics.uploadedThisMonth}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow"><p className="text-xs font-semibold text-slate-600">PDF / Word / Image</p><p className="text-lg font-bold text-[#0B1F3A]">{docAnalytics.pdfCount} / {docAnalytics.wordCount} / {docAnalytics.imageCount}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow"><p className="text-xs font-semibold text-slate-600">Archived / Pending / Recent Uploads</p><p className="text-lg font-bold text-[#0B1F3A]">{docAnalytics.archivedCount} / {docAnalytics.pendingCount} / {docAnalytics.recentUploads}</p></article>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
          <h4 className="text-sm font-bold text-[#0B1F3A]">Documents by Category</h4>
          {docAnalytics.byCategory.length === 0 ? <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p> : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={docAnalytics.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#123C69" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
          <h4 className="text-sm font-bold text-[#0B1F3A]">Documents by Type</h4>
          {docAnalytics.byType.length === 0 ? <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p> : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={docAnalytics.byType} dataKey="value" nameKey="name" outerRadius={72} label>
                    {docAnalytics.byType.map((_, i) => (
                      <Cell key={`doc-type-${i}`} fill={["#0B1F3A", "#123C69", "#D4AF37", "#64748b"][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
          <h4 className="text-sm font-bold text-[#0B1F3A]">Upload Trend by Month</h4>
          {docAnalytics.monthlyTrend.length === 0 ? <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p> : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={docAnalytics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="uploads" stroke="#0B1F3A" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
        <h4 className="text-sm font-bold text-[#0B1F3A]">Most Downloaded Documents</h4>
        {docAnalytics.mostDownloaded.length === 0 ? <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p> : (
          <div className="mt-2 overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200 [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-slate-100 text-slate-900">
                <tr><th className="px-3 py-2 text-left">Kichwa</th><th className="px-3 py-2 text-left">Downloads</th></tr>
              </thead>
              <tbody>
                {docAnalytics.mostDownloaded.map((r) => (
                  <tr key={r.title} className="border-t border-slate-200"><td className="px-3 py-2">{r.title}</td><td className="px-3 py-2">{r.downloads}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          <p className="font-semibold text-[#0B1F3A]">Hakuna nyaraka bado</p>
          <p>Ongeza nyaraka ili zionekane hapa.</p>
        </div>
      ) : null}

      <PremiumTable<ChurchDocumentRecord>
        title="Nyaraka (Documents)"
        subtitle="PDF, DOCX, XLSX — chunguza na pakua"
        persistenceScope={portalPremiumTableScope(["documents", "Library", "table"])}
        rows={filteredRows}
        columns={[
          { key: "title", label: "Kichwa", render: (r) => <span className="block max-w-[420px] whitespace-normal break-words text-[#0B1F3A]">{r.title || "—"}</span> },
          {
            key: "category",
            label: "Kategoria",
            render: (r) => (
              <span className="inline-flex rounded-full border border-[#D4AF37]/50 bg-[#0B1F3A]/5 px-2 py-0.5 text-xs font-semibold text-[#0B1F3A]">
                {r.category || "—"}
              </span>
            ),
          },
          { key: "department", label: "Idara", render: (r) => <span className="text-slate-700">{r.department || "—"}</span> },
          { key: "uploaded_by", label: "Uploaded By", render: (r) => <span className="text-slate-700">{r.uploaded_by || "—"}</span> },
          { key: "branch", label: "Dayosisi/Tawi", render: (r) => <span className="text-slate-700">{r.branch || "—"}</span> },
          {
            key: "file_url",
            label: "Faili",
            render: (r) => (
              <a href={r.file_url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 underline break-all">
                {fileTypeLabel(r.file_url) === "PDF" ? "📄" : fileTypeLabel(r.file_url) === "XLSX" ? "📊" : "🗂️"} Fungua / pakua
              </a>
            ),
          },
          { key: "description", label: "Maelezo", render: (r) => <span className="block max-w-[520px] whitespace-normal break-words text-slate-700">{r.description || "—"}</span> },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {r.status || "Active"}
              </span>
            ),
          },
          { key: "created_at", label: "Tarehe", render: (r) => <span>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</span> },
        ]}
        onAdd={canAdd ? openCreate : undefined}
        onEdit={canEdit ? (r) => openEdit(r) : undefined}
        onDelete={
          canDelete
            ? async (id) => {
                const row = rows.find((x) => x.id === id);
                if (!row) return;
                try {
                  await deleteChurchDocument(id, row.file_url);
                  setRows((p) => p.filter((x) => x.id !== id));
                  pushToast("Nyaraka imefutwa.", "success");
                  dispatchMetricsReload();
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Imeshindikana kufuta nyaraka.";
                  pushToast(msg || "Imeshindikana kufuta nyaraka.", "error");
                  console.error("[Documents:delete]", err);
                }
              }
            : undefined
        }
        canAdd={canAdd}
        canEdit={canEdit}
        canDelete={canDelete}
        canExport={false}
        actionsDisabled={saving || uploading}
        isLoading={loading}
        highlightRowId={props.highlightRecordId ?? null}
        exportBasename="nyaraka-documents"
      />

      {modalOpen ? (
        <ModalScrollLayer onBackdropClick={() => setModalOpen(false)} maxWidthClass="max-w-lg">
          <div className="w-full rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0B1F3A]">{editing ? "Hariri nyaraka" : "Ongeza nyaraka"}</h3>
            <div className="mt-3 grid gap-2">
              <label className="grid gap-1 text-xs">
                Kichwa
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" required />
              </label>
              <label className="grid gap-1 text-xs">
                Kategoria
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Type
                <input value={docType} onChange={(e) => setDocType(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Idara
                <input value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Uploaded By
                <input value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Dayosisi / Tawi
                <input value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Maelezo
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">
                Faili {editing ? "(badili — hiari)" : "(lazima)"}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (saving || uploading) return;
                    const dropped = e.dataTransfer.files?.[0] ?? null;
                    selectDocumentFile(dropped);
                  }}
                  className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600"
                >
                  Buruta faili hapa au tumia browse.
                </div>
                <input
                  type="file"
                  accept={ACCEPT}
                  disabled={saving || uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    selectDocumentFile(f);
                    e.currentTarget.value = "";
                  }}
                  className="text-sm"
                />
                {file ? <p className="text-xs text-slate-700">Umechagua: {file.name}</p> : null}
                {uploading ? (
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-[#0B1F3A] transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                ) : null}
                {lastFailedFile ? (
                  <button type="button" className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-[#0B1F3A]" onClick={() => selectDocumentFile(lastFailedFile)} disabled={saving || uploading}>
                    Retry faili iliyoshindikana
                  </button>
                ) : null}
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setModalOpen(false)} disabled={saving || uploading}>
                Ghairi
              </button>
              <button type="button" className="rounded-lg bg-[#0B1F3A] px-3 py-2 text-sm font-semibold text-[#D4AF37] disabled:opacity-50" onClick={() => void saveModal()} disabled={saving || uploading}>
                {saving || uploading ? "Inahifadhi..." : "Hifadhi"}
              </button>
            </div>
          </div>
        </ModalScrollLayer>
      ) : null}
    </div>
  );
}
