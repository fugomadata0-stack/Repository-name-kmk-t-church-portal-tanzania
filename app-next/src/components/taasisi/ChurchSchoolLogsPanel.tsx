import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Download, Upload } from "lucide-react";
import { ConfirmModal } from "../common/ConfirmModal";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { PremiumTable } from "../common/PremiumTable";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { validateSelectedFile } from "../../lib/fileUploadGuard";
import { stage2GradHeader } from "../../lib/stage2Theme";
import {
  deleteSchoolLog,
  fetchSchoolLogs,
  removeSchoolLogFileFromStorage,
  schoolLogFileName,
  schoolLogFileUrl,
  upsertSchoolLog,
  uploadSchoolLogFile,
} from "../../services/schoolLogsService";
import type { DomainEntityRecord } from "../../types";
import { GlassPanel } from "../stage2/Stage2Motion";

const ACCEPT = ".csv,.txt,.log,.pdf,.xlsx,.docx,text/plain,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const LOG_MAX_BYTES = 8 * 1024 * 1024;

function logExtOk(name: string) {
  const low = name.toLowerCase();
  return (
    low.endsWith(".csv") ||
    low.endsWith(".txt") ||
    low.endsWith(".log") ||
    low.endsWith(".pdf") ||
    low.endsWith(".xlsx") ||
    low.endsWith(".docx")
  );
}

export function ChurchSchoolLogsPanel(props: {
  highlightRecordId?: string | null;
  onCrudSuccess?: (
    action: "create" | "update" | "delete",
    meta: { moduleKey: string; submodule: string; recordId?: string }
  ) => void;
}) {
  const { reportError, pushToast, logAudit, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule } = usePortal();
  const canAdd = canPortalCreateModule("taasisi");
  const canEdit = canPortalEditModule("taasisi");
  const canDelete = canPortalDeleteModule("taasisi");

  const [rows, setRows] = useState<DomainEntityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DomainEntityRecord | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [status, setStatus] = useState<DomainEntityRecord["status"]>("Active");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    if (!getSupabase()) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchSchoolLogs();
      setRows(list);
    } catch (err) {
      reportError(err, "Log ya Shule — orodha");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setCategory("");
    setDetails("");
    setEventDate(new Date().toISOString().slice(0, 10));
    setStatus("Active");
    setFile(null);
    setModalOpen(true);
  };

  const openEdit = (r: DomainEntityRecord) => {
    setEditing(r);
    setTitle(String(r.title ?? ""));
    setCategory(r.category ?? "");
    setDetails(r.details ?? "");
    setEventDate(r.event_date ?? "");
    setStatus(r.status ?? "Active");
    setFile(null);
    setModalOpen(true);
  };

  const saveModal = async () => {
    if (!getSupabase()) return;
    const t = title.trim();
    if (!t) {
      pushToast("Kichwa kinahitajika.", "error");
      return;
    }
    if (!editing && !file) {
      pushToast("Chagua faili ya log.", "error");
      return;
    }
    setSaving(true);
    try {
      let fileUrl = editing ? schoolLogFileUrl(editing) : "";
      let fileName = editing ? schoolLogFileName(editing) : "";
      let mime = "";
      if (file) {
        if (!logExtOk(file.name)) {
          pushToast("Tumia CSV, TXT, LOG, PDF, XLSX au DOCX.", "error");
          setSaving(false);
          return;
        }
        const { publicUrl } = await uploadSchoolLogFile(file);
        const prev = editing ? schoolLogFileUrl(editing) : "";
        fileUrl = publicUrl;
        fileName = file.name;
        mime = file.type || "";
        if (prev && prev !== publicUrl) {
          await removeSchoolLogFileFromStorage(prev).catch(() => {});
        }
      }
      if (!fileUrl) {
        pushToast("Faili ya log inahitajika.", "error");
        setSaving(false);
        return;
      }
      const saved = await upsertSchoolLog({
        id: editing?.id,
        title: t,
        category,
        details,
        event_date: eventDate,
        status,
        file_url: fileUrl,
        file_name: fileName,
        mime,
      });
      setRows((prev) => (editing ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      void logAudit(editing ? "school_log_update" : "school_log_create", "portal_domain_entities", saved.id, { title: t });
      pushToast(editing ? "Log imesasishwa." : "Log imehifadhiwa.", "success");
      setModalOpen(false);
      props.onCrudSuccess?.(editing ? "update" : "create", {
        moduleKey: "taasisi",
        submodule: "Log ya Shule",
        recordId: saved.id,
      });
    } catch (err) {
      reportError(err, "Log ya Shule — hifadhi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!delId) return;
    const row = rows.find((x) => x.id === delId);
    if (!row) {
      setDelId(null);
      return;
    }
    try {
      await deleteSchoolLog(row);
      setRows((p) => p.filter((x) => x.id !== delId));
      void logAudit("school_log_delete", "portal_domain_entities", delId, {});
      pushToast("Log imefutwa.", "success");
      props.onCrudSuccess?.("delete", { moduleKey: "taasisi", submodule: "Log ya Shule", recordId: delId });
    } catch (err) {
      reportError(err, "Log ya Shule — futa");
    } finally {
      setDelId(null);
    }
  };

  const columns = useMemo(
    () => [
      { key: "title" as const, label: "Kichwa", sortable: true },
      { key: "category" as const, label: "Aina ya logu", sortable: true },
      { key: "event_date" as const, label: "Tarehe", sortable: true },
      {
        key: "extra" as const,
        label: "Faili",
        sortable: false,
        exportValue: (r: DomainEntityRecord) => schoolLogFileName(r) || schoolLogFileUrl(r) || "",
        render: (r: DomainEntityRecord) => {
          const url = schoolLogFileUrl(r);
          const fn = schoolLogFileName(r) || "pakua";
          if (!url)
            return <span className="text-xs text-slate-400">—</span>;
          return (
            <a
              href={url}
              download={fn}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3C5D] underline-offset-2 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Pakua
            </a>
          );
        },
      },
      { key: "status" as const, label: "Hali", sortable: true, filterValues: ["Active", "Archived", "Inactive"] },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <header className={`rounded-2xl border border-amber-200/80 p-6 text-white shadow-xl ${stage2GradHeader}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Taasisi • Shule</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <BookOpen className="h-7 w-7 text-amber-300" />
              Log ya shule ya kanisa
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-blue-100">
              Pakia na pakua faili za log (CSV, PDF, n.k.). Faili zihifadhiwa kwenye hifadhi salama; orodha iko hapa chini.
            </p>
          </div>
        </div>
      </header>

      <GlassPanel className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <Upload className="h-4 w-4 text-[#0B3C5D]" />
          <span>
            Tumia <strong className="text-slate-900">Ongeza</strong> kuweka log mpya, au <strong className="text-slate-900">Pakua</strong> kwenye jedwali
            kuchukua faili.
          </span>
        </div>
      </GlassPanel>

      <PremiumTable<DomainEntityRecord>
        title="Orodha ya log za shule"
        subtitle="Rekodi zinazounganishwa na faili kwenye hifadhi"
        rows={rows}
        columns={columns}
        onAdd={canAdd ? openCreate : undefined}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canDelete ? (id) => setDelId(id) : undefined}
        canAdd={canAdd}
        canEdit={canEdit}
        canDelete={canDelete}
        isLoading={loading}
        highlightRowId={props.highlightRecordId ?? null}
        exportBasename="shule_log_za_kanisa"
      />

      {modalOpen ? (
        <ModalScrollLayer onBackdropClick={() => setModalOpen(false)} maxWidthClass="max-w-lg">
          <div className="w-full rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{editing ? "Hariri log" : "Log mpya"}</h3>
            <div className="mt-3 grid gap-2">
              <label className="grid gap-1 text-xs font-medium text-slate-800">
                Kichwa *
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-800">
                Aina ya logu
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="mf. Mahudhurio, Matokeo, Ripoti ya wiki"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-800">
                Tarehe (ya kumbukumbu)
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-800">
                Maelezo
                <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-800">
                Faili ya log {editing ? "(badili — hiari)" : "(lazima)"}
                <input
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setFile(null);
                      return;
                    }
                    const err = validateSelectedFile(f, {
                      allowedExtensions: [".csv", ".txt", ".log", ".pdf", ".xlsx", ".docx"],
                      maxBytes: LOG_MAX_BYTES,
                      labelSw: "faili ya log",
                    });
                    if (err) {
                      pushToast(err, "error");
                      setFile(null);
                      e.currentTarget.value = "";
                      return;
                    }
                    setFile(f);
                  }}
                  className="text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-800">
                Hali
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DomainEntityRecord["status"])}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setModalOpen(false)} disabled={saving}>
                Ghairi
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveModal()}
                className="rounded-lg bg-orange-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Inahifadhi…" : "Hifadhi"}
              </button>
            </div>
          </div>
        </ModalScrollLayer>
      ) : null}

      <ConfirmModal
        open={!!delId}
        title="Futa log?"
        message="Faili litafutwa kwenye hifadhi na rekodi itaondolewa."
        confirmLabel="Futa"
        onCancel={() => setDelId(null)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
