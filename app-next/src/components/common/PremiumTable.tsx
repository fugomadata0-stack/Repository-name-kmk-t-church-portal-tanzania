import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { mergeModuleSlice, readModuleSlice } from "../../lib/portalUiPersistence";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { ReactNode } from "react";
import { usePortal } from "../../context/PortalContext";
import { ConfirmModal } from "./ConfirmModal";
import { ModalScrollLayer } from "./ModalScrollLayer";
import { StatusBadge } from "./StatusBadge";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";
import {
  downloadPortalExcelDataExport,
  downloadPortalExcelTemplate,
  mapLabelRowsToKeyRecords,
  parsePortalExcelDataSheet,
} from "../../lib/excelPortalBulk";
import { downloadCsvDataExport, downloadCsvTemplate, parseCsvData } from "../../lib/csvPortalBulk";
import { PORTAL_EXCEL_TABLE_HINT_SW } from "../../lib/excelModuleFormSpecs";
import { validateSelectedFile } from "../../lib/fileUploadGuard";
import { safeArray, safeIncludes, safeLower } from "../../lib/safe";
import { SCOPE_TOOLTIP_SW } from "../../utils/scopeAccess";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  /** Thamani ya huisha/PDF/Chapisha wakati safu inatumia `render` au kitu kisicho cha maandishi moja kwa moja */
  exportValue?: (row: T) => string | number;
  /** When set on the status column, drives an extra filter dropdown */
  filterValues?: string[];
}

/** Blanki na pakia — safu zinalingana na fomu (ModulePage / excelModuleFormSpecs). */
export type PremiumTableExcelBulk = {
  specTitle: string;
  specSubtitle?: string;
  templateBasename: string;
  columns: { key: string; label: string }[];
  instructionRows: (string | number)[][];
  onImportRows?: (rows: Record<string, string>[]) => Promise<{ ok: number; fail: number; message?: string }>;
};

interface Props<T extends { id: string; status?: string }> {
  title: string;
  subtitle: string;
  rows: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (id: string) => void | Promise<void>;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  /** Ukiweka, safu moja moja inaamua (mipaka ya eneo) */
  rowCanEdit?: (row: T) => boolean;
  rowCanDelete?: (row: T) => boolean;
  canExport?: boolean;
  /** Base filename for Excel / PDF export */
  exportBasename?: string;
  /** Blanki la Excel linalingana na fomu + hiari ya pakia */
  excelBulk?: PremiumTableExcelBulk | null;
  isLoading?: boolean;
  /** Pia fungua Ongeza/Hariri/Futa (mf. fomu/madoido wazi au mzazi wa vitendo) */
  actionsDisabled?: boolean;
  /** Angaza safu kwa sekunde chache (baada ya kuongeza) */
  highlightRowId?: string | null;
  /** Ufunguo wa sessionStorage (filters / ukurasa) — tumia `portalPremiumTableScope` au kamba maalum kwa jedwali */
  persistenceScope?: string;
  /** Badilisha kichwa / ujumbe wa kidirisha cha uthibitisho wa futa (mf. archive). */
  deleteConfirmTitle?: string;
  deleteConfirmMessage?: string;
  /** Vitendo vya ziada kwa kila safu (mf. PDF/Excel ya rekodi moja). */
  renderRowActionExtras?: (row: T) => ReactNode;
}

type SortDir = "asc" | "desc";

type PremiumTablePersist = {
  q: string;
  statusFilter: string;
  sortKey: string | null;
  sortDir: SortDir;
  page: number;
  pageSize: number;
};
const EXCEL_MAX_BYTES = 5 * 1024 * 1024;
const CSV_MAX_BYTES = 2 * 1024 * 1024;

export function PremiumTable<T extends { id: string; status?: string }>({
  title,
  subtitle,
  rows,
  columns,
  onAdd,
  onEdit,
  onDelete,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  rowCanEdit,
  rowCanDelete,
  canExport = true,
  exportBasename,
  excelBulk = null,
  isLoading = false,
  actionsDisabled = false,
  highlightRowId = null,
  persistenceScope,
  deleteConfirmTitle,
  deleteConfirmMessage,
  renderRowActionExtras,
}: Props<T>) {
  const { reportError, pushToast, authUser } = usePortal();
  const importInputRef = useRef<HTMLInputElement>(null);
  const csvImportInputRef = useRef<HTMLInputElement>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [q, setQ] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [viewRow, setViewRow] = useState<T | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const persistFullKey = useMemo(() => {
    const s = persistenceScope?.trim();
    if (!s) return null;
    return `pt:${s.slice(0, 160)}`;
  }, [persistenceScope]);

  useLayoutEffect(() => {
    if (!persistFullKey || !authUser?.id) return;
    const saved = readModuleSlice<PremiumTablePersist>(authUser.id, persistFullKey);
    if (!saved) return;
    setQ(saved.q);
    setStatusFilter(saved.statusFilter ?? "ALL");
    setSortKey(saved.sortKey ?? null);
    setSortDir(saved.sortDir === "desc" ? "desc" : "asc");
    setPage(Math.max(1, Number(saved.page) || 1));
    setPageSize(Math.min(100, Math.max(5, Number(saved.pageSize) || 10)));
  }, [persistFullKey, authUser?.id]);

  useEffect(() => {
    if (!persistFullKey || !authUser?.id) return;
    const t = window.setTimeout(() => {
      mergeModuleSlice(authUser.id, persistFullKey, {
        q,
        statusFilter,
        sortKey,
        sortDir,
        page,
        pageSize,
      } satisfies PremiumTablePersist);
    }, 380);
    return () => window.clearTimeout(t);
  }, [persistFullKey, authUser?.id, q, statusFilter, sortKey, sortDir, page, pageSize]);

  const statusColumn = columns.find((c) => c.key === "status" || c.filterValues);
  const statusOptions = statusColumn?.filterValues;

  const debouncedQ = useDebouncedValue(q, 220);

  const allowEditRow = (row: T) => (rowCanEdit ? canEdit && rowCanEdit(row) : canEdit);
  const allowDeleteRow = (row: T) => (rowCanDelete ? canDelete && rowCanDelete(row) : canDelete);

  const filtered = useMemo(() => {
    const qq = safeLower(debouncedQ).trim();
    return safeArray(rows).filter((r) => {
      if (statusFilter !== "ALL" && String((r as any).status ?? "") !== statusFilter) return false;
      if (!qq) return true;
      try {
        if (safeIncludes(JSON.stringify(r), qq)) return true;
      } catch {
        /* safu yenye circular ref au thamani zisizo serializable */
      }
      return columns.some((c) => safeIncludes((r as Record<string, unknown>)[String(c.key)], qq));
    });
  }, [debouncedQ, rows, statusFilter, columns]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, statusFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      const na = typeof va === "number" ? va : safeLower(va);
      const nb = typeof vb === "number" ? vb : safeLower(vb);
      if (na < nb) return sortDir === "asc" ? -1 : 1;
      if (na > nb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const p = Math.min(page, totalPages);
    const start = (p - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize, totalPages]);

  const tableActionsLocked = actionsDisabled || deleteBusy || importBusy;

  useEffect(() => {
    if (!highlightRowId) return;
    const idx = sorted.findIndex((r) => r.id === highlightRowId);
    if (idx === -1) return;
    const targetPage = Math.floor(idx / pageSize) + 1;
    setPage(targetPage);
  }, [highlightRowId, sorted, pageSize]);

  useEffect(() => {
    if (!highlightRowId) return;
    const t = window.setTimeout(() => {
      const el = document.querySelector(`[data-row-id="${highlightRowId}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [highlightRowId, safePage, pageSize, paged.length]);

  const baseName = exportBasename || title.replace(/\s+/g, "_").slice(0, 80);
  const exportColumns = useMemo(() => columns.filter((c) => !String(c.key).startsWith("_")), [columns]);

  function exportCellValue(row: T, c: Column<T>): string | number {
    if (c.exportValue) return c.exportValue(row);
    const v = (row as Record<string, unknown>)[String(c.key)];
    if (v == null) return "";
    if (typeof v === "number") return v;
    if (typeof v === "object") return "[object]";
    return String(v);
  }

  function exportCellByKey(row: T, key: string): string | number {
    const col = columns.find((c) => String(c.key) === key);
    if (col) return exportCellValue(row, col);
    const v = (row as Record<string, unknown>)[key];
    if (v == null) return "";
    if (typeof v === "number") return v;
    if (typeof v === "object") return "";
    return String(v);
  }

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function exportExcel() {
    if (excelBulk && canExport) {
      await downloadPortalExcelDataExport({
        filenameBase: excelBulk.templateBasename || baseName,
        instructionTitle: excelBulk.specTitle,
        instructionSubtitle: excelBulk.specSubtitle,
        instructionRows: excelBulk.instructionRows,
        columns: excelBulk.columns,
        dataRows: sorted.map((row) => excelBulk.columns.map((c) => exportCellByKey(row, c.key))),
      });
      return;
    }
    const headers = ["S/N", ...exportColumns.map((c) => c.label)];
    const body = sorted.map((row, i) => [
      i + 1,
      ...exportColumns.map((c) => exportCellValue(row, c)),
    ]);
    await exportRowsToExcel(baseName, headers, body as (string | number)[][]);
  }

  async function downloadBlankTemplate() {
    if (!excelBulk) return;
    await downloadPortalExcelTemplate({
      filenameBase: excelBulk.templateBasename || baseName,
      instructionTitle: excelBulk.specTitle,
      instructionSubtitle: excelBulk.specSubtitle,
      instructionRows: excelBulk.instructionRows,
      columns: excelBulk.columns,
    });
  }

  function downloadBlankCsvTemplate() {
    if (!excelBulk) return;
    downloadCsvTemplate(excelBulk.templateBasename || baseName, excelBulk.columns.map((c) => c.label));
  }

  function validateKeyedExcelRows(rows: Record<string, string>[], keys: string[]): string[] {
    const out: string[] = [];
    rows.forEach((row, idx) => {
      const miss = keys.filter((k) => !(k in row));
      if (miss.length > 0) {
        out.push(`Mstari ${idx + 2}: umepoteza safu (${miss.join(", ")}).`);
      }
      for (const k of keys) {
        const v = row[k];
        if (typeof v !== "string") out.push(`Mstari ${idx + 2}: thamani ya "${k}" si maandishi.`);
      }
    });
    return out;
  }

  async function handleExcelImportFile(file: File | undefined) {
    if (!file || !excelBulk?.onImportRows) return;
    const fileErr = validateSelectedFile(file, {
      allowedExtensions: [".xlsx"],
      maxBytes: EXCEL_MAX_BYTES,
      labelSw: "faili la Excel",
    });
    if (fileErr) {
      pushToast(fileErr, "error");
      return;
    }
    setImportBusy(true);
    try {
      const labels = excelBulk.columns.map((c) => c.label);
      const raw = await parsePortalExcelDataSheet(file, labels);
      const keyed = mapLabelRowsToKeyRecords(raw, excelBulk.columns);
      const schemaErrors = validateKeyedExcelRows(
        keyed,
        excelBulk.columns.map((c) => c.key)
      );
      if (schemaErrors.length > 0) {
        pushToast(`Schema ya Excel si sahihi. ${schemaErrors[0]}`, "error");
        return;
      }
      if (!keyed.length) {
        pushToast("Hakuna safu zilizo na taarifa kwenye faili (jalada «Data» tupu au safu zote tupu).", "info");
        return;
      }
      const res = await excelBulk.onImportRows(keyed);
      pushToast(
        res.message ?? `Excel: ${res.ok} zimehifadhiwa, ${res.fail} zimeshindwa.`,
        res.fail > 0 && res.ok === 0 ? "error" : res.fail ? "info" : "success"
      );
    } catch (err) {
      reportError(err, "Pakia Excel");
    } finally {
      setImportBusy(false);
    }
  }

  async function handleCsvImportFile(file: File | undefined) {
    if (!file || !excelBulk?.onImportRows) return;
    const fileErr = validateSelectedFile(file, {
      allowedExtensions: [".csv"],
      maxBytes: CSV_MAX_BYTES,
      labelSw: "faili la CSV",
    });
    if (fileErr) {
      pushToast(fileErr, "error");
      return;
    }
    setImportBusy(true);
    try {
      const labels = excelBulk.columns.map((c) => c.label);
      const raw = await parseCsvData(file, labels);
      const keyed = mapLabelRowsToKeyRecords(raw, excelBulk.columns);
      const schemaErrors = validateKeyedExcelRows(
        keyed,
        excelBulk.columns.map((c) => c.key)
      );
      if (schemaErrors.length > 0) {
        pushToast(`Schema ya CSV si sahihi. ${schemaErrors[0]}`, "error");
        return;
      }
      if (!keyed.length) {
        pushToast("Hakuna safu zilizo na taarifa kwenye CSV.", "info");
        return;
      }
      const res = await excelBulk.onImportRows(keyed);
      pushToast(
        res.message ?? `CSV: ${res.ok} zimehifadhiwa, ${res.fail} zimeshindwa.`,
        res.fail > 0 && res.ok === 0 ? "error" : res.fail ? "info" : "success"
      );
    } catch (err) {
      reportError(err, "Pakia CSV");
    } finally {
      setImportBusy(false);
    }
  }

  async function exportPdf() {
    const headers = ["S/N", ...exportColumns.map((c) => c.label)];
    const body = sorted.map((row, i) => [
      i + 1,
      ...exportColumns.map((c) => exportCellValue(row, c)),
    ]);
    await exportTableToPdf(title, baseName, headers, body as (string | number)[][]);
  }

  function printTable() {
    const headers = ["S/N", ...exportColumns.map((c) => c.label)];
    const body = sorted.map((row, i) => [
      i + 1,
      ...exportColumns.map((c) => exportCellValue(row, c)),
    ]);
    openPrintableTable(title, headers, body as (string | number)[][]);
  }

  function detailCellValue(value: unknown): string | number {
    if (value == null || value === "") return "—";
    if (typeof value === "number") return value;
    if (typeof value === "string" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      return value.map((item) => detailCellValue(item)).join("\n") || "—";
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return "[object]";
      }
    }
    return String(value);
  }

  function buildDetailRows(row: T): (string | number)[][] {
    const seen = new Set<string>();
    const visible = exportColumns.map((c) => {
      seen.add(String(c.key));
      return [c.label, exportCellValue(row, c)] as (string | number)[];
    });
    const extra = Object.entries(row as Record<string, unknown>)
      .filter(([key]) => !seen.has(key) && key !== "id")
      .map(([key, value]) => [key, detailCellValue(value)] as (string | number)[]);
    return [["ID", row.id], ...visible, ...extra];
  }

  async function exportDetailPdf(row: T) {
    const safeId = row.id.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 80);
    await exportTableToPdf(`WASIFU WA REKODI - ${title}`, `${baseName}_${safeId}_profile`, ["Kipengele", "Maelezo"], buildDetailRows(row), {
      orientation: "portrait",
      subtitle: subtitle,
      description:
        "Taarifa hii ni nakala rasmi ya rekodi moja iliyotolewa kutoka KMT Portal kwa ajili ya ukaguzi, uhifadhi, uwasilishaji na matumizi ya kiutawala.",
      showSignatureLine: true,
    });
  }

  function printDetail(row: T) {
    openPrintableTable(`WASIFU WA REKODI - ${title}`, ["Kipengele", "Maelezo"], buildDetailRows(row), {
      subtitle,
      filterSummary: `Record ID: ${row.id}`,
    });
  }

  function clearFilters() {
    setQ("");
    setStatusFilter("ALL");
    setSortKey(null);
    setPage(1);
  }

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-lg font-bold text-[#0B1F3A]">{title}</h3>
          <p className="break-words text-sm font-medium leading-snug text-slate-700">{subtitle}</p>
        </div>
        <div className="flex w-full min-w-0 flex-shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:max-w-full lg:justify-end">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Tafuta..."
            className="min-w-[140px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner placeholder:text-slate-500 sm:min-w-[180px] lg:flex-none"
            aria-label="Tafuta kwenye jedwali"
          />
          {statusOptions && (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900"
            >
              <option value="ALL">Hali zote</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Safisha vichujio
          </button>
          {canAdd && onAdd && (
            <button
              type="button"
              onClick={onAdd}
              disabled={tableActionsLocked}
              className="rounded-xl bg-gradient-to-r from-blue-800 to-blue-950 px-4 py-2 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tableActionsLocked ? (deleteBusy ? "Inafuta…" : "Subiri…") : "Ongeza"}
            </button>
          )}
          {excelBulk ? (
            <>
              <button
                type="button"
                onClick={() => void downloadBlankTemplate()}
                title="Faili yenye Maelekezo + Data, safu tupu za kujaza"
                className="rounded-xl border border-amber-600 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"
              >
                Pakua blanki
              </button>
              {canExport && (
                <button
                  type="button"
                  onClick={() => void exportExcel()}
                  title="Hamisha data ya jedwali hili (iliyochujwa) kwenye Excel"
                  className="rounded-xl border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
                >
                  Excel orodha
                </button>
              )}
              {canExport && (
                <button
                  type="button"
                  onClick={() =>
                    downloadCsvDataExport(
                      excelBulk.templateBasename || baseName,
                      excelBulk.columns.map((c) => c.label),
                      sorted.map((row) => excelBulk.columns.map((c) => exportCellByKey(row, c.key)))
                    )
                  }
                  title="Hamisha data ya jedwali hili (iliyochujwa) kwenye CSV"
                  className="rounded-xl border border-cyan-600 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900"
                >
                  CSV orodha
                </button>
              )}
              {excelBulk.onImportRows && canAdd ? (
                <>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    aria-hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      void handleExcelImportFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    disabled={tableActionsLocked}
                    title="Chagua faili .xlsx iliyojazwa kwenye jalada Data"
                    className="rounded-xl border border-violet-600 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-950 disabled:opacity-50"
                  >
                    {importBusy ? "Inapakia…" : "Pakia Excel"}
                  </button>
                  <input
                    ref={csvImportInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    aria-hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      void handleCsvImportFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => csvImportInputRef.current?.click()}
                    disabled={tableActionsLocked}
                    title="Chagua faili .csv iliyojazwa kwa vichwa sawa"
                    className="rounded-xl border border-cyan-600 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900 disabled:opacity-50"
                  >
                    {importBusy ? "Inapakia…" : "Pakia CSV"}
                  </button>
                </>
              ) : null}
              {canExport && (
                <>
                  <button
                    type="button"
                    onClick={() => void exportPdf()}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={printTable}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    Chapisha
                  </button>
                </>
              )}
              <p className="basis-full mt-1 border-t border-slate-200 pt-2 text-[11px] leading-snug text-slate-700" role="note">
                {PORTAL_EXCEL_TABLE_HINT_SW}
              </p>
              {excelBulk ? (
                <button
                  type="button"
                  onClick={downloadBlankCsvTemplate}
                  className="rounded-xl border border-cyan-600 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900"
                >
                  Pakua CSV blanki
                </button>
              ) : null}
            </>
          ) : (
            canExport && (
              <>
                <button type="button" onClick={() => void exportExcel()} className="rounded-xl border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => void exportPdf()}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={printTable}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  Chapisha
                </button>
              </>
            )
          )}
        </div>
      </div>

      {tableActionsLocked && !isLoading ? (
        <p className="mt-2 text-xs font-medium text-amber-800" role="status">
          {deleteBusy
            ? "Inafuta rekodi…"
            : importBusy
              ? "Inapakia Excel — subiri hadi ujumbe wa matokeo uonekane."
              : "Fomu au kitendo kinachoendelea — vitendo vimefungwa kwa muda."}
        </p>
      ) : null}
      {isLoading ? (
        <div className="mt-6 animate-pulse space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-700">
          Inapakia...
        </div>
      ) : (
        <>
          <div className="mt-4 max-h-[min(70vh,52rem)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-inner [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 text-slate-900 shadow-[0_1px_0_0_rgba(15,23,42,0.08)]">
                <tr>
                  <th className="bg-slate-100 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">S/N</th>
                  {columns.map((c) => (
                    <th key={String(c.key)} className="bg-slate-100 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">
                      <button
                        type="button"
                        className={`max-w-full min-w-0 break-words text-left leading-relaxed text-slate-900 ${c.sortable === false ? "cursor-default" : "hover:underline"}`}
                        onClick={() => c.sortable !== false && toggleSort(String(c.key))}
                      >
                        {c.label}
                        {sortKey === String(c.key) ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                      </button>
                    </th>
                  ))}
                  <th className="bg-slate-100 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">Vitendo</th>
                </tr>
              </thead>
              <tbody className="bg-white text-slate-800">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-sm text-slate-700">
                      Hakuna rekodi kwa vigezo hivi. Badilisha tafuta au ongeza mpya.
                    </td>
                  </tr>
                ) : (
                  paged.map((row, idx) => {
                    const sn = (safePage - 1) * pageSize + idx + 1;
                    const hi = highlightRowId === row.id;
                    return (
                      <tr
                        key={row.id}
                        data-row-id={row.id}
                        className={`border-t border-slate-200 odd:bg-slate-50/90 hover:bg-blue-50/70 transition-colors duration-500 ${
                          hi ? "bg-amber-50 ring-2 ring-inset ring-amber-400" : ""
                        }`}
                      >
                        <td className="min-w-0 px-3 py-2.5 align-top tabular-nums leading-relaxed text-slate-700">{sn}</td>
                        {columns.map((c) => (
                          <td className="min-w-0 px-3 py-2.5 align-top leading-relaxed text-slate-800 [overflow-wrap:anywhere]" key={String(c.key)}>
                            {c.render
                              ? c.render(row)
                              : c.key === "status"
                              ? <StatusBadge status={(row as any)[c.key]} />
                              : String((row as any)[c.key] ?? "—")}
                          </td>
                        ))}
                        <td className="min-w-[10rem] max-w-[18rem] px-3 py-2.5 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={tableActionsLocked}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-900 disabled:opacity-50"
                              onClick={() => setViewRow(row)}
                              aria-label="Tazama maelezo kamili ya rekodi"
                            >
                              Tazama
                            </button>
                            {canEdit && onEdit && (
                              <button
                                type="button"
                                disabled={tableActionsLocked || !allowEditRow(row)}
                                title={!allowEditRow(row) ? SCOPE_TOOLTIP_SW : undefined}
                                aria-label={!allowEditRow(row) ? SCOPE_TOOLTIP_SW : "Hariri rekodi"}
                                onClick={() => onEdit(row)}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                              >
                                Hariri
                              </button>
                            )}
                            {canDelete && onDelete && (
                              <button
                                type="button"
                                disabled={tableActionsLocked || !allowDeleteRow(row)}
                                title={!allowDeleteRow(row) ? SCOPE_TOOLTIP_SW : undefined}
                                aria-label={!allowDeleteRow(row) ? SCOPE_TOOLTIP_SW : "Futa rekodi"}
                                onClick={() => setDeleteId(row.id)}
                                className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-50"
                              >
                                Futa
                              </button>
                            )}
                            {renderRowActionExtras ? renderRowActionExtras(row) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span>Ukurasa {safePage} / {totalPages}</span>
              <span className="text-slate-400">|</span>
              <label className="flex items-center gap-1">
                Safu kwa ukurasa
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-900"
                >
                  {[5, 10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-slate-400">|</span>
              <span>Jumla: {sorted.length}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Iliyopita
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Ifuatayo
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        open={!!deleteId}
        title={deleteConfirmTitle ?? "Thibitisha kufuta"}
        message={
          deleteConfirmMessage ??
          "Una uhakika unataka kufuta rekodi hii? Hatua hii haiwezi kutenduliwa kwa urahisi."
        }
        confirmLoading={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteId(null);
        }}
        onConfirm={async () => {
          if (!deleteId || !onDelete) {
            setDeleteId(null);
            return;
          }
          const id = deleteId;
          setDeleteBusy(true);
          try {
            await Promise.resolve(onDelete(id));
          } catch (err) {
            reportError(err, "Jedwali — futa");
          } finally {
            setDeleteBusy(false);
            setDeleteId(null);
          }
        }}
      />

      {viewRow && (
        <ModalScrollLayer onBackdropClick={() => setViewRow(null)} maxWidthClass="max-w-3xl">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Official Record Profile</p>
                <h4 className="text-lg font-bold text-[#0B1F3A]">Tazama rekodi</h4>
                <p className="text-sm text-slate-600">Nakala kamili inayoweza kuchapishwa au kupakuliwa PDF.</p>
              </div>
              {canExport ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void exportDetailPdf(viewRow)}
                    className="rounded-xl border border-[#D4AF37]/70 bg-amber-50 px-3 py-2 text-xs font-bold text-[#0B1F3A]"
                  >
                    PDF ya Rekodi
                  </button>
                  <button
                    type="button"
                    onClick={() => printDetail(viewRow)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    Chapisha Rekodi
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mt-4 max-h-[65vh] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[520px] text-sm">
                <tbody>
                  {buildDetailRows(viewRow).map(([label, value], idx) => (
                    <tr key={`${label}-${idx}`} className="border-t border-slate-200 odd:bg-slate-50">
                      <th className="w-44 px-3 py-2 text-left align-top text-xs font-bold uppercase tracking-wide text-[#0B1F3A]">
                        {label}
                      </th>
                      <td className="whitespace-pre-wrap break-words px-3 py-2 text-slate-800">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" className="rounded-lg bg-blue-900 px-4 py-2 text-sm text-white" onClick={() => setViewRow(null)}>
                Funga
              </button>
            </div>
          </div>
        </ModalScrollLayer>
      )}
    </section>
  );
}
