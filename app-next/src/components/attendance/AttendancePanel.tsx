import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { PremiumTable } from "../common/PremiumTable";
import { usePortal } from "../../context/PortalContext";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { portalPremiumTableScope } from "../../lib/portalUiPersistence";
import { fetchChurchMembers } from "../../services/wauminiService";
import { fetchCascadeOptions } from "../../services/churchStructureService";
import {
  deleteAttendanceSession,
  fetchAttendanceRecords,
  fetchAttendanceSessions,
  replaceAttendanceRecords,
  upsertAttendanceSession,
} from "../../services/attendanceService";
import type { AttendanceMemberRecord, AttendanceSessionRecord, ChurchMemberRecord, ChurchStructureEntity } from "../../types";

const ATTENDANCE_TYPES = [
  "Ibada ya Jumapili",
  "Ibada za wiki",
  "Matukio",
  "Kwaya",
  "Vijana",
  "Kina Mama",
  "Idara/Huduma",
  "Mafunzo/Seminars",
];

export function AttendancePanel() {
  const { pushToast, reportError, canPortalCreateModule, canPortalEditModule, canPortalDeleteModule, canPortalExportModule } = usePortal();
  const [rows, setRows] = useState<AttendanceSessionRecord[]>([]);
  const [members, setMembers] = useState<ChurchMemberRecord[]>([]);
  const [structure, setStructure] = useState<{ dayosisi: ChurchStructureEntity[]; majimbo: ChurchStructureEntity[]; matawi: ChurchStructureEntity[] }>({
    dayosisi: [],
    majimbo: [],
    matawi: [],
  });
  const [draft, setDraft] = useState<AttendanceSessionRecord | null>(null);
  const [memberRows, setMemberRows] = useState<AttendanceMemberRecord[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const shared = {
    canAdd: canPortalCreateModule("attendance"),
    canEdit: canPortalEditModule("attendance"),
    canDelete: canPortalDeleteModule("attendance"),
    canExport: canPortalExportModule("attendance"),
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m, c] = await Promise.all([fetchAttendanceSessions(), fetchChurchMembers(), fetchCascadeOptions()]);
      setRows(s);
      setMembers(m);
      setStructure({ dayosisi: c.dayosisi, majimbo: c.majimbo, matawi: c.matawi });
    } catch (e) {
      reportError(e, "Mahudhurio — pakua");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members.slice(0, 80);
    return members.filter((m) => `${m.jina_kamili} ${m.member_number ?? ""}`.toLowerCase().includes(q)).slice(0, 120);
  }, [members, memberSearch]);

  async function openEdit(row: AttendanceSessionRecord) {
    setDraft(row);
    try {
      setMemberRows(await fetchAttendanceRecords(row.id));
    } catch {
      setMemberRows([]);
    }
  }

  async function save(form: FormData) {
    if (!draft) return;
    const payload: Partial<AttendanceSessionRecord> & { service_name: string; attendance_date: string } = {
      id: draft.id,
      attendance_date: String(form.get("attendance_date") ?? ""),
      service_name: String(form.get("service_name") ?? "").trim(),
      attendance_type: String(form.get("attendance_type") ?? "Ibada ya Jumapili"),
      dayosisi_id: String(form.get("dayosisi_id") ?? "") || null,
      jimbo_id: String(form.get("jimbo_id") ?? "") || null,
      tawi_id: String(form.get("tawi_id") ?? "") || null,
      idara_name: String(form.get("idara_name") ?? "") || null,
      huduma_name: String(form.get("huduma_name") ?? "") || null,
      jumuiya_name: String(form.get("jumuiya_name") ?? "") || null,
      total_men: Number(form.get("total_men") ?? 0),
      total_women: Number(form.get("total_women") ?? 0),
      total_youth: Number(form.get("total_youth") ?? 0),
      total_children: Number(form.get("total_children") ?? 0),
      visitors: Number(form.get("visitors") ?? 0),
      recorded_by: String(form.get("recorded_by") ?? "") || null,
      notes: String(form.get("notes") ?? "") || null,
      status: "Active",
    };
    if (!payload.service_name || !payload.attendance_date) {
      pushToast("Jaza taarifa muhimu.", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertAttendanceSession(payload);
      await replaceAttendanceRecords(
        saved.id,
        memberRows.map((r) => ({
          member_id: r.member_id,
          member_name: r.member_name,
          attendance_status: r.attendance_status,
          qr_code: r.qr_code,
          notes: r.notes,
        }))
      );
      pushToast("Mahudhurio yamehifadhiwa.", "success");
      dispatchPortalReloadMetrics();
      setDraft(null);
      await load();
    } catch (e) {
      reportError(e, "Mahudhurio — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "attendance_date", label: "Tarehe", sortable: true },
    { key: "service_name", label: "Huduma/Tukio", sortable: true },
    { key: "attendance_type", label: "Aina", sortable: true },
    { key: "total_attendance", label: "Jumla", sortable: true },
    { key: "visitors", label: "Wageni", sortable: true },
    { key: "recorded_by", label: "Aliyeandika", sortable: false },
  ];

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#0B1F3A] to-[#123C69] p-5 text-white">
        <h2 className="text-2xl font-bold">Mahudhurio na ushiriki wa ibada</h2>
        <p className="mt-1 text-sm text-slate-200">Mahudhurio ya ibada, matukio, idara na historia ya washiriki.</p>
      </header>
      <PremiumTable
        title="Mahudhurio"
        subtitle="Ibada, matukio na ushiriki wa waumini"
        persistenceScope={portalPremiumTableScope(["attendance", "Mahudhurio", "sessions"])}
        rows={rows}
        columns={columns}
        isLoading={loading}
        onAdd={shared.canAdd ? () => setDraft({ id: "", attendance_date: "", service_name: "", attendance_type: "Ibada ya Jumapili", total_men: 0, total_women: 0, total_youth: 0, total_children: 0, visitors: 0, total_attendance: 0, status: "Active" }) : undefined}
        onEdit={shared.canEdit ? (r) => void openEdit(r) : undefined}
        onDelete={
          shared.canDelete
            ? async (id) => {
                try {
                  await deleteAttendanceSession(id);
                  pushToast("Imefutwa.", "success");
                  dispatchPortalReloadMetrics();
                  await load();
                } catch (e) {
                  reportError(e, "Mahudhurio — futa");
                }
              }
            : undefined
        }
        exportBasename="KMKT_Attendance_Report"
        {...shared}
      />
      {draft ? (
        <ModalScrollLayer onBackdropClick={() => setDraft(null)} maxWidthClass="max-w-5xl">
          <form
            className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              void save(new FormData(e.currentTarget));
            }}
          >
            <h3 className="text-lg font-bold text-[#0B1F3A]">{draft.id ? "Hariri kikao cha mahudhurio" : "Kikao kipya cha mahudhurio"}</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <input name="attendance_date" type="date" defaultValue={draft.attendance_date} className="rounded-lg border px-3 py-2 text-sm" />
              <input name="service_name" defaultValue={draft.service_name} placeholder="Jina la ibada / tukio" className="rounded-lg border px-3 py-2 text-sm" />
              <select name="attendance_type" defaultValue={draft.attendance_type} className="rounded-lg border px-3 py-2 text-sm">
                {ATTENDANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select name="dayosisi_id" defaultValue={draft.dayosisi_id ?? ""} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Dayosisi</option>
                {structure.dayosisi.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <select name="jimbo_id" defaultValue={draft.jimbo_id ?? ""} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Jimbo</option>
                {structure.majimbo.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <select name="tawi_id" defaultValue={draft.tawi_id ?? ""} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Tawi/Kituo</option>
                {structure.matawi.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <input name="idara_name" defaultValue={draft.idara_name ?? ""} placeholder="Idara" className="rounded-lg border px-3 py-2 text-sm" />
              <input name="huduma_name" defaultValue={draft.huduma_name ?? ""} placeholder="Huduma" className="rounded-lg border px-3 py-2 text-sm" />
              <input name="jumuiya_name" defaultValue={draft.jumuiya_name ?? ""} placeholder="Jumuiya" className="rounded-lg border px-3 py-2 text-sm" />
              <input name="total_men" type="number" min={0} defaultValue={draft.total_men} placeholder="Wanaume" className="rounded-lg border px-3 py-2 text-sm" />
              <input name="total_women" type="number" min={0} defaultValue={draft.total_women} placeholder="Wanawake" className="rounded-lg border px-3 py-2 text-sm" />
              <input name="total_youth" type="number" min={0} defaultValue={draft.total_youth} placeholder="Vijana" className="rounded-lg border px-3 py-2 text-sm" />
              <input name="total_children" type="number" min={0} defaultValue={draft.total_children} placeholder="Watoto" className="rounded-lg border px-3 py-2 text-sm" />
              <input name="visitors" type="number" min={0} defaultValue={draft.visitors} placeholder="Wageni" className="rounded-lg border px-3 py-2 text-sm" />
              <input name="recorded_by" defaultValue={draft.recorded_by ?? ""} placeholder="Aliyeandika" className="rounded-lg border px-3 py-2 text-sm" />
              <textarea name="notes" defaultValue={draft.notes ?? ""} placeholder="Maelezo" className="rounded-lg border px-3 py-2 text-sm md:col-span-3" rows={2} />
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <h4 className="text-sm font-semibold text-[#0B1F3A]">Mahudhurio kwa kila mwanachama</h4>
              <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Tafuta mwanachama…" className="mt-2 w-full rounded-lg border px-3 py-2 text-sm" />
              <div className="mt-2 max-h-56 overflow-auto space-y-1">
                {filteredMembers.map((m) => {
                  const existing = memberRows.find((x) => x.member_id === m.id);
                  const status = existing?.attendance_status ?? "absent";
                  return (
                    <div key={m.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                      <span>{m.jina_kamili}</span>
                      <select
                        value={status}
                        onChange={(e) => {
                          const v = e.target.value as "present" | "absent";
                          setMemberRows((prev) => {
                            const other = prev.filter((x) => x.member_id !== m.id);
                            return [...other, { id: existing?.id ?? `${m.id}`, member_id: m.id, member_name: m.jina_kamili, session_id: draft.id, attendance_status: v }];
                          });
                        }}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="present">Amefika</option>
                        <option value="absent">Hajafika</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className="rounded-lg border px-3 py-2 text-sm">
                Ghairi
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-[#0B1F3A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Inahifadhi..." : "Hifadhi"}
              </button>
            </div>
          </form>
        </ModalScrollLayer>
      ) : null}
    </div>
  );
}
