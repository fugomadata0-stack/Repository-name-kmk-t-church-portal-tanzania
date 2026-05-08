import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, Eye } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { entryIsoInSameCalendarMonth } from "../../lib/tzDates";
import { formatMoneyTz } from "../../lib/money";
import { fetchAidRequestsJoined, normalizeAidRequestRow, upsertAidRequest } from "../../services/aidManagementService";
import { upsertIncomeLine } from "../../services/incomeModuleService";
import { upsertFinanceEntry } from "../../services/financeEntriesService";
import type { AidRequestJoinedRow, FedhaRecord, IncomeManagementRecord } from "../../types";
import { safeLower } from "../../lib/safe";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { SUPABASE_QUERY_ERROR_SW } from "../../lib/supabaseUiMessages";
import { GradientKpiCard } from "../common/GradientKpiCard";

function badgeIncome(status: string) {
  const s = safeLower(status);
  if (s.includes("approved") || s.includes("posted") || s.includes("locked")) return "bg-emerald-100 text-emerald-900 ring-emerald-300";
  if (s.includes("reverse") || s.includes("cancel")) return "bg-red-100 text-red-900 ring-red-300";
  if (s.includes("submit") || s.includes("verified") || s.includes("draft")) return "bg-orange-100 text-orange-900 ring-orange-300";
  return "bg-slate-100 text-slate-800 ring-slate-200";
}

function badgeAid(status: string) {
  if (status === "approved" || status === "completed") return "bg-emerald-100 text-emerald-900 ring-emerald-300";
  if (status === "rejected") return "bg-red-100 text-red-900 ring-red-300";
  if (status === "review") return "bg-sky-100 text-sky-900 ring-sky-300";
  if (status === "submitted" || status === "draft") return "bg-orange-100 text-orange-900 ring-orange-300";
  return "bg-slate-100 text-slate-800 ring-slate-200";
}

function badgeFedha(status: string) {
  const s = safeLower(status);
  if (s.includes("active") || s.includes("approved")) return "bg-emerald-100 text-emerald-900 ring-emerald-300";
  if (s.includes("pending")) return "bg-orange-100 text-orange-900 ring-orange-300";
  return "bg-slate-100 text-slate-800 ring-slate-200";
}

interface Props {
  incomeManagement: IncomeManagementRecord[];
  fedha: FedhaRecord[];
}

export function PendingApprovalsDashboard(props: Props) {
  const { reportError, pushToast, authUser, canPortalEditModule } = usePortal();
  const canIncome = canPortalEditModule("mapato_income");
  const canFedha = canPortalEditModule("fedha");
  const canAid = canPortalEditModule("aid_management");

  const [aidRows, setAidRows] = useState<AidRequestJoinedRow[]>([]);
  const [aidLoading, setAidLoading] = useState(true);
  const [aidLoadError, setAidLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ kind: "income" | "aid" | "fedha"; id: string; action: "approve" | "reject" } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [detailRow, setDetailRow] = useState<{ title: string; body: string } | null>(null);

  const loadAid = useCallback(async () => {
    if (!getSupabase()) {
      setAidRows([]);
      setAidLoadError(null);
      setAidLoading(false);
      return;
    }
    setAidLoading(true);
    setAidLoadError(null);
    try {
      const raw = await fetchAidRequestsJoined();
      setAidRows(raw.map((x) => normalizeAidRequestRow(x)));
    } catch (e) {
      reportError(e, "Vibali — misaada");
      setAidRows([]);
      setAidLoadError(SUPABASE_QUERY_ERROR_SW);
    } finally {
      setAidLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void loadAid();
  }, [loadAid]);

  const approverLabel = useMemo(() => {
    const em = authUser?.email?.trim();
    return em || authUser?.id?.slice(0, 8) || "—";
  }, [authUser]);

  const incomePending = useMemo(
    () => props.incomeManagement.filter((r) => ["Submitted", "Verified", "Draft"].includes(r.status)),
    [props.incomeManagement]
  );
  const incomeApprovedMonth = useMemo(
    () =>
      props.incomeManagement.filter(
        (r) => r.status === "Approved" && r.collectionDate && entryIsoInSameCalendarMonth(r.collectionDate.slice(0, 10))
      ).length,
    [props.incomeManagement]
  );
  const incomeRejectedMonth = useMemo(
    () =>
      props.incomeManagement.filter(
        (r) =>
          r.status === "Reversed / Cancelled" &&
          r.collectionDate &&
          entryIsoInSameCalendarMonth(r.collectionDate.slice(0, 10))
      ).length,
    [props.incomeManagement]
  );

  const fedhaPending = useMemo(() => props.fedha.filter((r) => r.status === "Pending"), [props.fedha]);

  const aidPending = useMemo(
    () => aidRows.filter((r) => ["draft", "submitted", "review"].includes(r.status)),
    [aidRows]
  );
  const aidApprovedMonth = useMemo(
    () =>
      aidRows.filter(
        (r) =>
          r.status === "approved" &&
          r.approved_at &&
          entryIsoInSameCalendarMonth(String(r.approved_at).slice(0, 10))
      ).length,
    [aidRows]
  );
  const aidRejectedMonth = useMemo(
    () =>
      aidRows.filter(
        (r) =>
          r.status === "rejected" &&
          r.updated_at &&
          entryIsoInSameCalendarMonth(String(r.updated_at).slice(0, 10))
      ).length,
    [aidRows]
  );

  const totalPending = incomePending.length + fedhaPending.length + aidPending.length;

  const reloadParent = () => {
    window.dispatchEvent(new Event("kmt-portal-reload-metrics"));
  };

  const runIncomeAction = async (row: IncomeManagementRecord, action: "approve" | "reject", notes: string) => {
    if (!canIncome) {
      pushToast("Huna ruhusa ya kuidhinisha mapato.", "error");
      return;
    }
    setBusyId(`inc-${row.id}`);
    try {
      const next =
        action === "approve"
          ? {
              ...row,
              status: "Approved" as const,
              approvedBy: approverLabel,
              remarks: notes.trim() ? `${row.remarks || ""}\n[Idhini] ${notes}`.trim() : row.remarks,
            }
          : {
              ...row,
              status: "Reversed / Cancelled" as const,
              remarks: `Kataliwa: ${notes.trim() || "—"}`.slice(0, 4000),
            };
      await upsertIncomeLine(next);
      pushToast(action === "approve" ? "Mstari wa mapato umeidhinishwa." : "Mstari wa mapato umekataliwa.", "success");
      reloadParent();
    } catch (e) {
      reportError(e, "Mapato — idhini");
      pushToast("Hatua imeshindikana.", "error");
    } finally {
      setBusyId(null);
      setNoteModal(null);
      setNoteText("");
    }
  };

  const runFedhaAction = async (row: FedhaRecord, action: "approve" | "reject", _notes: string) => {
    if (!canFedha) {
      pushToast("Huna ruhusa ya kuidhinisha fedha.", "error");
      return;
    }
    setBusyId(`fed-${row.id}`);
    try {
      await upsertFinanceEntry({
        ...row,
        status: action === "approve" ? "Active" : "Archived",
      });
      pushToast(action === "approve" ? "Miamala imeidhinishwa." : "Miamala imekataliwa/kuundwa isiyo hai.", "success");
      reloadParent();
    } catch (e) {
      reportError(e, "Fedha — idhini");
      pushToast("Hatua imeshindikana.", "error");
    } finally {
      setBusyId(null);
      setNoteModal(null);
      setNoteText("");
    }
  };

  const runAidAction = async (row: AidRequestJoinedRow, action: "approve" | "reject", notes: string) => {
    if (!canAid) {
      pushToast("Huna ruhusa ya msaada.", "error");
      return;
    }
    setBusyId(`aid-${row.id}`);
    try {
      const today = new Date().toISOString();
      await upsertAidRequest({
        id: row.id,
        beneficiary_id: row.beneficiary_id,
        aid_type: row.aid_type,
        description: row.description,
        amount: row.amount,
        items: row.items,
        urgency_level: row.urgency_level,
        request_date: row.request_date,
        request_month: row.request_month,
        status: action === "approve" ? "approved" : "rejected",
        reviewed_by: row.reviewed_by,
        review_notes: row.review_notes,
        review_date: row.review_date,
        approved_by: action === "approve" ? approverLabel : row.approved_by,
        approved_signature: row.approved_signature,
        approval_notes: notes.trim() ? `${row.approval_notes ? `${row.approval_notes}\n` : ""}${notes}`.trim() : row.approval_notes,
        approved_at: action === "approve" ? today : row.approved_at,
        approval_status: action === "approve" ? "approved" : "rejected",
        completed_at: row.completed_at,
      });
      pushToast(action === "approve" ? "Ombi la msaada limeidhinishwa." : "Ombi la msaada limekataliwa.", "success");
      await loadAid();
      reloadParent();
    } catch (e) {
      reportError(e, "Misaada — idhini");
      pushToast("Hatua imeshindikana.", "error");
    } finally {
      setBusyId(null);
      setNoteModal(null);
      setNoteText("");
    }
  };

  const submitNote = async () => {
    if (!noteModal) return;
    const notes = noteText.trim();
    if (noteModal.action === "reject" && notes.length < 2) {
      pushToast("Andika sababu fupi ya kukataa.", "error");
      return;
    }
    if (noteModal.kind === "income") {
      const row = props.incomeManagement.find((r) => r.id === noteModal.id);
      if (row) await runIncomeAction(row, noteModal.action, notes);
      return;
    }
    if (noteModal.kind === "fedha") {
      const row = props.fedha.find((r) => r.id === noteModal.id);
      if (row) await runFedhaAction(row, noteModal.action, notes);
      return;
    }
    const row = aidRows.find((r) => r.id === noteModal.id);
    if (row) await runAidAction(row, noteModal.action, notes);
  };

  const kpis = [
    ["Jumla foleni", totalPending, "from-rose-600 to-rose-800"],
    ["Mapato yanayosubiri", incomePending.length, "from-amber-500 to-orange-700"],
    ["Misaada yanayosubiri", aidPending.length, "from-teal-600 to-emerald-800"],
    ["Fedha inayosubiri", fedhaPending.length, "from-green-600 to-emerald-700"],
    ["Idhinishwa mwezi huu (mapato)", incomeApprovedMonth, "from-emerald-600 to-teal-800"],
    ["Kataliwa mwezi huu (mapato)", incomeRejectedMonth, "from-red-600 to-rose-800"],
    ["Idhinishwa mwezi huu (misaada)", aidApprovedMonth, "from-cyan-600 to-blue-800"],
    ["Kataliwa mwezi huu (misaada)", aidRejectedMonth, "from-orange-600 to-red-800"],
  ] as const;

  return (
    <div className="space-y-6" role="region" aria-label="Dashibodi ya idhini">
      <header className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-[#0a1628] to-[#1e3a6e] p-5 text-white shadow-lg">
        <h1 className="text-xl font-bold">Vibali vinavyosubiri</h1>
        <p className="mt-1 text-sm text-blue-100">
          Mapato, misaada, na miamala ya fedha — idhini kwa kiwango cha ruhusa yako (RBAC). Data halisi kutoka Supabase.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Vipimo vya idhini">
        {kpis.map(([title, value, g]) => (
          <GradientKpiCard key={title} title={title} value={value} gradient={g} />
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ClipboardList className="h-4 w-4" aria-hidden />
            Mapato — yanayosubiri idhini
          </h2>
        </div>
        <div className="mt-3 overflow-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
              <tr>
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Chanzo</th>
                <th className="px-2 py-2">Kiasi</th>
                <th className="px-2 py-2">Hali</th>
                <th className="px-2 py-2">Idhinishwa na</th>
                <th className="px-2 py-2 w-40">Vitendo</th>
              </tr>
            </thead>
            <tbody>
              {incomePending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    Hakuna mistari ya mapato yanayosubiri.
                  </td>
                </tr>
              ) : (
                incomePending.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 font-mono">{r.incomeCode}</td>
                    <td className="px-2 py-2">{r.sourceName}</td>
                    <td className="px-2 py-2 font-semibold tabular-nums">TZS {r.amount.toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeIncome(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{r.approvedBy || "—"}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={!canIncome || !!busyId}
                          className="rounded-lg bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                          onClick={() => setNoteModal({ kind: "income", id: r.id, action: "approve" })}
                        >
                          {busyId === `inc-${r.id}` ? (
                            <Loader2 className="inline h-3 w-3 animate-spin" aria-hidden />
                          ) : (
                            <CheckCircle2 className="inline h-3 w-3" aria-hidden />
                          )}{" "}
                          Idhinisha
                        </button>
                        <button
                          type="button"
                          disabled={!canIncome || busyId === `inc-${r.id}`}
                          className="rounded-lg bg-red-700 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                          onClick={() => setNoteModal({ kind: "income", id: r.id, action: "reject" })}
                        >
                          Kataa
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[10px]"
                          onClick={() =>
                            setDetailRow({
                              title: `Mapato ${r.incomeCode}`,
                              body: JSON.stringify(r, null, 2),
                            })
                          }
                        >
                          <Eye className="inline h-3 w-3" /> Maelezo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold text-slate-900">Misaada — maombi yanayosubiri</h2>
        <SupabaseListFeedback loading={aidLoading} loadError={aidLoadError} isEmpty={false} />
        {aidLoading ? (
          <div className="flex min-h-[120px] items-center justify-center gap-2 text-slate-500" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            Inapakia misaada…
          </div>
        ) : aidLoadError ? null : (
          <div className="mt-3 overflow-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                <tr>
                  <th className="px-2 py-2">Tarehe</th>
                  <th className="px-2 py-2">Maelezo</th>
                  <th className="px-2 py-2">Kiasi</th>
                  <th className="px-2 py-2">Hali</th>
                  <th className="px-2 py-2">Idhinishwa na</th>
                  <th className="px-2 py-2 w-40">Vitendo</th>
                </tr>
              </thead>
              <tbody>
                {aidPending.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      Hakuna maombi yanayosubiri.
                    </td>
                  </tr>
                ) : (
                  aidPending.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-2 py-2 tabular-nums">{String(r.request_date).slice(0, 10)}</td>
                      <td className="max-w-[200px] truncate px-2 py-2">{r.description}</td>
                      <td className="px-2 py-2 font-semibold">{formatMoneyTz(r.amount)}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeAid(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{r.approved_by || "—"}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={!canAid || busyId === `aid-${r.id}`}
                            className="rounded-lg bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                            onClick={() => setNoteModal({ kind: "aid", id: r.id, action: "approve" })}
                          >
                            Idhinisha
                          </button>
                          <button
                            type="button"
                            disabled={!canAid || busyId === `aid-${r.id}`}
                            className="rounded-lg bg-red-700 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                            onClick={() => setNoteModal({ kind: "aid", id: r.id, action: "reject" })}
                          >
                            Kataa
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border px-2 py-1 text-[10px]"
                            onClick={() =>
                              setDetailRow({
                                title: `Msaada ${r.id.slice(0, 8)}`,
                                body: JSON.stringify(r, null, 2),
                              })
                            }
                          >
                            Maelezo
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold text-slate-900">Fedha — miamala inayosubiri</h2>
        <div className="mt-3 overflow-auto rounded-lg border">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
              <tr>
                <th className="px-2 py-2">Tarehe</th>
                <th className="px-2 py-2">Kategoria</th>
                <th className="px-2 py-2">Kiasi</th>
                <th className="px-2 py-2">Hali</th>
                <th className="px-2 py-2 w-36">Vitendo</th>
              </tr>
            </thead>
            <tbody>
              {fedhaPending.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Hakuna miamala ya fedha yenye hali Pending.
                  </td>
                </tr>
              ) : (
                fedhaPending.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 tabular-nums">{String(r.tarehe).slice(0, 10)}</td>
                    <td className="px-2 py-2">{r.kategoria}</td>
                    <td className="px-2 py-2 font-semibold tabular-nums">TZS {formatMoneyTz(r.kiasi)}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeFedha(String(r.status))}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={!canFedha || busyId === `fed-${r.id}`}
                          className="rounded-lg bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                          onClick={() => setNoteModal({ kind: "fedha", id: r.id, action: "approve" })}
                        >
                          Idhinisha
                        </button>
                        <button
                          type="button"
                          disabled={!canFedha || busyId === `fed-${r.id}`}
                          className="rounded-lg bg-red-700 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                          onClick={() => setNoteModal({ kind: "fedha", id: r.id, action: "reject" })}
                        >
                          Kataa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {noteModal ? (
        <ModalScrollLayer onBackdropClick={() => !busyId && setNoteModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
            <h3 className="text-lg font-bold text-slate-900">
              {noteModal.action === "approve" ? "Idhinisha" : "Kataa"} — maelezo
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {noteModal.action === "reject" ? "Andika sababu (inahitajika)." : "Maelezo ya ziada (si lazima)."}
            </p>
            <textarea
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={!!busyId} className="rounded-lg border px-3 py-2 text-sm" onClick={() => setNoteModal(null)}>
                Ghairi
              </button>
              <button
                type="button"
                disabled={!!busyId}
                className="rounded-lg bg-[#0B3C5D] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void submitNote()}
              >
                {busyId ? "Inachakata…" : "Thibitisha"}
              </button>
            </div>
          </div>
        </ModalScrollLayer>
      ) : null}

      {detailRow ? (
        <ModalScrollLayer onBackdropClick={() => setDetailRow(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl border bg-white p-4 shadow-2xl">
            <h3 className="font-bold text-slate-900">{detailRow.title}</h3>
            <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-700">{detailRow.body}</pre>
            <button type="button" className="mt-4 rounded-lg border px-3 py-2 text-sm" onClick={() => setDetailRow(null)}>
              Funga
            </button>
          </div>
        </ModalScrollLayer>
      ) : null}
    </div>
  );
}
