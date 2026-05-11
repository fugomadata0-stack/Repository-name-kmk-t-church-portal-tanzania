import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { PremiumTable } from "../common/PremiumTable";
import { usePortal } from "../../context/PortalContext";
import { GENERIC_MODULE_EXCEL } from "../../lib/excelModuleFormSpecs";
import { bulkImportGenericRows } from "../../lib/portalExcelBulkHandlers";
import { safeLower } from "../../lib/safe";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";

export interface GenericRow extends Record<string, string | number | undefined> {
  id: string;
  status?: string;
  title: string;
  category: string;
  notes: string;
}

interface Props {
  moduleKey: string;
  submodule: string;
  title?: string;
}

function mkId() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function GenericModuleView({ moduleKey, submodule, title }: Props) {
  const { logAudit, pushToast, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule, canPortalExportModule } =
    usePortal();
  const [rows, setRows] = useState<GenericRow[]>([]);
  const [editing, setEditing] = useState<GenericRow | null>(null);
  const [err, setErr] = useState("");

  const persist = useCallback((next: GenericRow[]) => {
    setRows(next);
  }, []);

  const heading = title || `${moduleKey} · ${submodule}`;

  const shared = useMemo(
    () => ({
      canAdd: canPortalCreateModule(moduleKey),
      canEdit: canPortalEditModule(moduleKey),
      canDelete: canPortalDeleteModule(moduleKey),
      canExport: canPortalExportModule(moduleKey),
    }),
    [moduleKey, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule, canPortalExportModule]
  );

  function validate(payload: Partial<GenericRow>) {
    const t = String(payload.title ?? "").trim();
    if (!t) return "Jaza Kichwa / title.";
    const dup = rows.some((r) => safeLower(r.title) === safeLower(t) && r.id !== editing?.id);
    if (dup) return "Kuna rekodi nyingine yenye kichwa sawa.";
    return "";
  }

  function onSave(payload: Partial<GenericRow>): boolean {
    const e = validate(payload);
    if (e) {
      setErr(e);
      pushToast(e, "error");
      return false;
    }
    setErr("");
    if (editing?.id) {
      persist(
        rows.map((r) =>
          r.id === editing.id
            ? {
                ...r,
                ...payload,
                title: String(payload.title ?? r.title).trim(),
                category: String(payload.category ?? r.category).trim(),
                notes: String(payload.notes ?? r.notes).trim(),
                status: String(payload.status ?? r.status ?? "Active"),
              }
            : r
        )
      );
      void logAudit("generic_update", `${moduleKey}/${submodule}`, editing.id, payload);
    } else {
      const row: GenericRow = {
        id: mkId(),
        title: String(payload.title).trim(),
        category: String(payload.category ?? "Jumla").trim(),
        notes: String(payload.notes ?? "").trim(),
        status: String(payload.status ?? "Active"),
      };
      persist([row, ...rows]);
      void logAudit("generic_create", `${moduleKey}/${submodule}`, row.id, row);
    }
    setEditing(null);
    pushToast("Rekodi imehifadhiwa.", "success");
    return true;
  }

  return (
    <div className="space-y-3">
      {err ? <p className="text-sm text-rose-600">{err}</p> : null}
      <PremiumTable<GenericRow>
        title={heading}
        subtitle="Jedwali la kitaalamu: tafuta, chuja, panga, ukurasa, nakala, PDF, Excel, maelezo."
        persistenceScope={portalPremiumTableScope([moduleKey, submodule, "generic"])}
        rows={rows}
        columns={[
          { key: "title", label: "Kichwa", sortable: true },
          { key: "category", label: "Kategoria", sortable: true },
          {
            key: "status",
            label: "Hali",
            sortable: true,
            filterValues: ["Active", "Pending", "Archived", "Draft"],
          },
          { key: "notes", label: "Maelezo" },
        ]}
        exportBasename={`${moduleKey}_${submodule}`.replace(/\s+/g, "_")}
        excelBulk={{
          specTitle: GENERIC_MODULE_EXCEL.specTitle,
          specSubtitle: GENERIC_MODULE_EXCEL.specSubtitle,
          templateBasename: `${moduleKey}_${submodule}`.replace(/\s+/g, "_") || GENERIC_MODULE_EXCEL.templateBasename,
          columns: GENERIC_MODULE_EXCEL.columns,
          instructionRows: GENERIC_MODULE_EXCEL.instructionRows,
          onImportRows: shared.canAdd
            ? async (recs) => {
                const r = await bulkImportGenericRows(
                  recs,
                  setRows as Dispatch<SetStateAction<{ id: string; title: string; category: string; notes: string; status: string }[]>>,
                  rows.map((x) => ({ id: x.id, title: x.title }))
                );
                return {
                  ok: r.ok,
                  fail: r.fail,
                  message: `Excel: ${r.ok} zimehifadhiwa; ${r.fail} zimeshindwa.`,
                };
              }
            : undefined,
        }}
        onAdd={shared.canAdd ? () => setEditing({ id: "", title: "", category: "", notes: "", status: "Pending" }) : undefined}
        onEdit={
          shared.canEdit
            ? (row) => {
                setErr("");
                setEditing(row);
              }
            : undefined
        }
        onDelete={shared.canDelete ? (id) => persist(rows.filter((r) => r.id !== id)) : undefined}
        canAdd={shared.canAdd}
        canEdit={shared.canEdit}
        canDelete={shared.canDelete}
        canExport={shared.canExport}
      />

      {editing && (
        <RecordDrawer
          initial={editing.id ? editing : undefined}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function RecordDrawer({
  initial,
  onClose,
  onSave,
}: {
  initial?: GenericRow;
  onClose: () => void;
  onSave: (p: Partial<GenericRow>) => boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [status, setStatus] = useState(initial?.status ?? "Active");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setCategory(initial?.category ?? "");
    setNotes(initial?.notes ?? "");
    setStatus(initial?.status ?? "Active");
  }, [initial]);

  return (
    <ModalScrollLayer onBackdropClick={onClose} maxWidthClass="max-w-lg">
      <div className="w-full rounded-2xl border border-amber-200 bg-[#fefdfb] p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-[#0f1e46]">{initial?.id ? "Hariri Rekodi" : "Ongeza Rekodi"}</h3>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Kichwa *
            <input required className="rounded-xl border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Kategoria
            <input className="rounded-xl border px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Maelezo
            <textarea className="min-h-[88px] rounded-xl border px-3 py-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Hali
            <select className="rounded-xl border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Active</option>
              <option>Pending</option>
              <option>Draft</option>
              <option>Archived</option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={onClose} disabled={submitting}>
            Ghairi
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={() => {
              setTitle("");
              setCategory("");
              setNotes("");
              setStatus("Pending");
            }}
            disabled={submitting}
          >
            Safisha
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={submitting}
            onClick={() => {
              setSubmitting(true);
              try {
                onSave({ title, category, notes, status });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Hifadhi
          </button>
        </div>
      </div>
    </ModalScrollLayer>
  );
}
